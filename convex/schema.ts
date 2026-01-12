import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const roles = v.union(v.literal("admin"), v.literal("member"));
const eventTypes = v.union(
  v.literal("practice"),
  v.literal("gig"),
  v.literal("meeting"),
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
    }).index("byEmail", ["email"]).index("byName", ["name"]),

    band: defineTable({
        name: v.string(),
        inviteCode: v.optional(v.string()),
    }).index("byInviteCode", ["inviteCode"]),

    bandMember: defineTable({
        bandId: v.id("band"),
        userId: v.id("user"),
        role: roles,
    }).index("by_band", ["bandId"])
    .index("by_user", ["userId"])
    .index("by_user_band", ["userId", "bandId"]),

    event: defineTable({
        bandId: v.id("band"),
        name: v.string(),
        type: eventTypes,
        startTime: v.number(),
        location: v.optional(v.string()),
        description: v.optional(v.string()),
    }).index("byBand", ["bandId"]),

    rsvp: defineTable({
        eventId: v.id("event"),
        userId: v.id("user"),
        status: rsvpStatuses,
    }).index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_user_event", ["userId", "eventId"]),
})