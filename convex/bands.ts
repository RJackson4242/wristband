import { ConvexError, v } from "convex/values";
import { mutation, MutationCtx, query } from "./_generated/server";
import { deleteEventsByBand, getFutureEvents } from "./events";
import { Id } from "./_generated/dataModel";
import {
  getMembershipsByUser,
  assertBandPermissions,
  getMembershipsByBand,
} from "./memberships";
import { getCurrentUserOrThrow } from "./users";

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
      bandName: args.name,
      userId: user._id,
      displayName: user.displayName,
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

    const memberships = await getMembershipsByBand(ctx, args.id);

    const events = await await ctx.db
      .query("events")
      .withIndex("by_band", (q) => q.eq("bandId", args.id))
      .collect();

    await Promise.all([
      ...memberships.map((membership) =>
        ctx.db.patch(membership._id, { bandName: args.name }),
      ),
      ...events.map((event) =>
        ctx.db.patch(event._id, { bandName: args.name }),
      ),
    ]);
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
    await assertBandPermissions(ctx, user._id, args.id, ["admin"]);
    await deleteBand(ctx, args.id);
  },
});

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
            await getFutureEvents(ctx, membership.bandId)
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
    if (!band) throw new ConvexError("Band not found.");

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .collect();

    return {
      ...band,
      members: memberships,
      currentUser: user._id,
      isAdmin: membership.role === "admin",
    };
  },
});
