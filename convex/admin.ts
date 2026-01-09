import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper to check if user is admin
async function requireAdmin(ctx: { db: any; auth: any }) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const user = await ctx.db.get(userId);
  if (!user?.isAdmin) throw new Error("Not authorized - admin access required");

  return userId;
}

// Get current user's admin status
export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const user = await ctx.db.get(userId);
    return user?.isAdmin === true;
  },
});

// Get platform-wide statistics
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    const boards = await ctx.db.query("boards").collect();
    const cards = await ctx.db.query("cards").collect();
    const columns = await ctx.db.query("columns").collect();
    const messages = await ctx.db.query("messages").collect();
    const comments = await ctx.db.query("comments").collect();
    const activities = await ctx.db.query("activities").collect();

    // Calculate active users (users who have boards or are members)
    const userIdsWithBoards = new Set<string>();
    for (const board of boards) {
      userIdsWithBoards.add(board.ownerId);
      for (const memberId of board.memberIds) {
        userIdsWithBoards.add(memberId);
      }
    }

    // Cards per board stats
    const cardsPerBoard: Record<string, number> = {};
    for (const card of cards) {
      cardsPerBoard[card.boardId] = (cardsPerBoard[card.boardId] || 0) + 1;
    }
    const avgCardsPerBoard = boards.length > 0 ? Math.round(cards.length / boards.length) : 0;

    // Public vs private boards
    const publicBoards = boards.filter((b) => b.isPublic).length;

    // Recent activity (last 7 days)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentActivities = activities.filter((a) => a.createdAt > weekAgo).length;
    const recentMessages = messages.filter((m) => m.createdAt > weekAgo).length;
    const recentCards = cards.filter((c) => c.createdAt > weekAgo).length;

    // Top boards by cards
    const topBoards = boards
      .map((board) => ({
        id: board._id,
        name: board.name,
        icon: board.icon,
        cardCount: cardsPerBoard[board._id] || 0,
        memberCount: board.memberIds.length + 1,
        isPublic: board.isPublic || false,
      }))
      .sort((a, b) => b.cardCount - a.cardCount)
      .slice(0, 10);

    // User growth (users created per week for last 8 weeks)
    const userGrowth = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000;
      const weekEnd = Date.now() - i * 7 * 24 * 60 * 60 * 1000;
      const count = users.filter((u) => {
        const created = u._creationTime;
        return created >= weekStart && created < weekEnd;
      }).length;
      userGrowth.push({
        week: `W-${i}`,
        users: count,
      });
    }

    return {
      totals: {
        users: users.length,
        activeUsers: userIdsWithBoards.size,
        boards: boards.length,
        publicBoards,
        privateBoards: boards.length - publicBoards,
        cards: cards.length,
        columns: columns.length,
        messages: messages.length,
        comments: comments.length,
        activities: activities.length,
      },
      averages: {
        cardsPerBoard: avgCardsPerBoard,
        membersPerBoard:
          boards.length > 0
            ? Math.round(
                (boards.reduce((sum, b) => sum + b.memberIds.length + 1, 0) / boards.length) * 10
              ) / 10
            : 0,
      },
      recent: {
        activities: recentActivities,
        messages: recentMessages,
        cards: recentCards,
      },
      topBoards,
      userGrowth,
    };
  },
});

// Get all users list
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    const boards = await ctx.db.query("boards").collect();
    const cards = await ctx.db.query("cards").collect();

    // Calculate stats per user
    const userStats = users.map((user) => {
      const ownedBoards = boards.filter((b) => b.ownerId === user._id).length;
      const memberBoards = boards.filter((b) => b.memberIds.includes(user._id)).length;
      const createdCards = cards.filter((c) => c.createdBy === user._id).length;
      const assignedCards = cards.filter((c) => c.assigneeIds.includes(user._id)).length;

      return {
        id: user._id,
        name: user.name || "Unknown",
        email: user.email || "",
        image: user.image,
        isAdmin: user.isAdmin || false,
        createdAt: user._creationTime,
        stats: {
          ownedBoards,
          memberBoards,
          totalBoards: ownedBoards + memberBoards,
          createdCards,
          assignedCards,
        },
      };
    });

    return userStats.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Toggle admin status for a user
export const setUserAdmin = mutation({
  args: {
    userId: v.id("users"),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.db.patch(args.userId, {
      isAdmin: args.isAdmin,
    });

    return { success: true };
  },
});

// Get all boards (admin view)
export const listAllBoards = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const boards = await ctx.db.query("boards").collect();
    const users = await ctx.db.query("users").collect();
    const cards = await ctx.db.query("cards").collect();

    const userMap = new Map(users.map((u) => [u._id, u]));

    return boards
      .map((board) => {
        const owner = userMap.get(board.ownerId);
        const cardCount = cards.filter((c) => c.boardId === board._id).length;

        return {
          id: board._id,
          name: board.name,
          description: board.description,
          icon: board.icon,
          isPublic: board.isPublic || false,
          owner: {
            id: board.ownerId,
            name: owner?.name || "Unknown",
            email: owner?.email || "",
          },
          memberCount: board.memberIds.length + 1,
          cardCount,
          createdAt: board.createdAt,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Delete a board (admin action)
export const deleteBoard = mutation({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Delete all related data
    const columns = await ctx.db
      .query("columns")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    // Delete cards
    for (const card of cards) {
      // Delete comments
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_card", (q) => q.eq("cardId", card._id))
        .collect();
      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }
      await ctx.db.delete(card._id);
    }

    // Delete columns
    for (const column of columns) {
      await ctx.db.delete(column._id);
    }

    // Delete messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete activities
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    // Delete the board
    await ctx.db.delete(args.boardId);

    return { success: true };
  },
});
