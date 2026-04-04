import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Authenticate business by key + name (replaces Supabase query in BusinessAuth.tsx)
export const authenticate = query({
  args: {
    business_name: v.string(),
    business_key: v.string(),
  },
  handler: async (ctx, { business_name, business_key }) => {
    const business = await ctx.db
      .query("business_keys")
      .withIndex("by_key_and_name", (q) =>
        q.eq("business_key", business_key).eq("business_name", business_name)
      )
      .first();

    if (!business || !business.is_active) {
      return null;
    }

    return {
      _id: business._id,
      business_name: business.business_name,
      business_key: business.business_key,
      is_active: business.is_active,
    };
  },
});

// Get business by ID
export const getById = query({
  args: { id: v.id("business_keys") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Get business by key
export const getByKey = query({
  args: { business_key: v.string() },
  handler: async (ctx, { business_key }) => {
    return await ctx.db
      .query("business_keys")
      .withIndex("by_business_key", (q) => q.eq("business_key", business_key))
      .first();
  },
});

// Create a new business key
export const create = mutation({
  args: {
    business_key: v.string(),
    business_name: v.string(),
  },
  handler: async (ctx, { business_key, business_name }) => {
    return await ctx.db.insert("business_keys", {
      business_key,
      business_name,
      is_active: true,
      created_at: new Date().toISOString(),
    });
  },
});

// Deactivate a business key
export const deactivate = mutation({
  args: { id: v.id("business_keys") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { is_active: false });
  },
});
