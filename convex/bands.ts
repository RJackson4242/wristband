import { ConvexError, v } from "convex/values";
import { mutation, MutationCtx, query } from "./_generated/server";
import { getFutureEventsByBand } from "./events";
import { Id } from "./_generated/dataModel";
import {
  getMembershipsByUser,
  assertBandPermissions,
  getMembershipsByBand,
  getInvitesByBand,
} from "./memberships";
import { getCurrentUserOrThrow } from "./users";
import { getEventRsvps } from "./rsvps";

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const bandId = await ctx.db.insert("bands", {
      name: args.name,
      memberCount: 1,
    });

    await ctx.db.insert("memberships", {
      bandId,
      userId: user._id,
      role: "admin",
    });

    return bandId;
  },
});

export const update = mutation({
  args: { id: v.id("bands"), name: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await assertBandPermissions(ctx, user._id, args.id, ["admin"]);

    await ctx.db.patch(args.id, {
      name: args.name,
    });
  },
});

export async function deleteBand(ctx: MutationCtx, bandId: Id<"bands">) {
  const events = await ctx.db
    .query("events")
    .withIndex("by_band", (q) => q.eq("bandId", bandId))
    .collect();

  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_band", (q) => q.eq("bandId", bandId))
    .collect();

  await Promise.all([
    ...events.map(async (event) => {
      const rsvps = await getEventRsvps(ctx, event._id);
      await Promise.all(rsvps.map((r) => ctx.db.delete(r._id)));
      await ctx.db.delete(event._id);
    }),
    ...memberships.map((m) => ctx.db.delete(m._id)),
    ctx.db.delete(bandId),
  ]);
}

export const getBandCards = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    const memberships = await getMembershipsByUser(ctx, user._id);

    const bands = (
      await Promise.all(
        memberships.map(async (membership) => {
          const band = await ctx.db.get(membership.bandId);
          if (!band) return null;

          const upcomingEventsCount = (
            await getFutureEventsByBand(ctx, membership.bandId)
          ).length;

          return {
            ...band,
            upcomingEventsCount,
            isAdmin: membership.role === "admin",
          };
        }),
      )
    )
      .filter((b) => b !== null)
      .sort((a, b) => b._creationTime - a._creationTime);

    return bands;
  },
});

export const getBandPage = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const membership = await assertBandPermissions(ctx, user._id, args.bandId);

    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new ConvexError("Could Not Find Band");
    }

    const [memberships, invites] = await Promise.all([
      getMembershipsByBand(ctx, args.bandId),
      getInvitesByBand(ctx, args.bandId),
    ]);

    const membersWithDetails = await Promise.all(
      memberships.map(async (m) => {
        const memberUser = await ctx.db.get(m.userId);
        return {
          ...m,
          username: memberUser?.username || "Unknown",
          displayName: memberUser?.displayName || "Unknown User",
        };
      }),
    );

    const invitesWithDetails = await Promise.all(
      invites.map(async (invite) => {
        const inviter = invite.invitedBy
          ? await ctx.db.get(invite.invitedBy)
          : null;

        const invited = invite.userId ? await ctx.db.get(invite.userId) : null;

        if (!invited) return null;

        return {
          ...invite,
          title: invited.displayName,
          invitorName: inviter?.displayName || "Unknown",
        };
      }),
    );

    return {
      ...band,
      members: membersWithDetails,
      currentUser: user._id,
      isAdmin: membership.role === "admin",
      invites: invitesWithDetails.filter(
        (m): m is NonNullable<typeof m> => m !== null,
      ),
    };
  },
});
