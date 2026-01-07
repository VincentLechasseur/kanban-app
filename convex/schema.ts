import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  boards: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    ownerId: v.id("users"),
    memberIds: v.array(v.id("users")),
    isPublic: v.optional(v.boolean()),
    order: v.optional(v.number()),
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
    color: v.optional(v.string()),
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

  comments: defineTable({
    cardId: v.id("cards"),
    userId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_card", ["cardId", "createdAt"]),

  chatReadStatus: defineTable({
    boardId: v.id("boards"),
    userId: v.id("users"),
    lastReadAt: v.number(),
  })
    .index("by_board_user", ["boardId", "userId"])
    .index("by_user", ["userId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("mention"), v.literal("chat_mention"), v.literal("assignment")),
    fromUserId: v.id("users"),
    cardId: v.optional(v.id("cards")),
    boardId: v.id("boards"),
    commentId: v.optional(v.id("comments")),
    messageId: v.optional(v.id("messages")),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_unread", ["userId", "read"]),
});
