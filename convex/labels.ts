import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const list = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const board = await ctx.db.get(args.boardId);
    if (!board) return [];

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      return [];
    }

    return await ctx.db
      .query("labels")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
  },
});

export const create = mutation({
  args: {
    boardId: v.id("boards"),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board) throw new Error("Board not found");

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    return await ctx.db.insert("labels", {
      boardId: args.boardId,
      name: args.name,
      color: args.color,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("labels"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const label = await ctx.db.get(args.id);
    if (!label) throw new Error("Label not found");

    const board = await ctx.db.get(label.boardId);
    if (!board) throw new Error("Board not found");

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    const updates: Partial<{ name: string; color: string }> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("labels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const label = await ctx.db.get(args.id);
    if (!label) throw new Error("Label not found");

    const board = await ctx.db.get(label.boardId);
    if (!board) throw new Error("Board not found");

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    // Remove label from all cards that have it
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_board", (q) => q.eq("boardId", label.boardId))
      .collect();

    for (const card of cards) {
      if (card.labelIds.includes(args.id)) {
        await ctx.db.patch(card._id, {
          labelIds: card.labelIds.filter((id) => id !== args.id),
        });
      }
    }

    await ctx.db.delete(args.id);
  },
});
