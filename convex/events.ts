import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { createEventRsvps, deleteRsvpsByEvent, resetRsvps } from "./rsvps";
import { ConvexError, v } from "convex/values";
import { assertBandPermissions, getMembershipsByBand } from "./memberships";
import { getCurrentUserOrThrow } from "./users";

const eventTypes = v.union(
  v.literal("rehearsal"),
  v.literal("gig"),
  v.literal("meeting"),
  v.literal("recording"),
  v.literal("other"),
);

export const create = mutation({
  args: {
    bandId: v.id("bands"),
    name: v.optional(v.string()),
    type: eventTypes,
    startTime: v.number(),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const band = await ctx.db.get(args.bandId);
    await assertBandPermissions(ctx, user._id, args.bandId, ["admin"]);
    if (!band) {
      throw new ConvexError("Band not found");
    }

    const eventId = await ctx.db.insert("events", {
      bandId: args.bandId,
      name: args.name,
      type: args.type,
      startTime: args.startTime,
      location: args.location,
      description: args.description,
      rsvpCount: 0,
      attendingCount: 0,
    });

    const members = await getMembershipsByBand(ctx, args.bandId);
    await createEventRsvps(ctx, members, eventId);

    return eventId;
  },
});

export async function getFutureEvents(ctx: QueryCtx, bandId: Id<"bands">) {
  return (
    await ctx.db
      .query("events")
      .withIndex("by_band_time", (q) =>
        q.eq("bandId", bandId).gte("startTime", Date.now()),
      )
      .collect()
  ).sort((a, b) => a.startTime - b.startTime);
}

export async function getEventsByBand(ctx: QueryCtx, bandId: Id<"bands">) {
  return await ctx.db
    .query("events")
    .withIndex("by_band", (q) => q.eq("bandId", bandId))
    .collect();
}

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

    await assertBandPermissions(ctx, user._id, event.bandId, ["admin"]);

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
    await assertBandPermissions(ctx, user._id, event.bandId, ["admin"]);
    await deleteRsvpsByEvent(ctx, event._id);
    await ctx.db.delete(event._id);
  },
});

export const getFutureEventsByBand = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const membership = await assertBandPermissions(ctx, user._id, args.bandId);
    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new ConvexError("Band not found");
    }
    const events = await getFutureEvents(ctx, args.bandId);
    const eventsWithStatus = await Promise.all(
      events.map(async (event) => {
        const rsvp = await ctx.db
          .query("rsvps")
          .withIndex("by_user_event", (q) =>
            q.eq("userId", user._id).eq("eventId", event._id),
          )
          .unique();

        return {
          ...event,
          bandId: event.bandId,
          bandName: band.name,
          rsvpStatus: rsvp?.status || "pending",
          rsvpId: rsvp?._id,
          isAdmin: membership.role === "admin",
        };
      }),
    );

    return eventsWithStatus;
  },
});

export const getUserUpcomingEvents = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_user_time", (q) =>
        q.eq("userId", user._id).gt("startTime", Date.now()),
      )
      .collect();

    const eventsData = await Promise.all(
      rsvps.map(async (rsvp) => {
        const event = await ctx.db.get(rsvp.eventId);

        if (!event) return null;

        const band = await ctx.db.get(event.bandId);
        const membership = await ctx.db
          .query("memberships")
          .withIndex("by_user_band", (q) =>
            q.eq("userId", user._id).eq("bandId", event.bandId),
          )
          .unique();

        return {
          ...event,
          bandId: event.bandId,
          bandName: band?.name || "Couldn't find band",
          rsvpStatus: rsvp.status,
          rsvpId: rsvp._id,
          isAdmin: membership?.role === "admin",
        };
      }),
    );

    return eventsData.filter((e) => e !== null);
  },
});

// ADD PAGINATED QUERY FOR PAST EVENTS

export const getUserPastEvents = query({
  args: { count: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_user_time", (q) =>
        q.eq("userId", user._id).lt("startTime", Date.now()),
      )
      .order("desc")
      .take(args.count);

    const enrichedEvents = await Promise.all(
      rsvps.map(async (rsvp) => {
        const event = await ctx.db.get(rsvp.eventId);

        if (!event) return null;

        const band = await ctx.db.get(event.bandId);

        const membership = await ctx.db
          .query("memberships")
          .withIndex("by_user_band", (q) =>
            q.eq("userId", user._id).eq("bandId", event.bandId),
          )
          .unique();

        return {
          ...event,
          bandId: event.bandId,
          bandName: band?.name || "Couldn't find band",
          rsvpStatus: rsvp.status,
          rsvpId: rsvp._id,
          isAdmin: membership?.role === "admin",
        };
      }),
    );

    return {
      events: enrichedEvents.filter((e) => e !== null),
    };
  },
});

export const getEventAttendees = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const attendees = await Promise.all(
      rsvps.map(async (rsvp) => {
        const user = await ctx.db.get(rsvp.userId);
        return {
          userId: rsvp.userId,
          displayName: user?.displayName || "Unknown User",
          status: rsvp.status,
        };
      }),
    );

    return attendees;
  },
});
