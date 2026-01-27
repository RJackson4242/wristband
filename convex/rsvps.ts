import { mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";
import { assertBandPermissions } from "./memberships";
import { getFutureEvents } from "./events";

export async function createEventRsvps(
  ctx: MutationCtx,
  members: Doc<"memberships">[],
  eventId: Id<"events">,
) {
  const event = await ctx.db.get(eventId);
  if (!event) throw new ConvexError("Event not found");

  await Promise.all(
    members.map((member) =>
      ctx.db.insert("rsvps", {
        userId: member.userId,
        eventId: eventId,
        status: "pending",
        startTime: event.startTime,
      }),
    ),
  );

  await ctx.db.patch(eventId, {
    rsvpCount: event.rsvpCount + members.length,
  });
}

export async function backfillRsvps(
  ctx: MutationCtx,
  userId: Id<"users">,
  bandId: Id<"bands">,
) {
  const events = await getFutureEvents(ctx, bandId);

  await Promise.all(
    events.map(async (event) => {
      await ctx.db.insert("rsvps", {
        eventId: event._id,
        userId: userId,
        status: "pending",
        startTime: event.startTime,
      });
      await ctx.db.patch(event._id, {
        rsvpCount: event.rsvpCount + 1,
      });
    }),
  );
}

// Avoids later duplication
export async function getEventRsvps(ctx: QueryCtx, eventId: Id<"events">) {
  return await ctx.db
    .query("rsvps")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();
}

export const updateStatus = mutation({
  args: {
    eventId: v.id("events"),
    status: v.union(
      v.literal("yes"),
      v.literal("no"),
      v.literal("maybe"),
      v.literal("pending"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const existingRsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId),
      )
      .unique();

    const isAttending = args.status === "yes";

    if (existingRsvp) {
      const wasAttending = existingRsvp.status === "yes";

      let attendingDelta = 0;
      if (!wasAttending && isAttending) attendingDelta = 1;
      else if (wasAttending && !isAttending) attendingDelta = -1;

      if (attendingDelta !== 0) {
        await ctx.db.patch(event._id, {
          attendingCount: event.attendingCount + attendingDelta,
        });
      }

      await ctx.db.patch(existingRsvp._id, { status: args.status });
      return "RSVP updated";
    }

    await assertBandPermissions(ctx, user._id, event.bandId);

    await ctx.db.patch(event._id, {
      rsvpCount: event.rsvpCount + 1,
      attendingCount: isAttending
        ? event.attendingCount + 1
        : event.attendingCount,
    });

    await ctx.db.insert("rsvps", {
      userId: user._id,
      eventId: args.eventId,
      status: args.status,
      startTime: event.startTime,
    });

    return "RSVP created";
  },
});

// Called when event time is changed
export async function resetRsvps(ctx: MutationCtx, eventId: Id<"events">) {
  const rsvps = await getEventRsvps(ctx, eventId);
  await Promise.all(
    rsvps.map((r) => ctx.db.patch(r._id, { status: "pending" })),
  );

  await ctx.db.patch(eventId, {
    attendingCount: 0,
  });
}

// Called when a user is deleted
export async function deleteRsvpsByUser(ctx: MutationCtx, userId: Id<"users">) {
  const rsvps = await ctx.db
    .query("rsvps")
    .withIndex("by_user_event", (q) => q.eq("userId", userId))
    .collect();

  await Promise.all(
    rsvps.map(async (r) => {
      const event = await ctx.db.get(r.eventId);

      if (event) {
        await ctx.db.patch(event._id, {
          rsvpCount: Math.max(0, event.rsvpCount - 1),
          attendingCount:
            r.status === "yes"
              ? Math.max(0, event.attendingCount - 1)
              : event.attendingCount,
        });
      }

      return ctx.db.delete(r._id);
    }),
  );
}

// Called when an event is deleted
export async function deleteRsvpsByEvent(
  ctx: MutationCtx,
  eventId: Id<"events">,
) {
  const rsvps = await getEventRsvps(ctx, eventId);
  await Promise.all(rsvps.map((r) => ctx.db.delete(r._id)));
}
