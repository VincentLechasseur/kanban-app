import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  // Extend users table with custom fields
  users: defineTable({
    // Auth fields
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Custom fields
    isAdmin: v.optional(v.boolean()),
    // User preferences
    preferences: v.optional(
      v.object({
        sidebarCollapsed: v.optional(v.boolean()),
        compactView: v.optional(v.boolean()),
      })
    ),
  }),

  boards: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    ownerId: v.id("users"),
    memberIds: v.array(v.id("users")),
    isPublic: v.optional(v.boolean()),
    order: v.optional(v.number()),
    createdAt: v.number(),
    // Custom column types defined by the user
    customColumnTypes: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          icon: v.string(),
          color: v.string(),
        })
      )
    ),
  })
    .index("by_owner", ["ownerId"])
    .index("by_member", ["memberIds"])
    .index("by_public", ["isPublic"]),

  columns: defineTable({
    boardId: v.id("boards"),
    name: v.string(),
    order: v.number(),
    // Column type for workflow tracking (built-in or custom type id)
    type: v.optional(v.string()),
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
    // Story points for velocity tracking
    storyPoints: v.optional(v.number()),
    // Time tracking in minutes
    timeEstimate: v.optional(v.number()),
    timeSpent: v.optional(v.number()),
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
    // Edit/delete support
    editedAt: v.optional(v.number()),
    isDeleted: v.optional(v.boolean()),
  })
    .index("by_board", ["boardId", "createdAt"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["boardId"],
    }),

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

  // Typing indicator status
  typingStatus: defineTable({
    boardId: v.id("boards"),
    userId: v.id("users"),
    expiresAt: v.number(),
  }).index("by_board", ["boardId"]),

  // Activity feed for board timeline
  activities: defineTable({
    boardId: v.id("boards"),
    userId: v.id("users"),
    type: v.union(
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
    ),
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
    createdAt: v.number(),
  })
    .index("by_board", ["boardId", "createdAt"])
    .index("by_card", ["cardId", "createdAt"]),
});
