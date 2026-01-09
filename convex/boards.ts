import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const ownedBoards = await ctx.db
      .query("boards")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const allBoards = await ctx.db.query("boards").collect();
    const memberBoards = allBoards.filter(
      (b) => b.memberIds.includes(userId) && b.ownerId !== userId
    );

    // Sort by order (if set), then by createdAt descending
    return [...ownedBoards, ...memberBoards].sort((a, b) => {
      // If both have order, sort by order
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // Items with order come first
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      // Otherwise sort by createdAt descending
      return b.createdAt - a.createdAt;
    });
  },
});

export const get = query({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const board = await ctx.db.get(args.id);
    if (!board) return null;

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      return null;
    }

    return board;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const boardId = await ctx.db.insert("boards", {
      name: args.name,
      description: args.description,
      icon: args.icon,
      ownerId: userId,
      memberIds: [],
      createdAt: Date.now(),
    });

    // Create default columns
    const defaultColumns = ["To Do", "In Progress", "Done"];
    for (let i = 0; i < defaultColumns.length; i++) {
      await ctx.db.insert("columns", {
        boardId,
        name: defaultColumns[i],
        order: i,
      });
    }

    // Create default labels
    const defaultLabels = [
      { name: "Bug", color: "#ef4444" },
      { name: "Feature", color: "#22c55e" },
      { name: "Enhancement", color: "#3b82f6" },
      { name: "Documentation", color: "#a855f7" },
    ];
    for (const label of defaultLabels) {
      await ctx.db.insert("labels", {
        boardId,
        name: label.name,
        color: label.color,
      });
    }

    return boardId;
  },
});

export const update = mutation({
  args: {
    id: v.id("boards"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.id);
    if (!board) throw new Error("Board not found");
    if (board.ownerId !== userId) throw new Error("Not authorized");

    const updates: Partial<{ name: string; description: string; icon: string }> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.icon !== undefined) updates.icon = args.icon;

    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.id);
    if (!board) throw new Error("Board not found");
    if (board.ownerId !== userId) throw new Error("Not authorized");

    // Delete all cards
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_board", (q) => q.eq("boardId", args.id))
      .collect();
    for (const card of cards) {
      await ctx.db.delete(card._id);
    }

    // Delete all columns
    const columns = await ctx.db
      .query("columns")
      .withIndex("by_board", (q) => q.eq("boardId", args.id))
      .collect();
    for (const column of columns) {
      await ctx.db.delete(column._id);
    }

    // Delete all labels
    const labels = await ctx.db
      .query("labels")
      .withIndex("by_board", (q) => q.eq("boardId", args.id))
      .collect();
    for (const label of labels) {
      await ctx.db.delete(label._id);
    }

    // Delete the board
    await ctx.db.delete(args.id);
  },
});

export const addMember = mutation({
  args: {
    boardId: v.id("boards"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board) throw new Error("Board not found");
    if (board.ownerId !== userId) throw new Error("Not authorized");

    // Find user by email
    const users = await ctx.db.query("users").collect();
    const userToAdd = users.find((u) => u.email === args.email);
    if (!userToAdd) throw new Error("User not found");
    if (board.memberIds.includes(userToAdd._id)) {
      throw new Error("User is already a member");
    }

    await ctx.db.patch(args.boardId, {
      memberIds: [...board.memberIds, userToAdd._id],
    });
  },
});

export const removeMember = mutation({
  args: {
    boardId: v.id("boards"),
    memberId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board) throw new Error("Board not found");
    if (board.ownerId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(args.boardId, {
      memberIds: board.memberIds.filter((id) => id !== args.memberId),
    });
  },
});

export const getMembers = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const board = await ctx.db.get(args.boardId);
    if (!board) return [];

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      return [];
    }

    const allMemberIds = [board.ownerId, ...board.memberIds];
    const members = await Promise.all(
      allMemberIds.map(async (id) => {
        const user = await ctx.db.get(id);
        if (!user) return null;

        // Resolve storage URL for profile image
        if (user.image?.startsWith("storage:")) {
          const storageId = user.image.replace("storage:", "") as any;
          const url = await ctx.storage.getUrl(storageId);
          return { ...user, image: url };
        }
        return user;
      })
    );
    return members.filter((m) => m !== null);
  },
});

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const publicBoards = await ctx.db
      .query("boards")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .collect();

    // Filter out boards user already owns or is a member of
    const filteredBoards = publicBoards.filter(
      (b) => b.ownerId !== userId && !b.memberIds.includes(userId)
    );

    // Get owner info for each board
    const boardsWithOwners = await Promise.all(
      filteredBoards.map(async (board) => {
        const owner = await ctx.db.get(board.ownerId);
        if (!owner) return null;

        // Resolve owner profile image
        let ownerImage: string | undefined = owner.image;
        if (ownerImage?.startsWith("storage:")) {
          const storageId = ownerImage.replace("storage:", "") as any;
          ownerImage = (await ctx.storage.getUrl(storageId)) ?? undefined;
        }

        return {
          ...board,
          owner: { ...owner, image: ownerImage },
          memberCount: board.memberIds.length + 1,
        };
      })
    );

    return boardsWithOwners.filter((b) => b !== null).sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const updateVisibility = mutation({
  args: {
    id: v.id("boards"),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.id);
    if (!board) throw new Error("Board not found");
    if (board.ownerId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(args.id, { isPublic: args.isPublic });
  },
});

export const reorder = mutation({
  args: {
    boardIds: v.array(v.id("boards")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Update order for each board
    for (let i = 0; i < args.boardIds.length; i++) {
      const board = await ctx.db.get(args.boardIds[i]);
      if (!board) continue;

      // Only allow reordering of boards user owns or is a member of
      if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
        continue;
      }

      await ctx.db.patch(args.boardIds[i], { order: i });
    }
  },
});

export const addCustomColumnType = mutation({
  args: {
    boardId: v.id("boards"),
    name: v.string(),
    icon: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board) throw new Error("Board not found");
    if (board.ownerId !== userId) throw new Error("Not authorized");

    const customTypes = board.customColumnTypes ?? [];
    const newType = {
      id: `custom_${Date.now()}`,
      name: args.name,
      icon: args.icon,
      color: args.color,
    };

    await ctx.db.patch(args.boardId, {
      customColumnTypes: [...customTypes, newType],
    });

    return newType.id;
  },
});

export const updateCustomColumnType = mutation({
  args: {
    boardId: v.id("boards"),
    typeId: v.string(),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board) throw new Error("Board not found");
    if (board.ownerId !== userId) throw new Error("Not authorized");

    const customTypes = board.customColumnTypes ?? [];
    const updatedTypes = customTypes.map((t) => {
      if (t.id !== args.typeId) return t;
      return {
        ...t,
        name: args.name ?? t.name,
        icon: args.icon ?? t.icon,
        color: args.color ?? t.color,
      };
    });

    await ctx.db.patch(args.boardId, {
      customColumnTypes: updatedTypes,
    });
  },
});

export const removeCustomColumnType = mutation({
  args: {
    boardId: v.id("boards"),
    typeId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board) throw new Error("Board not found");
    if (board.ownerId !== userId) throw new Error("Not authorized");

    const customTypes = board.customColumnTypes ?? [];
    const filteredTypes = customTypes.filter((t) => t.id !== args.typeId);

    await ctx.db.patch(args.boardId, {
      customColumnTypes: filteredTypes,
    });

    // Clear the type from any columns using it
    const columns = await ctx.db
      .query("columns")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    for (const column of columns) {
      if (column.type === args.typeId) {
        await ctx.db.patch(column._id, { type: undefined });
      }
    }
  },
});
