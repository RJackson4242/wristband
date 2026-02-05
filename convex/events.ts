import { mutation, query, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getEventRsvps } from "./rsvps";
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
    const [user, band, members] = await Promise.all([
      getCurrentUserOrThrow(ctx),
      ctx.db.get(args.bandId),
      getMembershipsByBand(ctx, args.bandId),
    ]);

    if (!band) {
      throw new ConvexError("Band not found");
    }

    await assertBandPermissions(ctx, user._id, args.bandId, ["admin"]);

    const isFuture = args.startTime > Date.now();

    const eventId = await ctx.db.insert("events", {
      bandId: args.bandId,
      name: args.name,
      type: args.type,
      startTime: args.startTime,
      location: args.location,
      description: args.description,
      rsvpCount: isFuture ? members.length : 0,
      attendingCount: 0,
    });

    if (isFuture) {
      await Promise.all(
        members.map((member) =>
          ctx.db.insert("rsvps", {
            userId: member.userId,
            eventId: eventId,
            status: "pending",
            startTime: args.startTime,
          }),
        ),
      );
    }
  },
});

export async function getFutureEventsByBand(
  ctx: QueryCtx,
  bandId: Id<"bands">,
) {
  return (
    await ctx.db
      .query("events")
      .withIndex("by_band_time", (q) =>
        q.eq("bandId", bandId).gte("startTime", Date.now()),
      )
      .collect()
  ).sort((a, b) => a.startTime - b.startTime);
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
    const [user, event] = await Promise.all([
      getCurrentUserOrThrow(ctx),
      ctx.db.get(args.eventId),
    ]);

    if (!event) throw new ConvexError("Event not found");

    await assertBandPermissions(ctx, user._id, event.bandId, ["admin"]);

    const updates: Partial<Doc<"events">> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.type !== undefined) updates.type = args.type;
    if (args.location !== undefined) updates.location = args.location;
    if (args.description !== undefined) updates.description = args.description;

    const promises: Promise<void>[] = [];

    if (args.startTime !== undefined) {
      updates.startTime = args.startTime;

      if (args.startTime !== event.startTime && args.startTime > Date.now()) {
        updates.attendingCount = 0;

        promises.push(
          getEventRsvps(ctx, event._id).then(async (rsvps) => {
            await Promise.all(
              rsvps.map((r) => ctx.db.patch(r._id, { status: "pending" })),
            );
          }),
        );
      }
    }

    promises.push(ctx.db.patch(args.eventId, updates));
    await Promise.all(promises);
    return "Event updated";
  },
});

export const remove = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const [user, event] = await Promise.all([
      getCurrentUserOrThrow(ctx),
      ctx.db.get(args.eventId),
    ]);

    if (!event) throw new ConvexError("Event not found");

    await assertBandPermissions(ctx, user._id, event.bandId, ["admin"]);

    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    await Promise.all([
      ctx.db.delete(event._id),
      ...rsvps.map((r) => ctx.db.delete(r._id)),
    ]);
  },
});

export const getBandFutureEvents = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const [membership, events] = await Promise.all([
      assertBandPermissions(ctx, user._id, args.bandId),
      getFutureEventsByBand(ctx, args.bandId),
    ]);

    const isAdmin = membership.role === "admin";
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
          bandId: args.bandId,
          rsvpStatus: rsvp?.status,
          rsvpId: rsvp?._id,
          isAdmin,
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

        const [band, membership] = await Promise.all([
          ctx.db.get(event.bandId),
          ctx.db
            .query("memberships")
            .withIndex("by_user_band", (q) =>
              q.eq("userId", user._id).eq("bandId", event.bandId),
            )
            .unique(),
        ]);

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

        const [band, membership] = await Promise.all([
          ctx.db.get(event.bandId),
          ctx.db
            .query("memberships")
            .withIndex("by_user_band", (q) =>
              q.eq("userId", user._id).eq("bandId", event.bandId),
            )
            .unique(),
        ]);

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

    return enrichedEvents.filter((e) => e !== null);
  },
});

export const getBandPastEvents = query({
  args: {
    bandId: v.id("bands"),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const membership = await assertBandPermissions(ctx, user._id, args.bandId);

    const events = await ctx.db
      .query("events")
      .withIndex("by_band_time", (q) =>
        q.eq("bandId", args.bandId).lt("startTime", Date.now()),
      )
      .order("desc")
      .take(args.count);

    const isAdmin = membership.role === "admin";

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
          bandId: args.bandId,
          rsvpStatus: rsvp?.status,
          rsvpId: rsvp?._id,
          isAdmin,
        };
      }),
    );

    return eventsWithStatus;
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
