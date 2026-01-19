import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const bandRoles = v.union(
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
  users: defineTable({
    username: v.string(),
    displayName: v.string(),
    tokenIdentifier: v.string(),
  })
    .index("by_name", ["username"])
    .index("by_token", ["tokenIdentifier"]),

  bands: defineTable({
    name: v.string(),
  }),

  memberships: defineTable({
    bandId: v.id("bands"),
    userId: v.id("users"),
    role: bandRoles,
  })
    .index("by_band", ["bandId"])
    .index("by_user", ["userId"])
    .index("by_user_band", ["userId", "bandId"]),

  events: defineTable({
    bandId: v.id("bands"),
    name: v.string(),
    type: eventTypes,
    startTime: v.number(),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
  })
    .index("by_band", ["bandId"])
    .index("by_band_time", ["bandId", "startTime"]),

  rsvps: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    status: rsvpStatuses,
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_user_event", ["userId", "eventId"]),
});
