import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    // Get additional info for each notification
    const notificationsWithDetails = await Promise.all(
      notifications.map(async (notification) => {
        const fromUser = await ctx.db.get(notification.fromUserId);
        const card = await ctx.db.get(notification.cardId);
        const board = await ctx.db.get(notification.boardId);

        if (!fromUser || !card || !board) return null;

        // Resolve profile image URL
        let fromUserImage: string | undefined = fromUser.image;
        if (fromUserImage?.startsWith("storage:")) {
          const storageId = fromUserImage.replace("storage:", "") as any;
          fromUserImage = (await ctx.storage.getUrl(storageId)) ?? undefined;
        }

        return {
          ...notification,
          fromUser: {
            _id: fromUser._id,
            name: fromUser.name,
            email: fromUser.email,
            image: fromUserImage,
          },
          card: {
            _id: card._id,
            title: card.title,
          },
          board: {
            _id: board._id,
            name: board.name,
          },
        };
      })
    );

    return notificationsWithDetails.filter((n) => n !== null);
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("read", false))
      .collect();

    return unread.length;
  },
});

export const markAsRead = mutation({
  args: {
    id: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const notification = await ctx.db.get(args.id);
    if (!notification || notification.userId !== userId) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.id, { read: true });
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("read", false))
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { read: true });
    }
  },
});

// Helper to create notification when someone is mentioned
export const createMentionNotification = mutation({
  args: {
    mentionedUserId: v.id("users"),
    cardId: v.id("cards"),
    boardId: v.id("boards"),
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Don't notify yourself
    if (args.mentionedUserId === userId) return;

    // Check if user is a member of the board
    const board = await ctx.db.get(args.boardId);
    if (!board) return;

    if (board.ownerId !== args.mentionedUserId && !board.memberIds.includes(args.mentionedUserId)) {
      return;
    }

    await ctx.db.insert("notifications", {
      userId: args.mentionedUserId,
      type: "mention",
      fromUserId: userId,
      cardId: args.cardId,
      boardId: args.boardId,
      commentId: args.commentId,
      read: false,
      createdAt: Date.now(),
    });
  },
});
