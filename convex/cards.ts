import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const listByBoard = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const board = await ctx.db.get(args.boardId);
    if (!board) return [];

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      return [];
    }

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    return cards.sort((a, b) => a.order - b.order);
  },
});

export const get = query({
  args: { id: v.id("cards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const card = await ctx.db.get(args.id);
    if (!card) return null;

    const board = await ctx.db.get(card.boardId);
    if (!board) return null;

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      return null;
    }

    return card;
  },
});

export const create = mutation({
  args: {
    columnId: v.id("columns"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const column = await ctx.db.get(args.columnId);
    if (!column) throw new Error("Column not found");

    const board = await ctx.db.get(column.boardId);
    if (!board) throw new Error("Board not found");

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_column", (q) => q.eq("columnId", args.columnId))
      .collect();

    const maxOrder = cards.reduce((max, card) => Math.max(max, card.order), -1);

    const cardId = await ctx.db.insert("cards", {
      columnId: args.columnId,
      boardId: column.boardId,
      title: args.title,
      description: args.description,
      order: maxOrder + 1,
      assigneeIds: [],
      labelIds: [],
      createdAt: Date.now(),
      createdBy: userId,
    });

    // Log activity
    await ctx.runMutation(internal.activities.log, {
      boardId: column.boardId,
      userId,
      type: "card_created",
      cardId,
      columnId: args.columnId,
      metadata: {
        cardTitle: args.title,
        columnName: column.name,
      },
    });

    return cardId;
  },
});

export const update = mutation({
  args: {
    id: v.id("cards"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.union(v.number(), v.null())),
    color: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.id);
    if (!card) throw new Error("Card not found");

    const board = await ctx.db.get(card.boardId);
    if (!board) throw new Error("Board not found");

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    const updates: Partial<{
      title: string;
      description: string;
      dueDate: number | undefined;
      color: string | undefined;
    }> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.dueDate !== undefined) {
      updates.dueDate = args.dueDate === null ? undefined : args.dueDate;
    }
    if (args.color !== undefined) {
      updates.color = args.color === null ? undefined : args.color;
    }

    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("cards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.id);
    if (!card) throw new Error("Card not found");

    const board = await ctx.db.get(card.boardId);
    if (!board) throw new Error("Board not found");

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    // Log activity before deleting
    await ctx.runMutation(internal.activities.log, {
      boardId: card.boardId,
      userId,
      type: "card_deleted",
      metadata: {
        cardTitle: card.title,
      },
    });

    await ctx.db.delete(args.id);
  },
});

export const move = mutation({
  args: {
    cardId: v.id("cards"),
    targetColumnId: v.id("columns"),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const board = await ctx.db.get(card.boardId);
    if (!board) throw new Error("Board not found");

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    const sourceColumnId = card.columnId;
    const targetColumnId = args.targetColumnId;

    // Get column names for activity logging
    const sourceColumn = await ctx.db.get(sourceColumnId);
    const targetColumn = await ctx.db.get(targetColumnId);

    // Get all cards in the target column
    const targetCards = await ctx.db
      .query("cards")
      .withIndex("by_column", (q) => q.eq("columnId", targetColumnId))
      .collect();

    // Filter out the moving card if it's in the same column
    const otherCards = targetCards
      .filter((c) => c._id !== args.cardId)
      .sort((a, b) => a.order - b.order);

    // Insert at the new position
    otherCards.splice(args.newOrder, 0, card);

    // Update orders for all cards in target column
    for (let i = 0; i < otherCards.length; i++) {
      if (otherCards[i]._id === args.cardId) {
        await ctx.db.patch(args.cardId, {
          columnId: targetColumnId,
          order: i,
        });
      } else if (otherCards[i].order !== i) {
        await ctx.db.patch(otherCards[i]._id, { order: i });
      }
    }

    // If moving between columns, reorder the source column and log activity
    if (sourceColumnId !== targetColumnId) {
      const sourceCards = await ctx.db
        .query("cards")
        .withIndex("by_column", (q) => q.eq("columnId", sourceColumnId))
        .collect();

      const remainingCards = sourceCards
        .filter((c) => c._id !== args.cardId)
        .sort((a, b) => a.order - b.order);

      for (let i = 0; i < remainingCards.length; i++) {
        if (remainingCards[i].order !== i) {
          await ctx.db.patch(remainingCards[i]._id, { order: i });
        }
      }

      // Log activity for column change
      await ctx.runMutation(internal.activities.log, {
        boardId: card.boardId,
        userId,
        type: "card_moved",
        cardId: args.cardId,
        columnId: targetColumnId,
        metadata: {
          cardTitle: card.title,
          fromColumnName: sourceColumn?.name,
          toColumnName: targetColumn?.name,
        },
      });
    }
  },
});

export const setAssignees = mutation({
  args: {
    cardId: v.id("cards"),
    assigneeIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const board = await ctx.db.get(card.boardId);
    if (!board) throw new Error("Board not found");

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    // Track changes for activity logging
    const oldAssignees = new Set(card.assigneeIds);
    const newAssignees = new Set(args.assigneeIds);

    const added = args.assigneeIds.filter((id) => !oldAssignees.has(id));
    const removed = card.assigneeIds.filter((id) => !newAssignees.has(id));

    await ctx.db.patch(args.cardId, { assigneeIds: args.assigneeIds });

    // Log activities for each assignment change
    for (const targetUserId of added) {
      const targetUser = await ctx.db.get(targetUserId);
      await ctx.runMutation(internal.activities.log, {
        boardId: card.boardId,
        userId,
        type: "card_assigned",
        cardId: args.cardId,
        targetUserId,
        metadata: {
          cardTitle: card.title,
          targetUserName: targetUser?.name ?? targetUser?.email,
        },
      });
    }

    for (const targetUserId of removed) {
      const targetUser = await ctx.db.get(targetUserId);
      await ctx.runMutation(internal.activities.log, {
        boardId: card.boardId,
        userId,
        type: "card_unassigned",
        cardId: args.cardId,
        targetUserId,
        metadata: {
          cardTitle: card.title,
          targetUserName: targetUser?.name ?? targetUser?.email,
        },
      });
    }
  },
});

export const setLabels = mutation({
  args: {
    cardId: v.id("cards"),
    labelIds: v.array(v.id("labels")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const board = await ctx.db.get(card.boardId);
    if (!board) throw new Error("Board not found");

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    // Track changes for activity logging
    const oldLabels = new Set(card.labelIds);
    const newLabels = new Set(args.labelIds);

    const added = args.labelIds.filter((id) => !oldLabels.has(id));
    const removed = card.labelIds.filter((id) => !newLabels.has(id));

    await ctx.db.patch(args.cardId, { labelIds: args.labelIds });

    // Log activities for each label change
    for (const labelId of added) {
      const label = await ctx.db.get(labelId);
      await ctx.runMutation(internal.activities.log, {
        boardId: card.boardId,
        userId,
        type: "label_added",
        cardId: args.cardId,
        labelId,
        metadata: {
          cardTitle: card.title,
          labelName: label?.name,
        },
      });
    }

    for (const labelId of removed) {
      const label = await ctx.db.get(labelId);
      await ctx.runMutation(internal.activities.log, {
        boardId: card.boardId,
        userId,
        type: "label_removed",
        cardId: args.cardId,
        labelId,
        metadata: {
          cardTitle: card.title,
          labelName: label?.name,
        },
      });
    }
  },
});
