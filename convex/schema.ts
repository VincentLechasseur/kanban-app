import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  boards: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    memberIds: v.array(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_member", ["memberIds"]),

  columns: defineTable({
    boardId: v.id("boards"),
    name: v.string(),
    order: v.number(),
  }).index("by_board", ["boardId"]),

  cards: defineTable({
    columnId: v.id("columns"),
    boardId: v.id("boards"),
    title: v.string(),
    description: v.optional(v.string()),
    order: v.number(),
    assigneeIds: v.array(v.id("users")),
    labelIds: v.array(v.id("labels")),
    dueDate: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_column", ["columnId"])
    .index("by_board", ["boardId"]),

  labels: defineTable({
    boardId: v.id("boards"),
    name: v.string(),
    color: v.string(),
  }).index("by_board", ["boardId"]),
});
