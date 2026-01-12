import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { Id } from "./_generated/dataModel";

type BandData = { 
  name: string; 
  _id: Id<"band"> 
};

export const createBand = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUser(ctx);

    // Confirm user is logged in
    if (!user) {
      throw new Error("You must be logged in to create a band");
    }

    // Create the band
    const bandId = await ctx.db.insert("band", {
      name: args.name,
    });

    // Link user to the band
    await ctx.db.insert("bandMember", {
      bandId,
      userId: user._id,
      role: "admin",
    });

    return bandId;
  },
});

export const getUserBands = query({
  args: {},
  handler: async (ctx) => {
    // Get current user
    const user = await getCurrentUser(ctx);

    // Confirm user is logged in
    if (!user) {
      return [];
    }

    // Get band memberships
    const memberships = await ctx.db
      .query("bandMember")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get band details
    const bands = await Promise.all(
      memberships.map(async (membership) => {
        const band = await ctx.db.get(membership.bandId);

        // Band missing (deleted?)
        if (!band) return null;

        return { 
          name: band.name,
          _id: band._id 
        };
      })
    );

    // Filter nulls
    return bands.filter((b): b is BandData => b !== null);
  },
});
