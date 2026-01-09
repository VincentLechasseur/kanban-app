import { mutation } from "./_generated/server";
import { v } from "convex/values";

// One-time setup mutation to make a user admin
// Run this once from the Convex dashboard, then delete this file
export const makeAdmin = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const user = users.find((u) => u.email === args.email);

    if (!user) {
      throw new Error(`User with email ${args.email} not found`);
    }

    await ctx.db.patch(user._id, { isAdmin: true } as any);

    return { success: true, userId: user._id, email: args.email };
  },
});
