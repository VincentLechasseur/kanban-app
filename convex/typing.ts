import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

const TYPING_TIMEOUT = 3000; // 3 seconds

export const setTyping = mutation({
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

    // Find existing typing status
    const existing = await ctx.db
      .query("typingStatus")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    const expiresAt = Date.now() + TYPING_TIMEOUT;

    if (existing) {
      await ctx.db.patch(existing._id, { expiresAt });
    } else {
      await ctx.db.insert("typingStatus", {
        boardId: args.boardId,
        userId,
        expiresAt,
      });
    }
  },
});

export const clearTyping = mutation({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const existing = await ctx.db
      .query("typingStatus")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const getTyping = query({
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

    const now = Date.now();
    const typingStatuses = await ctx.db
      .query("typingStatus")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    // Filter out self and expired entries
    const activeTyping = typingStatuses.filter((t) => t.userId !== userId && t.expiresAt > now);

    // Get user details
    const usersWithDetails = await Promise.all(
      activeTyping.map(async (t) => {
        const user = await ctx.db.get(t.userId);
        if (!user) return null;
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
        };
      })
    );

    return usersWithDetails.filter((u) => u !== null);
  },
});
