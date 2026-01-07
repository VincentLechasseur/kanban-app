import type { QueryCtx, MutationCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";

/**
 * Get the authenticated user ID or throw if not authenticated.
 * Use this in mutations that require authentication.
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

/**
 * Get the authenticated user ID or return null.
 * Use this in queries where unauthenticated access should return empty results.
 */
export async function getAuthUser(ctx: QueryCtx | MutationCtx): Promise<Id<"users"> | null> {
  return await getAuthUserId(ctx);
}

/**
 * Check if the user has access to a board (is owner or member).
 * Returns the board if access is granted, throws if not.
 * Use this in mutations that modify board data.
 */
export async function requireBoardAccess(
  ctx: QueryCtx | MutationCtx,
  boardId: Id<"boards">
): Promise<{
  board: NonNullable<Awaited<ReturnType<typeof ctx.db.get>>>;
  userId: Id<"users">;
  isOwner: boolean;
}> {
  const userId = await requireAuth(ctx);

  const board = await ctx.db.get(boardId);
  if (!board) {
    throw new Error("Board not found");
  }

  const isOwner = board.ownerId === userId;
  const isMember = board.memberIds.includes(userId);

  if (!isOwner && !isMember) {
    throw new Error("Not authorized to access this board");
  }

  return { board, userId, isOwner };
}

/**
 * Check if the user has access to a board (is owner or member).
 * Returns null if no access, returns board info if access granted.
 * Use this in queries where unauthorized access should return null.
 */
export async function getBoardAccess(
  ctx: QueryCtx | MutationCtx,
  boardId: Id<"boards">
): Promise<{
  board: NonNullable<Awaited<ReturnType<typeof ctx.db.get>>>;
  userId: Id<"users">;
  isOwner: boolean;
} | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const board = await ctx.db.get(boardId);
  if (!board) return null;

  const isOwner = board.ownerId === userId;
  const isMember = board.memberIds.includes(userId);

  if (!isOwner && !isMember) return null;

  return { board, userId, isOwner };
}

/**
 * Require the user to be the board owner.
 * Use this for owner-only operations like deleting the board.
 */
export async function requireBoardOwner(
  ctx: QueryCtx | MutationCtx,
  boardId: Id<"boards">
): Promise<{
  board: NonNullable<Awaited<ReturnType<typeof ctx.db.get>>>;
  userId: Id<"users">;
}> {
  const { board, userId, isOwner } = await requireBoardAccess(ctx, boardId);

  if (!isOwner) {
    throw new Error("Only the board owner can perform this action");
  }

  return { board, userId };
}
