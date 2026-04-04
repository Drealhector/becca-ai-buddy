import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { business_id: v.optional(v.id("business_keys")) },
  handler: async (ctx, { business_id }) => {
    if (business_id) {
      return await ctx.db
        .query("products")
        .withIndex("by_business_id", (q) => q.eq("business_id", business_id))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("products").order("desc").collect();
  },
});

export const getBySlug = query({
  args: { link_slug: v.string() },
  handler: async (ctx, { link_slug }) => {
    return await ctx.db
      .query("products")
      .withIndex("by_link_slug", (q) => q.eq("link_slug", link_slug))
      .first();
  },
});
