import { mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { deleteRsvpsByEvent } from "./rsvps";
import { getCurrentUserOrThrow, assertBandPermissions } from "./utils";
import { v } from "convex/values";

export async function getFutureEvents(ctx: QueryCtx, bandId: Id<"bands">) {
  return await ctx.db
    .query("events")
    .withIndex("by_band_time", (q) => q.eq("bandId", bandId))
    .filter((q) => q.gte(q.field("startTime"), Date.now()))
    .collect();
}

export async function deleteEventsByBand(
  ctx: MutationCtx,
  bandId: Id<"bands">
) {
  const events = await ctx.db
    .query("events")
    .withIndex("by_band", (q) => q.eq("bandId", bandId))
    .collect();

  for (const event of events) {
    await deleteRsvpsByEvent(ctx, event._id);
    await ctx.db.delete(event._id);
  }
}

export const remove = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    const user = await getCurrentUserOrThrow(ctx);
    await assertBandPermissions(ctx, user._id, event.bandId, true);
    await deleteRsvpsByEvent(ctx, event._id);
    await ctx.db.delete(event._id);
  },
});
