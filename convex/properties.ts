import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all properties
export const list = query({
  args: { business_id: v.optional(v.id("business_keys")) },
  handler: async (ctx, { business_id }) => {
    if (business_id) {
      return await ctx.db
        .query("properties")
        .withIndex("by_business_id", (q) => q.eq("business_id", business_id))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("properties").order("desc").collect();
  },
});

// Get by ID
export const getById = query({
  args: { id: v.id("properties") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

// Create property
export const create = mutation({
  args: {
    business_id: v.optional(v.id("business_keys")),
    title: v.optional(v.string()),
    property_type: v.optional(v.string()),
    listing_type: v.optional(v.string()),
    status: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    price_period: v.optional(v.string()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    sqft: v.optional(v.number()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    description: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.string())),
  },
  handler: async (ctx, fields) => {
    const now = new Date().toISOString();
    return await ctx.db.insert("properties", {
      ...fields,
      status: fields.status || "available",
      created_at: now,
      updated_at: now,
    });
  },
});

// Update property
export const update = mutation({
  args: {
    id: v.id("properties"),
    title: v.optional(v.string()),
    property_type: v.optional(v.string()),
    listing_type: v.optional(v.string()),
    status: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    price_period: v.optional(v.string()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    sqft: v.optional(v.number()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    description: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

// Delete property
export const remove = mutation({
  args: { id: v.id("properties") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
