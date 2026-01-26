import { mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { assertBandPermissions, getCurrentUserOrThrow } from "./utils";
import { v } from "convex/values";

export async function createEventRsvps(
  ctx: MutationCtx,
  members: Doc<"memberships">[],
  eventId: Id<"events">,
) {
  await Promise.all(
    members.map((member) =>
      ctx.db.insert("rsvps", {
        userId: member.userId,
        eventId: eventId,
        status: "pending",
      }),
    ),
  );
}

export async function backfillRsvps(
  ctx: MutationCtx,
  userId: Id<"users">,
  events: Doc<"events">[],
) {
  if (events.length === 0) return;

  await Promise.all(
    events.map((event) =>
      ctx.db.insert("rsvps", {
        eventId: event._id,
        userId: userId,
        status: "pending",
      }),
    ),
  );
}

export async function getUserRsvps(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("rsvps")
    .withIndex("by_user_event", (q) => q.eq("userId", userId))
    .collect();
}

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

    const existingRsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId),
      )
      .unique();

    if (existingRsvp) {
      await ctx.db.patch(existingRsvp._id, { status: args.status });
      return "RSVP updated";
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    await assertBandPermissions(ctx, user._id, event.bandId);

    await ctx.db.insert("rsvps", {
      userId: user._id,
      eventId: args.eventId,
      status: args.status,
    });

    return "RSVP created";
  },
});

export async function resetRsvps(ctx: MutationCtx, eventId: Id<"events">) {
  const rsvps = await getEventRsvps(ctx, eventId);
  await Promise.all(
    rsvps.map((r) => ctx.db.patch(r._id, { status: "pending" })),
  );
}

export async function deleteRsvpsByUser(ctx: MutationCtx, userId: Id<"users">) {
  const rsvps = await getUserRsvps(ctx, userId);
  await Promise.all(rsvps.map((r) => ctx.db.delete(r._id)));
}

export async function deleteRsvpsByEvent(
  ctx: MutationCtx,
  eventId: Id<"events">,
) {
  const rsvps = await getEventRsvps(ctx, eventId);
  await Promise.all(rsvps.map((r) => ctx.db.delete(r._id)));
}
