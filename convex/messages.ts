import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const send = mutation({
  args: {
    boardId: v.id("boards"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board) throw new Error("Board not found");

    // Check if user is a member
    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    const content = args.content.trim();
    if (!content) throw new Error("Message cannot be empty");

    return await ctx.db.insert("messages", {
      boardId: args.boardId,
      userId,
      content,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const board = await ctx.db.get(args.boardId);
    if (!board) return [];

    // Check if user is a member
    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      return [];
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .order("asc")
      .collect();

    // Get user info for each message
    const messagesWithUsers = await Promise.all(
      messages.map(async (message) => {
        const user = await ctx.db.get(message.userId);
        if (!user) return null;

        // Resolve profile image URL
        let image: string | undefined = user.image;
        if (image?.startsWith("storage:")) {
          const storageId = image.replace("storage:", "") as any;
          image = (await ctx.storage.getUrl(storageId)) ?? undefined;
        }

        return {
          ...message,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            image,
          },
        };
      })
    );

    return messagesWithUsers.filter((m) => m !== null);
  },
});

export const update = mutation({
  args: {
    id: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.id);
    if (!message) throw new Error("Message not found");

    // Only the author can edit
    if (message.userId !== userId) {
      throw new Error("Not authorized to edit this message");
    }

    // Can't edit deleted messages
    if (message.isDeleted) {
      throw new Error("Cannot edit a deleted message");
    }

    const content = args.content.trim();
    if (!content) throw new Error("Message cannot be empty");

    await ctx.db.patch(args.id, {
      content,
      editedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.id);
    if (!message) throw new Error("Message not found");

    const board = await ctx.db.get(message.boardId);
    if (!board) throw new Error("Board not found");

    // Allow deletion if user is message author or board owner
    if (message.userId !== userId && board.ownerId !== userId) {
      throw new Error("Not authorized to delete this message");
    }

    // Soft delete - keep the record to show "message deleted" placeholder
    await ctx.db.patch(args.id, { isDeleted: true });
  },
});

export const search = query({
  args: {
    boardId: v.id("boards"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const board = await ctx.db.get(args.boardId);
    if (!board) return [];

    // Check if user is a member
    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      return [];
    }

    const searchQuery = args.query.trim();
    if (!searchQuery) return [];

    const results = await ctx.db
      .query("messages")
      .withSearchIndex("search_content", (q) =>
        q.search("content", searchQuery).eq("boardId", args.boardId)
      )
      .take(50);

    // Filter out deleted messages and get user info
    const messagesWithUsers = await Promise.all(
      results
        .filter((m) => !m.isDeleted)
        .map(async (message) => {
          const user = await ctx.db.get(message.userId);
          if (!user) return null;

          let image: string | undefined = user.image;
          if (image?.startsWith("storage:")) {
            const storageId = image.replace("storage:", "") as any;
            image = (await ctx.storage.getUrl(storageId)) ?? undefined;
          }

          return {
            ...message,
            user: { _id: user._id, name: user.name, email: user.email, image },
          };
        })
    );

    return messagesWithUsers.filter((m) => m !== null);
  },
});

export const markAsRead = mutation({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board) throw new Error("Board not found");

    // Check if user is a member
    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    // Find existing read status
    const existing = await ctx.db
      .query("chatReadStatus")
      .withIndex("by_board_user", (q) => q.eq("boardId", args.boardId).eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { lastReadAt: Date.now() });
    } else {
      await ctx.db.insert("chatReadStatus", {
        boardId: args.boardId,
        userId,
        lastReadAt: Date.now(),
      });
    }
  },
});

export const hasUnread = query({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const board = await ctx.db.get(args.boardId);
    if (!board) return false;

    // Check if user is a member
    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      return false;
    }

    // Get user's last read time
    const readStatus = await ctx.db
      .query("chatReadStatus")
      .withIndex("by_board_user", (q) => q.eq("boardId", args.boardId).eq("userId", userId))
      .first();

    const lastReadAt = readStatus?.lastReadAt ?? 0;

    // Check if there are messages after lastReadAt (excluding own messages)
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .filter((q) =>
        q.and(q.gt(q.field("createdAt"), lastReadAt), q.neq(q.field("userId"), userId))
      )
      .first();

    return unreadMessages !== null;
  },
});

export const getUnreadBoards = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get all boards user is a member of
    const ownedBoards = await ctx.db
      .query("boards")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const allBoards = await ctx.db.query("boards").collect();
    const memberBoards = allBoards.filter(
      (b) => b.memberIds.includes(userId) && b.ownerId !== userId
    );

    const userBoards = [...ownedBoards, ...memberBoards];

    // Check unread status for each board
    const unreadBoardIds: string[] = [];

    for (const board of userBoards) {
      const readStatus = await ctx.db
        .query("chatReadStatus")
        .withIndex("by_board_user", (q) => q.eq("boardId", board._id).eq("userId", userId))
        .first();

      const lastReadAt = readStatus?.lastReadAt ?? 0;

      const unreadMessage = await ctx.db
        .query("messages")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .filter((q) =>
          q.and(q.gt(q.field("createdAt"), lastReadAt), q.neq(q.field("userId"), userId))
        )
        .first();

      if (unreadMessage) {
        unreadBoardIds.push(board._id);
      }
    }

    return unreadBoardIds;
  },
});
