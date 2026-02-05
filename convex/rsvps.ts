import { mutation, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";
import { assertBandPermissions } from "./memberships";

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

    const [event, existingRsvp] = await Promise.all([
      ctx.db.get(args.eventId),
      ctx.db
        .query("rsvps")
        .withIndex("by_user_event", (q) =>
          q.eq("userId", user._id).eq("eventId", args.eventId),
        )
        .unique(),
    ]);

    if (!event) throw new Error("Event not found");

    const isAttending = args.status === "yes";
    const writes: Promise<void | Id<"rsvps">>[] = [];

    if (existingRsvp) {
      const wasAttending = existingRsvp.status === "yes";

      if (wasAttending !== isAttending) {
        writes.push(
          ctx.db.patch(event._id, {
            attendingCount: event.attendingCount + (isAttending ? 1 : -1),
          }),
        );
      }

      writes.push(ctx.db.patch(existingRsvp._id, { status: args.status }));
    } else {
      await assertBandPermissions(ctx, user._id, event.bandId);

      writes.push(
        ctx.db.patch(event._id, {
          rsvpCount: event.rsvpCount + 1,
          attendingCount: isAttending
            ? event.attendingCount + 1
            : event.attendingCount,
        }),
      );

      writes.push(
        ctx.db.insert("rsvps", {
          userId: user._id,
          eventId: args.eventId,
          status: args.status,
          startTime: event.startTime,
        }),
      );
    }

    await Promise.all(writes);

    return existingRsvp ? "RSVP updated" : "RSVP created";
  },
});
