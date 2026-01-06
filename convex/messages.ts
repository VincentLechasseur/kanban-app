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
