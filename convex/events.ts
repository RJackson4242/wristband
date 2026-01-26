import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { createEventRsvps, deleteRsvpsByEvent, resetRsvps } from "./rsvps";
import {
  getCurrentUserOrThrow,
  assertBandPermissions,
  getCurrentUser,
} from "./utils";
import { v } from "convex/values";
import { getByBand, getByUser } from "./memberships";
import { parseArgs } from "util";

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

    const members = await getByBand(ctx, args.bandId);
    await createEventRsvps(ctx, members, eventId);

    return eventId;
  },
});

async function enrichEvents(
  ctx: QueryCtx,
  events: Doc<"events">[],
  user: Doc<"users">,
) {
  return await Promise.all(
    events.map(async (event) => {
      const [band, myRsvp, allRsvps, bandMembers] = await Promise.all([
        ctx.db.get(event.bandId),
        ctx.db
          .query("rsvps")
          .withIndex("by_user_event", (q) =>
            q.eq("userId", user._id).eq("eventId", event._id),
          )
          .unique(),
        ctx.db
          .query("rsvps")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect(),
        ctx.db
          .query("memberships")
          .withIndex("by_band", (q) => q.eq("bandId", event.bandId))
          .collect(),
      ]);

      const myMembership = bandMembers.find((m) => m.userId === user._id);

      return {
        ...event,
        bandName: band?.name ?? "Unknown",
        currentRsvp: myRsvp?.status || "pending",
        attendingCount: allRsvps.filter((r: Doc<"rsvps">) => r.status === "yes")
          .length,
        totalRsvps: allRsvps.length,
        isAdmin: myMembership?.role === "admin",
      };
    }),
  );
}

export async function getFutureEvents(ctx: QueryCtx, bandId: Id<"bands">) {
  return await ctx.db
    .query("events")
    .withIndex("by_band_time", (q) =>
      q.eq("bandId", bandId).gte("startTime", Date.now()),
    )
    .order("asc")
    .collect();
}

export const userFutureEventCards = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const memberships = await getByUser(ctx, user._id);

    const events: Doc<"events">[] = [];

    for (const membership of memberships) {
      const bandEvents = await getFutureEvents(ctx, membership.bandId);
      events.push(...bandEvents);
    }

    return await enrichEvents(ctx, events, user);
  },
});

export const userPastEventCards = query({
  args: { cursor: v.optional(v.number()), limit: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const memberships = await getByUser(ctx, user._id);

    const events: Doc<"events">[] = [];

    for (const membership of memberships) {
      const bandEvents = await ctx.db
        .query("events")
        .withIndex("by_band_time", (q) =>
          q
            .eq("bandId", membership.bandId)
            .lt("startTime", args.cursor ?? Date.now()),
        )
        .order("desc")
        .take(args.limit);
      events.push(...bandEvents);
    }

    events.sort((a, b) => b.startTime - a.startTime);
    const paginatedEvents = events.slice(0, args.limit);
    const lastEvent = paginatedEvents[paginatedEvents.length - 1];
    const nextCursor = lastEvent ? lastEvent.startTime : null;
    return {
      events: await enrichEvents(ctx, paginatedEvents, user),
      nextCursor,
    };
  },
});

export const bandFutureEventCards = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    assertBandPermissions(ctx, user._id, args.bandId);

    const events = await getFutureEvents(ctx, args.bandId);
    return await enrichEvents(ctx, events, user);
  },
});

export const bandPastEventCards = query({
  args: {
    bandId: v.id("bands"),
    cursor: v.optional(v.number()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    assertBandPermissions(ctx, user._id, args.bandId);

    const events = await ctx.db
      .query("events")
      .withIndex("by_band_time", (q) =>
        q.eq("bandId", args.bandId).lt("startTime", args.cursor ?? Date.now()),
      )
      .order("desc")
      .take(args.limit);

    const lastEvent = events[events.length - 1];
    const nextCursor = lastEvent ? lastEvent.startTime : null;

    return {
      events: await enrichEvents(ctx, events, user),
      nextCursor,
    };
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
      if (args.startTime !== event.startTime && args.startTime > Date.now()) {
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
