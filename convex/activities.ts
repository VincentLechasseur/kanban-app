import { internalMutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

// Activity types for type safety
export const activityTypes = v.union(
  v.literal("card_created"),
  v.literal("card_moved"),
  v.literal("card_updated"),
  v.literal("card_deleted"),
  v.literal("card_assigned"),
  v.literal("card_unassigned"),
  v.literal("label_added"),
  v.literal("label_removed"),
  v.literal("column_created"),
  v.literal("column_deleted"),
  v.literal("member_added"),
  v.literal("member_removed"),
  v.literal("comment_added"),
  v.literal("board_updated")
);

// Internal mutation to log activity (called from other mutations)
export const log = internalMutation({
  args: {
    boardId: v.id("boards"),
    userId: v.id("users"),
    type: activityTypes,
    cardId: v.optional(v.id("cards")),
    columnId: v.optional(v.id("columns")),
    targetUserId: v.optional(v.id("users")),
    labelId: v.optional(v.id("labels")),
    metadata: v.optional(
      v.object({
        cardTitle: v.optional(v.string()),
        fromColumnName: v.optional(v.string()),
        toColumnName: v.optional(v.string()),
        columnName: v.optional(v.string()),
        labelName: v.optional(v.string()),
        targetUserName: v.optional(v.string()),
        fieldChanged: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activities", {
      boardId: args.boardId,
      userId: args.userId,
      type: args.type,
      cardId: args.cardId,
      columnId: args.columnId,
      targetUserId: args.targetUserId,
      labelId: args.labelId,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

export const listByBoard = query({
  args: {
    boardId: v.id("boards"),
    limit: v.optional(v.number()),
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

    const limit = args.limit ?? 50;

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .order("desc")
      .take(limit);

    // Enrich with user info
    const enriched = await Promise.all(
      activities.map(async (activity) => {
        const user = await ctx.db.get(activity.userId);

        let targetUser = null;
        if (activity.targetUserId) {
          targetUser = await ctx.db.get(activity.targetUserId);
        }

        // Resolve user image
        let userImage: string | undefined = user?.image;
        if (userImage?.startsWith("storage:")) {
          const storageId = userImage.replace("storage:", "") as any;
          userImage = (await ctx.storage.getUrl(storageId)) ?? undefined;
        }

        return {
          ...activity,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
                image: userImage,
              }
            : null,
          targetUser: targetUser
            ? {
                _id: targetUser._id,
                name: targetUser.name,
                email: targetUser.email,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

export const listByCard = query({
  args: {
    cardId: v.id("cards"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get card and verify access
    const card = await ctx.db.get(args.cardId);
    if (!card) return [];

    const board = await ctx.db.get(card.boardId);
    if (!board) return [];

    // Check if user is a member
    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      return [];
    }

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_card", (q) => q.eq("cardId", args.cardId))
      .order("desc")
      .take(30);

    // Enrich with user info
    const enriched = await Promise.all(
      activities.map(async (activity) => {
        const user = await ctx.db.get(activity.userId);
        return {
          ...activity,
          user: user ? { _id: user._id, name: user.name, email: user.email } : null,
        };
      })
    );

    return enriched;
  },
});
