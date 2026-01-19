import { Id } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("Can't get current user");
  return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userByToken(ctx, identity.subject);
}

export async function userByToken(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", externalId))
    .unique();
}

export async function assertBandPermissions(
  ctx: QueryCtx,
  userId: Id<"users">,
  bandId: Id<"bands">,
  requireAdmin: boolean = false
) {
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_band", (q) =>
      q.eq("userId", userId).eq("bandId", bandId)
    )
    .unique();

  if (!membership) {
    throw new Error("You are not a member of this band.");
  }

  if (requireAdmin && membership.role !== "admin") {
    throw new Error("You do not have permission to perform this action.");
  }

  return membership;
}
