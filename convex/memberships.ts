import { ConvexError, v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { deleteBand } from "./bands";
import { Id } from "./_generated/dataModel";
import { getCurrentUserOrThrow } from "./users";
import { getFutureEventsByBand } from "./events";

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
      throw new ConvexError("User not found");
    }

    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new ConvexError("Band not found");
    }

    const inviteeMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user_band", (q) =>
        q.eq("userId", user._id).eq("bandId", args.bandId),
      )
      .unique();
    if (inviteeMembership)
      throw new ConvexError("User is already member or invited.");

    return await ctx.db.insert("memberships", {
      userId: user._id,
      bandId: args.bandId,
      role: "invited",
      invitedBy: currentUser._id,
    });
  },
});

export async function getInvitesByUser(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("memberships")
    .withIndex("by_user_role", (q) =>
      q.eq("userId", userId).eq("role", "invited"),
    )
    .collect();
}

export async function getMembershipsByUser(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) =>
      q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "member")),
    )
    .collect();
}

export async function getInvitesByBand(ctx: QueryCtx, bandId: Id<"bands">) {
  return await ctx.db
    .query("memberships")
    .withIndex("by_band_role", (q) =>
      q.eq("bandId", bandId).eq("role", "invited"),
    )
    .collect();
}

export async function getMembershipsByBand(ctx: QueryCtx, bandId: Id<"bands">) {
  return await ctx.db
    .query("memberships")
    .withIndex("by_band", (q) => q.eq("bandId", bandId))
    .filter((q) =>
      q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "member")),
    )
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
    if (membership.role === "invited" && allowedRoles.includes("member")) {
      throw new ConvexError("You must accept your invite to access this.");
    }
    if (allowedRoles.includes("admin")) {
      throw new ConvexError("You must be an admin to perform this action.");
    }
    throw new ConvexError("You do not have permission to perform this action.");
  }

  return membership;
}

export const accept = mutation({
  args: { id: v.id("memberships") },
  handler: async (ctx, args) => {
    const [user, invite] = await Promise.all([
      getCurrentUserOrThrow(ctx),
      ctx.db.get(args.id),
    ]);

    if (!invite) throw new ConvexError("Invite not found");

    const [band, events] = await Promise.all([
      ctx.db.get(invite.bandId),
      getFutureEventsByBand(ctx, invite.bandId),
    ]);

    if (!band) {
      throw new ConvexError("Band not found");
    }

    await Promise.all([
      ctx.db.patch(invite._id, { role: "member" }),
      ctx.db.patch(invite.bandId, {
        memberCount: band.memberCount + 1,
      }),
      ...events.map(async (event) => {
        await Promise.all([
          ctx.db.insert("rsvps", {
            eventId: event._id,
            userId: user._id,
            status: "pending",
            startTime: event.startTime,
          }),
          ctx.db.patch(event._id, {
            rsvpCount: event.rsvpCount + 1,
          }),
        ]);
      }),
    ]);

    return "Invite accepted.";
  },
});

export const decline = mutation({
  args: { id: v.id("memberships") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return "Invite Declined";
  },
});

export const promote = mutation({
  args: { id: v.id("memberships") },
  handler: async (ctx, args) => {
    const membershipToPromote = await ctx.db.get(args.id);
    if (!membershipToPromote || membershipToPromote.role === "invited")
      return "Membership does not exist or is not promotable.";
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
  const allMembers = await ctx.db
    .query("memberships")
    .withIndex("by_band", (q) => q.eq("bandId", bandId))
    .collect();

  const membership = allMembers.find((m) => m.userId === userId);

  if (!membership) {
    throw new ConvexError("You are not a member of this band");
  }

  if (allMembers.length === 1) {
    await deleteBand(ctx, bandId);
    return "Band deleted as you were the last member.";
  }

  if (membership.role === "admin") {
    const otherAdmins = allMembers.filter(
      (m) => m.userId !== userId && m.role === "admin",
    );

    if (otherAdmins.length === 0) {
      const others = allMembers.filter((m) => m.userId !== userId);
      const heir = others.sort((a, b) => a._creationTime - b._creationTime)[0];
      if (heir) {
        await ctx.db.patch(heir._id, { role: "admin" });
      }
    }
  }

  const futureEvents = await getFutureEventsByBand(ctx, bandId);

  await Promise.all(
    futureEvents.map(async (event) => {
      const rsvp = await ctx.db
        .query("rsvps")
        .withIndex("by_user_event", (q) =>
          q.eq("userId", userId).eq("eventId", event._id),
        )
        .unique();

      if (rsvp) {
        const updates: { rsvpCount: number; attendingCount?: number } = {
          rsvpCount: Math.max(0, event.rsvpCount - 1),
        };

        if (rsvp.status === "yes") {
          updates.attendingCount = Math.max(0, event.attendingCount - 1);
        }

        await ctx.db.patch(event._id, updates);
        await ctx.db.delete(rsvp._id);
      }
    }),
  );

  const band = await ctx.db.get(bandId);
  if (band) {
    await ctx.db.patch(bandId, {
      memberCount: Math.max(0, band.memberCount - 1),
    });
  }

  await ctx.db.delete(membership._id);

  return "Band left.";
}

export const leave = mutation({
  args: { id: v.id("bands") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await leaveBand(ctx, args.id, user._id);
  },
});

export const kick = mutation({
  args: { id: v.id("memberships") },
  handler: async (ctx, args) => {
    const [currentUser, targetMembership] = await Promise.all([
      getCurrentUserOrThrow(ctx),
      ctx.db.get(args.id),
    ]);

    if (!targetMembership)
      throw new ConvexError("Target membership not found.");
    if (targetMembership.role === "admin")
      throw new ConvexError("Target is admin.");
    if (targetMembership.role === "invited")
      throw new ConvexError("Target is not yet a member.");

    const [, band, events] = await Promise.all([
      assertBandPermissions(ctx, currentUser._id, targetMembership.bandId, [
        "admin",
      ]),
      ctx.db.get(targetMembership.bandId),
      ctx.db
        .query("events")
        .withIndex("by_band", (q) => q.eq("bandId", targetMembership.bandId))
        .collect(),
    ]);

    if (!band) throw new ConvexError("Band does not exist.");

    const rsvpsToDelete = await Promise.all(
      events.map(async (event) => {
        const rsvp = await ctx.db
          .query("rsvps")
          .withIndex("by_user_event", (q) =>
            q.eq("userId", targetMembership.userId).eq("eventId", event._id),
          )
          .unique();

        return rsvp ? { rsvp, event } : null;
      }),
    );

    const validRsvps = rsvpsToDelete.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );

    await Promise.all([
      ctx.db.delete(targetMembership._id),

      ctx.db.patch(band._id, {
        memberCount: Math.max(0, band.memberCount - 1),
      }),

      ...validRsvps.map(async ({ rsvp, event }) => {
        await ctx.db.patch(event._id, {
          rsvpCount: Math.max(0, event.rsvpCount - 1),
          attendingCount:
            rsvp.status === "yes"
              ? Math.max(0, event.attendingCount - 1)
              : event.attendingCount,
        });

        await ctx.db.delete(rsvp._id);
      }),
    ]);
  },
});

export const getUserMemberships = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const memberships = await getMembershipsByUser(ctx, user._id);
    return await Promise.all(
      memberships.map(async (membership) => {
        const band = await ctx.db.get(membership.bandId);
        if (!band) return null;
        return {
          ...membership,
          bandName: band.name,
        };
      }),
    );
  },
});

export const getUserInvites = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const memberships = await getInvitesByUser(ctx, user._id);

    const data = await Promise.all(
      memberships.map(async (membership) => {
        const [band, inviter] = await Promise.all([
          ctx.db.get(membership.bandId),
          membership.invitedBy ? ctx.db.get(membership.invitedBy) : null,
        ]);

        if (!band) return null;

        return {
          ...membership,
          bandName: band.name,
          invitorName: inviter?.displayName || "Unknown",
        };
      }),
    );

    return data.filter((m): m is NonNullable<typeof m> => m !== null);
  },
});
