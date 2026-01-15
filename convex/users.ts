import { mutation, query, QueryCtx } from "./_generated/server";

export const cUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called upsertUser without authentication present");
    }

    const user = await ctx.db
      .query("user")
      .withIndex("byTokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    const newUsername = identity.preferredUsername || identity.nickname;
    const newName = identity.name || newUsername || "User";

    if (user !== null) {
      const updates: Record<string, string | undefined> = {};
      if (user.username !== newUsername) {
        updates.username = newUsername;
      }
      if (user.displayName !== newName) {
        updates.displayName = newName;
      }
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(user._id, updates);
      }
      return user._id;
    }

    return await ctx.db.insert("user", {
      username: newUsername!,
      displayName: newName!,
      tokenIdentifier: identity.tokenIdentifier!,
    });
  },
});

export async function retrieveCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  return await ctx.db
    .query("user")
    .withIndex("byTokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();
}

export const rUser = query({
  args: {},
  handler: async (ctx) => {
    return await retrieveCurrentUser(ctx);
  },
});

export const dUser = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await retrieveCurrentUser(ctx);
    if (!user) {
      throw new Error("User not found.");
    }

    const memberships = await ctx.db
      .query("bandMember")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const rsvps = await ctx.db
      .query("rsvp")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    await Promise.all([
      ...memberships.map((m) => ctx.db.delete(m._id)),
      ...rsvps.map((m) => ctx.db.delete(m._id)),
      ctx.db.delete(user._id),
    ]);
  },
});
