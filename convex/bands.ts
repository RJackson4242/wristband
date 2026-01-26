import { v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { assertBandPermissions, getCurrentUserOrThrow } from "./utils";
import { deleteEventsByBand, getFutureEventCount } from "./events";
import { Id } from "./_generated/dataModel";
import { getMembershipsByUser, getMembershipsCountByBand } from "./memberships";

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const bandId = await ctx.db.insert("bands", { name: args.name });

    await ctx.db.insert("memberships", {
      bandId,
      userId: user._id,
      role: "admin",
    });

    return bandId;
  },
});

export async function getBandById(ctx: QueryCtx, bandId: Id<"bands">) {
  return await ctx.db.get(bandId);
}

export const get = query({
  args: { id: v.id("bands") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await assertBandPermissions(ctx, user._id, args.id);
    return await getBandById(ctx, args.id);
  },
});

export const update = mutation({
  args: { id: v.id("bands"), name: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await assertBandPermissions(ctx, user._id, args.id, true);

    await ctx.db.patch(args.id, {
      name: args.name,
    });

    return "Band name updated.";
  },
});

export async function deleteBand(ctx: MutationCtx, bandId: Id<"bands">) {
  await deleteEventsByBand(ctx, bandId);

  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_band", (q) => q.eq("bandId", bandId))
    .collect();

  for (const m of memberships) {
    await ctx.db.delete(m._id);
  }

  await ctx.db.delete(bandId);
}

export const remove = mutation({
  args: { id: v.id("bands") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await assertBandPermissions(ctx, user._id, args.id, true);
    await deleteBand(ctx, args.id);
  },
});

export const getBandCards = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    const memberships = await getMembershipsByUser(ctx, user._id);

    const bands = [];
    for (const membership of memberships) {
      const band = await getBandById(ctx, membership.bandId);
      const memberCount = await getMembershipsCountByBand(
        ctx,
        membership.bandId,
      );
      const upcomingEventsCount = await getFutureEventCount(
        ctx,
        membership.bandId,
      );
      if (band) {
        bands.push({
          id: band._id,
          name: band.name,
          memberCount: memberCount,
          upcomingEventsCount: upcomingEventsCount,
          isAdmin: membership.role === "admin",
        });
      }
    }

    return bands;
  },
});
