import { ConvexError, v } from "convex/values";
import { mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { deleteBand } from "./bands";
import { Id } from "./_generated/dataModel";
import { backfillRsvps } from "./rsvps";
import { getCurrentUserOrThrow } from "./users";

export const invite = mutation({
  args: { username: v.string(), bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrThrow(ctx);
    await assertBandPermissions(ctx, currentUser._id, args.bandId, ["admin"]);

    const user = await ctx.db
      .query("users")
      .withIndex("by_name", (q) => q.eq("username", args.username))
      .unique();

    if (!user) {
      return new ConvexError("User not found");
    }

    const band = await ctx.db.get(args.bandId);
    if (!band) {
      return new ConvexError("Band not found");
    }

    const inviteeMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user_band", (q) =>
        q.eq("userId", user._id).eq("bandId", args.bandId),
      )
      .unique();
    if (inviteeMembership)
      return new ConvexError("User is already member or invited.");

    return await ctx.db.insert("memberships", {
      userId: user._id,
      displayName: user.displayName,
      bandId: args.bandId,
      bandName: band.name,
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

export async function getMembershipsByBand(ctx: QueryCtx, bandId: Id<"bands">) {
  return await ctx.db
    .query("memberships")
    .withIndex("by_band", (q) => q.eq("bandId", bandId))
    .collect();
}

type bandRoles = "admin" | "member" | "invited";

export async function assertBandPermissions(
  ctx: QueryCtx,
  userId: Id<"users">,
  bandId: Id<"bands">,
  allowedRoles: bandRoles[] = ["admin", "member"],
) {
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_band", (q) =>
      q.eq("userId", userId).eq("bandId", bandId),
    )
    .unique();

  if (!membership) {
    throw new ConvexError("You are not a member of this band.");
  }

  if (!allowedRoles.includes(membership.role)) {
    if (allowedRoles.includes("admin")) {
      throw new ConvexError("You must be an admin to perform this action.");
    } else if (allowedRoles.includes("member")) {
      throw new ConvexError("You must accept your invite to access this.");
    } else {
      throw new ConvexError(
        "You do not have permission to perform this action.",
      );
    }
  }

  return membership;
}

export const accept = mutation({
  args: { id: v.id("memberships") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const membership = await ctx.db.get(args.id);
    if (!membership) throw new ConvexError("Invite does not exist.");
    if (membership.userId != user._id)
      throw new ConvexError("This isn't your invite.");
    const band = await ctx.db.get(membership.bandId);
    if (!band) throw new ConvexError("Band does not exist.");

    await ctx.db.patch(membership._id, { role: "member" });
    await ctx.db.patch(band._id, {
      memberCount: band.memberCount + 1,
    });
    await backfillRsvps(ctx, user._id, membership.bandId);

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
      ["admin"],
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

  const band = await ctx.db.get(membership.bandId);
  if (!band) throw new ConvexError("Band does not exist.");
  await ctx.db.patch(band._id, {
    memberCount: band.memberCount - 1,
  });

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
    await assertBandPermissions(ctx, currentUser._id, args.bandId, ["admin"]);

    const targetMembership = await assertBandPermissions(
      ctx,
      args.userId,
      args.bandId,
    );

    if (targetMembership.role === "admin")
      throw new ConvexError("Target is admin");

    const band = await ctx.db.get(targetMembership.bandId);
    if (!band) throw new ConvexError("Band does not exist.");
    await ctx.db.patch(band._id, {
      memberCount: band.memberCount - 1,
    });

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
