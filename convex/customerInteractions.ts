import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List interactions by business
export const listByBusiness = query({
  args: {
    business_id: v.optional(v.id("business_keys")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { business_id, limit = 50 }) => {
    if (business_id) {
      return await ctx.db
        .query("customer_interactions")
        .withIndex("by_business_id", (q) => q.eq("business_id", business_id))
        .order("desc")
        .take(limit);
    }
    return await ctx.db
      .query("customer_interactions")
      .order("desc")
      .take(limit);
  },
});

// Create an interaction record
export const create = mutation({
  args: {
    business_id: v.optional(v.id("business_keys")),
    assistant_id: v.string(),
    call_id: v.string(),
    duration: v.optional(v.number()),
    outcome: v.optional(v.string()),
    transcript: v.optional(v.string()),
  },
  handler: async (ctx, fields) => {
    return await ctx.db.insert("customer_interactions", {
      ...fields,
      timestamp: new Date().toISOString(),
    });
  },
});
