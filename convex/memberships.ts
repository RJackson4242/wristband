import { v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { assertBandPermissions, getCurrentUserOrThrow } from "./utils";
import { deleteBand } from "./bands";
import { Id } from "./_generated/dataModel";
import { getFutureEvents } from "./events";
import { backfillRsvps } from "./rsvps";

export const invite = mutation({
  args: { username: v.string(), bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrThrow(ctx);
    await assertBandPermissions(ctx, currentUser._id, args.bandId, true);

    const user = await ctx.db
      .query("users")
      .withIndex("by_name", (q) => q.eq("username", args.username))
      .unique();

    if (!user) {
      return new Error("User not found");
    }

    const inviteeMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user_band", (q) =>
        q.eq("userId", user._id).eq("bandId", args.bandId),
      )
      .unique();
    if (inviteeMembership)
      return new Error("User is already member or invited.");

    return await ctx.db.insert("memberships", {
      userId: user._id,
      bandId: args.bandId,
      role: "invited",
    });
  },
});

export async function getMembershipsByUser(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
}

export const getFromUser = query({
  args: { status: v.union(v.literal("active"), v.literal("invited")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const memberships = await getMembershipsByUser(ctx, user._id);

    return memberships.filter((m) => {
      if (args.status === "invited") {
        return m.role === "invited";
      }
      return m.role === "admin" || m.role === "member";
    });
  },
});

export async function getMembershipsByBand(ctx: QueryCtx, bandId: Id<"bands">) {
  return await ctx.db
    .query("memberships")
    .withIndex("by_band", (q) => q.eq("bandId", bandId))
    .collect();
}

export const getFromBand = query({
  args: { id: v.id("bands") },
  handler: async (ctx, args) => {
    return getMembershipsByBand(ctx, args.id);
  },
});

export async function getMembershipsCountByBand(
  ctx: QueryCtx,
  bandId: Id<"bands">,
) {
  return (
    await ctx.db
      .query("memberships")
      .withIndex("by_band", (q) => q.eq("bandId", bandId))
      .collect()
  ).length;
}

export const accept = mutation({
  args: { id: v.id("memberships") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const membership = await ctx.db.get(args.id);
    if (!membership) throw new Error("Invite does not exist.");
    if (membership.userId != user._id)
      throw new Error("This isn't your invite.");
    await ctx.db.patch(membership._id, { role: "member" });

    const upcomingEvents = await getFutureEvents(ctx, membership.bandId);
    await backfillRsvps(ctx, user._id, upcomingEvents);

    return "Invite accepted.";
  },
});

export const promote = mutation({
  args: { id: v.id("memberships") },
  handler: async (ctx, args) => {
    const membershipToPromote = await ctx.db.get(args.id);
    if (!membershipToPromote || membershipToPromote.role === "invited")
      throw new Error("Member not in band.");
    const currentUser = await getCurrentUserOrThrow(ctx);
    await assertBandPermissions(
      ctx,
      currentUser._id,
      membershipToPromote.bandId,
      true,
    );
    await ctx.db.patch(membershipToPromote._id, { role: "admin" });
    return "User promoted to Admin.";
  },
});

export async function leaveBand(
  ctx: MutationCtx,
  bandId: Id<"bands">,
  userId: Id<"users">,
) {
  const membership = await assertBandPermissions(ctx, userId, bandId);

  const allMembers = await ctx.db
    .query("memberships")
    .withIndex("by_band", (q) => q.eq("bandId", bandId))
    .collect();

  if (allMembers.length === 1) {
    await deleteBand(ctx, bandId);
    return "Band deleted as you were the last member.";
  }

  if (membership.role === "admin") {
    const otherAdmins = allMembers.filter(
      (m) => m.userId !== membership.userId && m.role === "admin",
    );

    if (otherAdmins.length === 0) {
      const others = allMembers.filter((m) => m.userId !== userId);
      const heir = others.sort((a, b) => a._creationTime - b._creationTime)[0];
      await ctx.db.patch(heir._id, { role: "admin" });
    }
  }

  await ctx.db.delete(membership._id);
}

export const leave = mutation({
  args: { id: v.id("bands") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await leaveBand(ctx, args.id, user._id);
  },
});

export const kick = mutation({
  args: { bandId: v.id("bands"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrThrow(ctx);
    await assertBandPermissions(ctx, currentUser._id, args.bandId, true);

    const targetMembership = await assertBandPermissions(
      ctx,
      args.userId,
      args.bandId,
    );

    if (targetMembership.role === "admin") throw new Error("Target is admin");

    const events = await ctx.db
      .query("events")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .collect();

    for (const event of events) {
      const rsvp = await ctx.db
        .query("rsvps")
        .withIndex("by_user_event", (q) =>
          q.eq("userId", args.userId).eq("eventId", event._id),
        )
        .unique();
      if (rsvp) await ctx.db.delete(rsvp._id);
    }

    await ctx.db.delete(targetMembership._id);
  },
});
