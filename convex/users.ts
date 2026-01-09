import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    // If user has a profile image stored, get the URL
    if (user.image?.startsWith("storage:")) {
      const storageId = user.image.replace("storage:", "") as any;
      const url = await ctx.storage.getUrl(storageId);
      return { ...user, image: url };
    }
    return user;
  },
});

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) return null;

    if (user.image?.startsWith("storage:")) {
      const storageId = user.image.replace("storage:", "") as any;
      const url = await ctx.storage.getUrl(storageId);
      return { ...user, image: url };
    }
    return user;
  },
});

export const getMany = query({
  args: { ids: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const users = await Promise.all(
      args.ids.map(async (id) => {
        const user = await ctx.db.get(id);
        if (!user) return null;

        if (user.image?.startsWith("storage:")) {
          const storageId = user.image.replace("storage:", "") as any;
          const url = await ctx.storage.getUrl(storageId);
          return { ...user, image: url };
        }
        return user;
      })
    );
    return users.filter((u) => u !== null);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const updates: { name?: string } = {};
    if (args.name !== undefined) updates.name = args.name;

    await ctx.db.patch(userId, updates);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateProfileImage = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Store reference to the file with a prefix to identify it
    await ctx.db.patch(userId, {
      image: `storage:${args.storageId}`,
    });
  },
});

export const removeProfileImage = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Delete the old image from storage if it exists
    if (user.image?.startsWith("storage:")) {
      const storageId = user.image.replace("storage:", "") as any;
      await ctx.storage.delete(storageId);
    }

    await ctx.db.patch(userId, { image: undefined });
  },
});

// Get user preferences
export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    return user?.preferences || { sidebarCollapsed: false };
  },
});

// Update user preferences
export const updatePreferences = mutation({
  args: {
    sidebarCollapsed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const currentPrefs = user.preferences || {};
    const newPrefs = {
      ...currentPrefs,
      ...(args.sidebarCollapsed !== undefined && { sidebarCollapsed: args.sidebarCollapsed }),
    };

    await ctx.db.patch(userId, { preferences: newPrefs });
  },
});
