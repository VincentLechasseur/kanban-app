import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const request = mutation({
  args: {
    boardId: v.id("boards"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board) throw new Error("Board not found");
    if (!board.isPublic) throw new Error("Board is not public");

    // Check if user is already a member or owner
    if (board.ownerId === userId || board.memberIds.includes(userId)) {
      throw new Error("You are already a member of this board");
    }

    // Check if user already has a pending request
    const existingRequest = await ctx.db
      .query("joinRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(q.eq(q.field("boardId"), args.boardId), q.eq(q.field("status"), "pending"))
      )
      .first();

    if (existingRequest) {
      throw new Error("You already have a pending request for this board");
    }

    const requestId = await ctx.db.insert("joinRequests", {
      boardId: args.boardId,
      userId,
      status: "pending",
      message: args.message,
      createdAt: Date.now(),
    });

    // Notify the board owner
    await ctx.db.insert("notifications", {
      userId: board.ownerId,
      type: "join_request",
      fromUserId: userId,
      boardId: args.boardId,
      joinRequestId: requestId,
      read: false,
      createdAt: Date.now(),
    });

    return requestId;
  },
});

export const cancel = mutation({
  args: { requestId: v.id("joinRequests") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.userId !== userId) throw new Error("Not authorized");
    if (request.status !== "pending") throw new Error("Request is not pending");

    await ctx.db.delete(args.requestId);
  },
});

export const listForBoard = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const board = await ctx.db.get(args.boardId);
    if (!board) return [];
    if (board.ownerId !== userId) return []; // Only owner can see requests

    const requests = await ctx.db
      .query("joinRequests")
      .withIndex("by_board_status", (q) => q.eq("boardId", args.boardId).eq("status", "pending"))
      .collect();

    // Get user details for each request
    const requestsWithUsers = await Promise.all(
      requests.map(async (request) => {
        const user = await ctx.db.get(request.userId);
        if (!user) return null;

        // Resolve profile image URL
        let image: string | undefined = user.image;
        if (image?.startsWith("storage:")) {
          const storageId = image.replace("storage:", "") as any;
          image = (await ctx.storage.getUrl(storageId)) ?? undefined;
        }

        return {
          ...request,
          user: { ...user, image },
        };
      })
    );

    return requestsWithUsers.filter((r) => r !== null);
  },
});

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const requests = await ctx.db
      .query("joinRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Get board details for each request
    const requestsWithBoards = await Promise.all(
      requests.map(async (request) => {
        const board = await ctx.db.get(request.boardId);
        return board ? { ...request, board } : null;
      })
    );

    return requestsWithBoards.filter((r) => r !== null);
  },
});

export const accept = mutation({
  args: { requestId: v.id("joinRequests") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== "pending") throw new Error("Request is not pending");

    const board = await ctx.db.get(request.boardId);
    if (!board) throw new Error("Board not found");
    if (board.ownerId !== userId) throw new Error("Not authorized");

    // Add user to board members
    await ctx.db.patch(request.boardId, {
      memberIds: [...board.memberIds, request.userId],
    });

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "accepted",
      resolvedAt: Date.now(),
    });

    // Notify the requester
    await ctx.db.insert("notifications", {
      userId: request.userId,
      type: "join_request_accepted",
      fromUserId: userId,
      boardId: request.boardId,
      joinRequestId: args.requestId,
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const reject = mutation({
  args: { requestId: v.id("joinRequests") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== "pending") throw new Error("Request is not pending");

    const board = await ctx.db.get(request.boardId);
    if (!board) throw new Error("Board not found");
    if (board.ownerId !== userId) throw new Error("Not authorized");

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "rejected",
      resolvedAt: Date.now(),
    });

    // Notify the requester
    await ctx.db.insert("notifications", {
      userId: request.userId,
      type: "join_request_rejected",
      fromUserId: userId,
      boardId: request.boardId,
      joinRequestId: args.requestId,
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const getPendingCount = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const board = await ctx.db.get(args.boardId);
    if (!board) return 0;
    if (board.ownerId !== userId) return 0;

    const requests = await ctx.db
      .query("joinRequests")
      .withIndex("by_board_status", (q) => q.eq("boardId", args.boardId).eq("status", "pending"))
      .collect();

    return requests.length;
  },
});

export const getUserRequestForBoard = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("joinRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(q.eq(q.field("boardId"), args.boardId), q.eq(q.field("status"), "pending"))
      )
      .first();
  },
});
