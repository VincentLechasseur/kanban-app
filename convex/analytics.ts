import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const getBoardStats = query({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const board = await ctx.db.get(args.boardId);
    if (!board) return null;

    // Check if user is a member
    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      return null;
    }

    // Get columns
    const columns = await ctx.db
      .query("columns")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    // Get cards
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    // Cards per column (with type info)
    const cardsPerColumn = columns
      .sort((a, b) => a.order - b.order)
      .map((col) => ({
        name: col.name,
        count: cards.filter((c) => c.columnId === col._id).length,
        columnId: col._id,
        type: col.type,
      }));

    // Built-in column types
    const builtInTypes = ["backlog", "todo", "in_progress", "review", "blocked", "done", "wont_do"];

    // Cards by column type
    const cardsByType = {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      review: 0,
      blocked: 0,
      done: 0,
      wont_do: 0,
      unset: 0,
    };

    cards.forEach((card) => {
      const column = columns.find((c) => c._id === card.columnId);
      if (column?.type && builtInTypes.includes(column.type)) {
        cardsByType[column.type as keyof typeof cardsByType]++;
      } else {
        cardsByType.unset++;
      }
    });

    // Cards by assignee
    const assigneeCounts: Record<string, number> = {};
    cards.forEach((card) => {
      card.assigneeIds.forEach((id) => {
        assigneeCounts[id] = (assigneeCounts[id] ?? 0) + 1;
      });
    });

    // Unassigned cards
    const unassignedCount = cards.filter((c) => c.assigneeIds.length === 0).length;

    // Get user names for assignees
    const assigneeStats = await Promise.all(
      Object.entries(assigneeCounts).map(async ([id, count]) => {
        const user = await ctx.db.get(id as Id<"users">);
        return {
          name: user?.name ?? user?.email ?? "Unknown",
          count,
          userId: id,
        };
      })
    );

    if (unassignedCount > 0) {
      assigneeStats.push({
        name: "Unassigned",
        count: unassignedCount,
        userId: "unassigned",
      });
    }

    // Cards created over time (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const cardsByDate: Record<string, number> = {};

    cards.forEach((card) => {
      if (card.createdAt >= thirtyDaysAgo) {
        const date = new Date(card.createdAt).toISOString().split("T")[0];
        cardsByDate[date] = (cardsByDate[date] ?? 0) + 1;
      }
    });

    // Convert to array sorted by date
    const cardsOverTime = Object.entries(cardsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Cards by label
    const labels = await ctx.db
      .query("labels")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const labelCounts: Record<string, { name: string; color: string; count: number }> = {};
    labels.forEach((label) => {
      labelCounts[label._id] = { name: label.name, color: label.color, count: 0 };
    });

    cards.forEach((card) => {
      card.labelIds.forEach((labelId) => {
        if (labelCounts[labelId]) {
          labelCounts[labelId].count++;
        }
      });
    });

    const labelStats = Object.values(labelCounts).filter((l) => l.count > 0);

    // Due date stats
    const now = Date.now();
    const overdue = cards.filter((c) => c.dueDate && c.dueDate < now).length;
    const dueThisWeek = cards.filter((c) => {
      if (!c.dueDate) return false;
      const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
      return c.dueDate >= now && c.dueDate <= weekFromNow;
    }).length;
    const noDueDate = cards.filter((c) => !c.dueDate).length;

    // Story points stats
    const totalStoryPoints = cards.reduce((sum, c) => sum + (c.storyPoints ?? 0), 0);
    const cardsWithPoints = cards.filter((c) => c.storyPoints).length;

    // Time tracking stats
    const totalTimeEstimate = cards.reduce((sum, c) => sum + (c.timeEstimate ?? 0), 0);
    const totalTimeSpent = cards.reduce((sum, c) => sum + (c.timeSpent ?? 0), 0);
    const cardsWithTime = cards.filter((c) => c.timeEstimate || c.timeSpent).length;

    // Story points by column type
    const storyPointsByType = {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      review: 0,
      blocked: 0,
      done: 0,
      wont_do: 0,
      unset: 0,
    };

    cards.forEach((card) => {
      const column = columns.find((c) => c._id === card.columnId);
      const points = card.storyPoints ?? 0;
      if (column?.type && builtInTypes.includes(column.type)) {
        storyPointsByType[column.type as keyof typeof storyPointsByType] += points;
      } else {
        storyPointsByType.unset += points;
      }
    });

    return {
      totalCards: cards.length,
      totalColumns: columns.length,
      cardsPerColumn,
      cardsByType,
      assigneeStats,
      cardsOverTime,
      labelStats,
      dueDateStats: {
        overdue,
        dueThisWeek,
        noDueDate,
      },
      storyPointsStats: {
        total: totalStoryPoints,
        cardsWithPoints,
        byType: storyPointsByType,
        completed: storyPointsByType.done,
      },
      timeStats: {
        totalEstimate: totalTimeEstimate,
        totalSpent: totalTimeSpent,
        cardsWithTime,
      },
    };
  },
});

export const getVelocity = query({
  args: {
    boardId: v.id("boards"),
    weeks: v.optional(v.number()),
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

    const numWeeks = args.weeks ?? 8;
    const now = Date.now();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;

    // Get card_moved activities to last column (typically "Done")
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "card_moved"),
          q.gte(q.field("createdAt"), now - numWeeks * msPerWeek)
        )
      )
      .collect();

    // Get columns to find "Done" columns (by type or name)
    const columns = await ctx.db
      .query("columns")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    // A column is considered "done" if:
    // 1. It has type === "done", OR
    // 2. It doesn't have a type but has name like "done"/"completed"
    const doneColumnNames = columns
      .filter(
        (c) =>
          c.type === "done" ||
          (!c.type && (c.name.toLowerCase() === "done" || c.name.toLowerCase() === "completed"))
      )
      .map((c) => c.name.toLowerCase());

    // Group completed cards by week
    const weeklyData: Record<string, number> = {};

    for (let i = 0; i < numWeeks; i++) {
      const weekStart = now - (i + 1) * msPerWeek;
      const weekEnd = now - i * msPerWeek;
      const weekLabel = new Date(weekEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      // Count activities that moved cards to a Done-type column
      const completed = activities.filter((a) => {
        if (a.createdAt < weekStart || a.createdAt >= weekEnd) return false;
        if (a.metadata?.toColumnName) {
          return doneColumnNames.includes(a.metadata.toColumnName.toLowerCase());
        }
        return false;
      }).length;

      weeklyData[weekLabel] = completed;
    }

    // Convert to array in chronological order
    return Object.entries(weeklyData)
      .reverse()
      .map(([week, completed]) => ({ week, completed }));
  },
});
