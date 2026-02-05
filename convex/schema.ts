import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const bandRoles = v.union(
  v.literal("admin"),
  v.literal("member"),
  v.literal("invited"),
);

const eventTypes = v.union(
  v.literal("rehearsal"),
  v.literal("gig"),
  v.literal("meeting"),
  v.literal("recording"),
  v.literal("other"),
);

const rsvpStatuses = v.union(
  v.literal("yes"),
  v.literal("no"),
  v.literal("maybe"),
  v.literal("pending"),
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
    memberCount: v.number(),
  }),

  memberships: defineTable({
    bandId: v.id("bands"),
    userId: v.id("users"),
    role: bandRoles,
    invitedBy: v.optional(v.id("users")),
  })
    .index("by_band", ["bandId"])
    .index("by_user", ["userId"])
    .index("by_user_band", ["userId", "bandId"])
    .index("by_user_role", ["userId", "role"])
    .index("by_band_role", ["bandId", "role"]),

  events: defineTable({
    bandId: v.id("bands"),
    name: v.optional(v.string()),
    type: eventTypes,
    startTime: v.number(),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    rsvpCount: v.number(),
    attendingCount: v.number(),
  })
    .index("by_band", ["bandId"])
    .index("by_band_time", ["bandId", "startTime"]),

  rsvps: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    status: rsvpStatuses,
    startTime: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_user_event", ["userId", "eventId"])
    .index("by_user_time", ["userId", "startTime"]),
});
