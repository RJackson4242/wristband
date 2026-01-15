import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { retrieveCurrentUser } from "./users";

// Create band
export const cBand = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await retrieveCurrentUser(ctx);
    if (!user) throw new Error("You must be logged in to create a band");

    const bandId = await ctx.db.insert("band", { name: args.name });

    await ctx.db.insert("bandMember", {
      bandId,
      userId: user._id,
      role: "admin",
    });

    return "Band Created.";
  },
});

// Get band by id
export const rBand = query({
  args: { bandId: v.id("band") },
  handler: async (ctx, args) => {
    const user = await retrieveCurrentUser(ctx);
    if (!user) throw new Error("You must be logged in to view band pages.");

    const band = await ctx.db.get(args.bandId);
    if (!band) throw new Error("Band not found.");

    const membership = await ctx.db
      .query("bandMember")
      .withIndex("by_user_band", (q) =>
        q.eq("userId", user._id).eq("bandId", args.bandId)
      )
      .unique();
    if (!membership)
      throw new Error("You do not have permission to view this band.");

    return band;
  },
});

// Change band name
export const uBandName = mutation({
  args: { bandId: v.id("band"), name: v.string() },
  handler: async (ctx, args) => {
    const user = await retrieveCurrentUser(ctx);
    if (!user)
      throw new Error("You must be logged in to edit band information.");

    const band = await ctx.db.get(args.bandId);
    if (!band) throw new Error("Band not found.");

    const membership = await ctx.db
      .query("bandMember")
      .withIndex("by_user_band", (q) =>
        q.eq("userId", user._id).eq("bandId", args.bandId)
      )
      .unique();
    if (!membership || membership.role != "admin")
      throw new Error("You do not have permission to edit this band.");

    await ctx.db.patch(band._id, {
      name: args.name,
    });

    return "Band name updated.";
  },
});

// Delete band
export const dBand = mutation({
  args: { bandId: v.id("band") },
  handler: async (ctx, args) => {
    const user = await retrieveCurrentUser(ctx);
    if (!user)
      throw new Error("You must be logged in to edit band information.");

    const band = await ctx.db.get(args.bandId);
    if (!band) throw new Error("Band not found.");

    const userMembership = await ctx.db
      .query("bandMember")
      .withIndex("by_user_band", (q) =>
        q.eq("userId", user._id).eq("bandId", band._id)
      )
      .unique();
    if (!userMembership || userMembership.role != "admin")
      throw new Error("You do not have permission to delete this band.");

    const bandMemberships = await ctx.db
      .query("bandMember")
      .withIndex("by_band", (q) => q.eq("bandId", band._id))
      .collect();

    const events = await ctx.db
      .query("event")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .collect();

    const rsvpsToDelete: Promise<void>[] = [];

    for (const event of events) {
      const rsvps = await ctx.db
        .query("rsvp")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();

      for (const rsvp of rsvps) {
        rsvpsToDelete.push(ctx.db.delete(rsvp._id));
      }
    }

    await Promise.all([
      rsvpsToDelete,
      ...events.map((e) => ctx.db.delete(e._id)),
      ...bandMemberships.map((m) => ctx.db.delete(m._id)),
      ctx.db.delete(band._id),
    ]);

    return "Band deleted.";
  },
});
