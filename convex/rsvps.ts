import { MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export async function backfillRsvps(
  ctx: MutationCtx,
  userId: Id<"users">,
  events: Doc<"events">[]
) {
  if (events.length === 0) return;

  await Promise.all(
    events.map((event) =>
      ctx.db.insert("rsvps", {
        eventId: event._id,
        userId: userId,
        status: "pending", // Ensure schema allows "pending"
      })
    )
  );
}

export async function deleteRsvpsByUser(ctx: MutationCtx, userId: Id<"users">) {
  const rsvps = await ctx.db
    .query("rsvps")
    .withIndex("by_user_event", (q) => q.eq("userId", userId))
    .collect();

  for (const rsvp of rsvps) {
    await ctx.db.delete(rsvp._id);
  }
}

export async function deleteRsvpsByEvent(
  ctx: MutationCtx,
  eventId: Id<"events">
) {
  const rsvps = await ctx.db
    .query("rsvps")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  for (const rsvp of rsvps) {
    await ctx.db.delete(rsvp._id);
  }
}
