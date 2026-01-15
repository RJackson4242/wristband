import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { retrieveCurrentUser } from "./users";

// Create membership
export const cMembership = mutation({
  args: { userId: v.id("user"), bandId: v.id("band") },
  handler: async (ctx, args) => {
    const currentUser = await retrieveCurrentUser(ctx);
    if (!currentUser)
      throw new Error("You must be logged in to invite new members.");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Invited user does not exist");

    const band = await ctx.db.get(args.bandId);
    if (!band) throw new Error("Band does not exist.");

    const currentMembership = await ctx.db
      .query("bandMember")
      .withIndex("by_user_band", (q) =>
        q.eq("userId", currentUser._id).eq("bandId", args.bandId)
      )
      .unique();
    if (!currentMembership || currentMembership.role != "admin")
      throw new Error(
        "You do not have permission to invite others to this band."
      );

    const inviteeMembership = await ctx.db
      .query("bandMember")
      .withIndex("by_user_band", (q) =>
        q.eq("userId", user._id).eq("bandId", args.bandId)
      )
      .unique();
    if (inviteeMembership)
      return new Error("User is already member or invited.");

    return await ctx.db.insert("bandMember", {
      userId: user._id,
      bandId: band._id,
      role: "invited",
    });
  },
});

// Retrieve mmeberships from user & status
export const rUserMemberships = query({
  args: { status: v.union(v.literal("active"), v.literal("invited")) },
  handler: async (ctx, args) => {
    const user = await retrieveCurrentUser(ctx);
    if (!user) throw new Error("Log in to view your bands");

    const memberships = await ctx.db
      .query("bandMember")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return memberships.filter((m) => {
      if (args.status === "invited") {
        return m.role === "invited";
      }
      return m.role === "admin" || m.role === "member";
    });
  },
});

// Retrieve memberships from band
export const rBandMemberships = query({
  args: { bandId: v.id("band") },
  handler: async (ctx, args) => {
    const user = await retrieveCurrentUser(ctx);
    if (!user) throw new Error("Log in to view band members.");

    const band = await ctx.db.get(args.bandId);
    if (!band) throw new Error("Band does not exist.");

    const membership = await ctx.db
      .query("bandMember")
      .withIndex("by_user_band", (q) =>
        q.eq("userId", user._id).eq("bandId", args.bandId)
      )
      .unique();
    if (!membership || membership.role != "admin")
      throw new Error("You do not have permission to view band members.");

    return await ctx.db
      .query("bandMember")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .collect();
  },
});

// Update membership status
export const uMembershipStatus = mutation({
  args: { membershipId: v.id("bandMember") },
  handler: async (ctx, args) => {
    const user = await retrieveCurrentUser(ctx);
    if (!user) throw new Error("Log in to accept invites.");

    const membership = await ctx.db.get(args.membershipId);
    if (!membership) throw new Error("Invite does not exist.");
    if (membership.userId != user._id)
      throw new Error("This isn't your invite.");

    await ctx.db.patch(membership._id, { role: "member" });

    const upcomingEvents = await ctx.db
      .query("event")
      .withIndex("by_band_time", (q) => q.eq("bandId", membership.bandId))
      .filter((q) => q.gte(q.field("startTime"), Date.now()))
      .collect();

    if (upcomingEvents.length > 0) {
      await Promise.all(
        upcomingEvents.map((event) =>
          ctx.db.insert("rsvp", {
            eventId: event._id,
            userId: user._id,
            status: "pending",
          })
        )
      );
    }

    return "Invite accepted.";
  },
});

// Update membership role
export const uMembershipRole = mutation({
  args: { membershipId: v.id("bandMember") },
  handler: async (ctx, args) => {
    const user = await retrieveCurrentUser(ctx);
    if (!user) throw new Error("Log in to promote users.");

    const membership = await ctx.db.get(args.membershipId);
    if (!membership) throw new Error("Membership does not exist.");

    const userMembership = await ctx.db
      .query("bandMember")
      .withIndex("by_user_band", (q) =>
        q.eq("userId", user._id).eq("bandId", membership.bandId)
      )
      .unique();
    if (!userMembership || userMembership.role != "admin")
      throw new Error("You do not have permission to promote band members.");

    await ctx.db.patch(membership._id, { role: "admin" });

    return "User promoted to Admin.";
  },
});

// Delete membership
export const dMembership = mutation({
  args: { membershipId: v.id("bandMember") },
  handler: async (ctx, args) => {
    const user = await retrieveCurrentUser(ctx);
    if (!user) throw new Error("Log in to remove members.");

    const membership = await ctx.db.get(args.membershipId);
    if (!membership) throw new Error("Membership does not exist.");

    const userMembership = await ctx.db
      .query("bandMember")
      .withIndex("by_user_band", (q) =>
        q.eq("userId", user._id).eq("bandId", membership.bandId)
      )
      .unique();
    if (!userMembership || userMembership.role != "admin")
      throw new Error("You do not have permission to remove band members.");
    if (membership.role == "admin" && membership.userId != user._id)
      throw new Error("Cannot remove admin user from band.");

    const userRsvps = await ctx.db
      .query("rsvp")
      .withIndex("by_user", (q) => q.eq("userId", membership.userId))
      .collect();

    for (const rsvp of userRsvps) {
      const event = await ctx.db.get(rsvp.eventId);
      if (event && event.bandId === membership.bandId) {
        await ctx.db.delete(rsvp._id);
      }
    }

    await ctx.db.delete(membership._id);
  },
});
