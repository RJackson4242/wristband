import { QueryCtx, MutationCtx, mutation } from "./_generated/server";

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("user")
    .withIndex("byTokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  return user;
}

export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    const user = await ctx.db
      .query("user")
      .withIndex("byTokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (user !== null) {
      if (user.name !== identity.name) {
        await ctx.db.patch(user._id, { name: identity.name! });
      }
      if (user.email !== identity.email) {
        await ctx.db.patch(user._id, { email : identity.email! })
      }
      return user._id;
    }

    return await ctx.db.insert("user", {
      name: identity.name!,
      email: identity.email!,
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});