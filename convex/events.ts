import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { createEventRsvps, deleteRsvpsByEvent, resetRsvps } from "./rsvps";
import { getCurrentUserOrThrow, assertBandPermissions } from "./utils";
import { v } from "convex/values";
import { getMembershipsByBand } from "./memberships";

const eventTypes = v.union(
  v.literal("practice"),
  v.literal("gig"),
  v.literal("meeting"),
  v.literal("recording"),
  v.literal("other"),
);

export const create = mutation({
  args: {
    bandId: v.id("bands"),
    name: v.string(),
    type: eventTypes,
    startTime: v.number(),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    await assertBandPermissions(ctx, user._id, args.bandId, true);

    const eventId = await ctx.db.insert("events", {
      bandId: args.bandId,
      name: args.name,
      type: args.type,
      startTime: args.startTime,
      location: args.location,
      description: args.description,
    });

    const members = await getMembershipsByBand(ctx, args.bandId);
    await createEventRsvps(ctx, members, eventId);

    return eventId;
  },
});

export async function getFutureEvents(ctx: QueryCtx, bandId: Id<"bands">) {
  return await ctx.db
    .query("events")
    .withIndex("by_band_time", (q) =>
      q.eq("bandId", bandId).gte("startTime", Date.now()),
    )
    .order("asc")
    .collect();
}

export const getUpcoming = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    return await getFutureEvents(ctx, args.bandId);
  },
});

export async function getFutureEventCount(ctx: QueryCtx, bandId: Id<"bands">) {
  return (
    await ctx.db
      .query("events")
      .withIndex("by_band_time", (q) =>
        q.eq("bandId", bandId).gte("startTime", Date.now()),
      )
      .collect()
  ).length;
}

export const getPast = query({
  args: {
    bandId: v.id("bands"),
    paginationOpts: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_band_time", (q) =>
        q.eq("bandId", args.bandId).lt("startTime", Date.now()),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const update = mutation({
  args: {
    eventId: v.id("events"),
    name: v.optional(v.string()),
    type: v.optional(eventTypes),
    startTime: v.optional(v.number()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    await assertBandPermissions(ctx, user._id, event.bandId, true);

    const updates: Partial<Omit<Doc<"events">, "_id" | "_creationTime">> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.type !== undefined) updates.type = args.type;
    if (args.startTime !== undefined) {
      updates.startTime = args.startTime;
      if (args.startTime !== event.startTime) {
        await resetRsvps(ctx, args.eventId);
      }
    }
    if (args.location !== undefined) updates.location = args.location;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.eventId, updates);

    return "Event updated";
  },
});

export async function deleteEventsByBand(
  ctx: MutationCtx,
  bandId: Id<"bands">,
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
