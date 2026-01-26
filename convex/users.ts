import { internalMutation, mutation, query } from "./_generated/server";
import { UserJSON } from "@clerk/backend";
import { ConvexError, v, Validator } from "convex/values";
import { getCurrentUser, userByToken } from "./utils";
import { getByUser, leaveBand } from "./memberships";
import { deleteRsvpsByUser } from "./rsvps";

// export const get = query({
//   args: {},
//   handler: async (ctx) => {
//     return await getCurrentUser(ctx);
//   },
// });

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Called storeUser without authentication present");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    const username = identity.nickname || "user";
    const namePart =
      `${identity.givenName || ""} ${identity.familyName || ""}`.trim();
    const displayName = namePart.length > 0 ? namePart : username;

    const userAttributes = {
      username,
      displayName,
      tokenIdentifier: identity.subject,
    };

    if (user !== null) {
      if (
        user.displayName !== userAttributes.displayName ||
        user.username !== userAttributes.username
      ) {
        await ctx.db.patch(user._id, userAttributes);
      }
      return user._id;
    }

    return await ctx.db.insert("users", userAttributes);
  },
});

export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> },
  async handler(ctx, { data }) {
    const username = data.username || "user";
    const namePart = `${data.first_name || ""} ${data.last_name || ""}`.trim();
    const displayName = namePart.length > 0 ? namePart : username;

    const userAttributes = {
      username,
      displayName,
      tokenIdentifier: data.id,
    };

    const user = await userByToken(ctx, data.id);
    if (user === null) {
      await ctx.db.insert("users", userAttributes);
    } else {
      await ctx.db.patch(user._id, userAttributes);
    }
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await userByToken(ctx, clerkUserId);

    if (!user) {
      return;
    }

    const memberships = await getByUser(ctx, user._id);

    for (const membership of memberships) {
      await leaveBand(ctx, membership.bandId, user._id);
    }

    await deleteRsvpsByUser(ctx, user._id);
    await ctx.db.delete(user._id);
  },
});
