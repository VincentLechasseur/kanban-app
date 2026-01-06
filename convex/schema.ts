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
    isPublic: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_member", ["memberIds"])
    .index("by_public", ["isPublic"]),

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

  joinRequests: defineTable({
    boardId: v.id("boards"),
    userId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
    message: v.optional(v.string()),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_board", ["boardId"])
    .index("by_user", ["userId"])
    .index("by_board_status", ["boardId", "status"]),

  messages: defineTable({
    boardId: v.id("boards"),
    userId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_board", ["boardId", "createdAt"]),

  chatReadStatus: defineTable({
    boardId: v.id("boards"),
    userId: v.id("users"),
    lastReadAt: v.number(),
  })
    .index("by_board_user", ["boardId", "userId"])
    .index("by_user", ["userId"]),
});
