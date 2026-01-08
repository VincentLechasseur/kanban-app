import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

// Column type definitions
export const columnTypes = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "blocked",
  "done",
  "wont_do",
] as const;

export type ColumnType = (typeof columnTypes)[number];

// Auto-suggest column type based on name
function suggestColumnType(name: string): ColumnType | undefined {
  const lower = name.toLowerCase();
  if (lower.includes("backlog") || lower.includes("icebox")) return "backlog";
  if (lower.includes("to do") || lower.includes("todo") || lower.includes("to-do")) return "todo";
  if (lower.includes("in progress") || lower.includes("doing") || lower.includes("working"))
    return "in_progress";
  if (lower.includes("review") || lower.includes("testing") || lower.includes("qa"))
    return "review";
  if (lower.includes("blocked") || lower.includes("on hold")) return "blocked";
  if (lower.includes("done") || lower.includes("complete") || lower.includes("finished"))
    return "done";
  if (
    lower.includes("won't do") ||
    lower.includes("wont do") ||
    lower.includes("cancel") ||
    lower.includes("rejected")
  )
    return "wont_do";
  return undefined;
}

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

    const columns = await ctx.db
      .query("columns")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    return columns.sort((a, b) => a.order - b.order);
  },
});

export const create = mutation({
  args: {
    boardId: v.id("boards"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board) throw new Error("Board not found");

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    const columns = await ctx.db
      .query("columns")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const maxOrder = columns.reduce((max, col) => Math.max(max, col.order), -1);

    const columnId = await ctx.db.insert("columns", {
      boardId: args.boardId,
      name: args.name,
      order: maxOrder + 1,
      type: suggestColumnType(args.name),
    });

    // Log activity
    await ctx.runMutation(internal.activities.log, {
      boardId: args.boardId,
      userId,
      type: "column_created",
      columnId,
      metadata: {
        columnName: args.name,
      },
    });

    return columnId;
  },
});

export const update = mutation({
  args: {
    id: v.id("columns"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const column = await ctx.db.get(args.id);
    if (!column) throw new Error("Column not found");

    const board = await ctx.db.get(column.boardId);
    if (!board) throw new Error("Board not found");

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, { name: args.name });
  },
});

export const remove = mutation({
  args: { id: v.id("columns") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const column = await ctx.db.get(args.id);
    if (!column) throw new Error("Column not found");

    const board = await ctx.db.get(column.boardId);
    if (!board) throw new Error("Board not found");

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    // Log activity before deleting
    await ctx.runMutation(internal.activities.log, {
      boardId: column.boardId,
      userId,
      type: "column_deleted",
      metadata: {
        columnName: column.name,
      },
    });

    // Delete all cards in this column
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_column", (q) => q.eq("columnId", args.id))
      .collect();

    for (const card of cards) {
      await ctx.db.delete(card._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const reorder = mutation({
  args: {
    boardId: v.id("boards"),
    columnIds: v.array(v.id("columns")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board) throw new Error("Board not found");

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    for (let i = 0; i < args.columnIds.length; i++) {
      await ctx.db.patch(args.columnIds[i], { order: i });
    }
  },
});

export const setType = mutation({
  args: {
    id: v.id("columns"),
    type: v.optional(
      v.union(
        v.literal("backlog"),
        v.literal("todo"),
        v.literal("in_progress"),
        v.literal("review"),
        v.literal("blocked"),
        v.literal("done"),
        v.literal("wont_do")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const column = await ctx.db.get(args.id);
    if (!column) throw new Error("Column not found");

    const board = await ctx.db.get(column.boardId);
    if (!board) throw new Error("Board not found");

    if (board.ownerId !== userId && !board.memberIds.includes(userId)) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, { type: args.type });
  },
});
