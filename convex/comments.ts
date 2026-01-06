import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const list = query({
  args: {
    cardId: v.id("cards"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify user has access to this card's board
    const card = await ctx.db.get(args.cardId);
    if (!card) return [];

    const board = await ctx.db.get(card.boardId);
    if (!board) return [];

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      return [];
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_card", (q) => q.eq("cardId", args.cardId))
      .order("asc")
      .collect();

    // Get user info for each comment
    const commentsWithUsers = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        if (!user) return null;

        // Resolve profile image URL
        let image: string | undefined = user.image;
        if (image?.startsWith("storage:")) {
          const storageId = image.replace("storage:", "") as any;
          image = (await ctx.storage.getUrl(storageId)) ?? undefined;
        }

        return {
          ...comment,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            image,
          },
        };
      })
    );

    return commentsWithUsers.filter((c) => c !== null);
  },
});

export const add = mutation({
  args: {
    cardId: v.id("cards"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify user has access to this card's board
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const board = await ctx.db.get(card.boardId);
    if (!board) throw new Error("Board not found");

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    const content = args.content.trim();
    if (!content) throw new Error("Comment cannot be empty");

    return await ctx.db.insert("comments", {
      cardId: args.cardId,
      userId,
      content,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("comments"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Comment not found");

    // Only the author can edit their comment
    if (comment.userId !== userId) {
      throw new Error("Not authorized");
    }

    const content = args.content.trim();
    if (!content) throw new Error("Comment cannot be empty");

    await ctx.db.patch(args.id, { content });
  },
});

export const remove = mutation({
  args: {
    id: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Comment not found");

    // Get the card to check board ownership
    const card = await ctx.db.get(comment.cardId);
    if (!card) throw new Error("Card not found");

    const board = await ctx.db.get(card.boardId);
    if (!board) throw new Error("Board not found");

    // Allow deletion if user is comment author or board owner
    if (comment.userId !== userId && board.ownerId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.id);
  },
});

export const getCount = query({
  args: {
    cardId: v.id("cards"),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_card", (q) => q.eq("cardId", args.cardId))
      .collect();

    return comments.length;
  },
});
