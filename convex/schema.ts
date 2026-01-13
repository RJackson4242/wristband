import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const roles = v.union(
  v.literal("admin"),
  v.literal("member"),
  v.literal("invited")
);

const eventTypes = v.union(
  v.literal("practice"),
  v.literal("gig"),
  v.literal("meeting"),
  v.literal("recording"),
  v.literal("other")
);

const rsvpStatuses = v.union(
  v.literal("yes"),
  v.literal("no"),
  v.literal("maybe"),
  v.literal("pending")
);

export default defineSchema({
  user: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    tokenIdentifier: v.string(),
  })
    .index("byName", ["name"])
    .index("byEmail", ["email"])
    .index("byTokenIdentifier", ["tokenIdentifier"]),
    
  band: defineTable({
    name: v.string(),
  }),

  bandMember: defineTable({
    bandId: v.id("band"),
    userId: v.id("user"),
    role: roles,
  })
    .index("by_band", ["bandId"])
    .index("by_user", ["userId"])
    .index("by_user_band", ["userId", "bandId"]),

  event: defineTable({
    bandId: v.id("band"),
    name: v.string(),
    type: eventTypes,
    startTime: v.number(),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
  })
    .index("by_band_time", ["bandId", "startTime"]),

  rsvp: defineTable({
    userId: v.id("user"),
    eventId: v.id("event"),
    status: rsvpStatuses,
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_user_event", ["userId", "eventId"]),
});
