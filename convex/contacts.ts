import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all contacts
export const list = query({
  args: { business_id: v.optional(v.id("business_keys")) },
  handler: async (ctx, { business_id }) => {
    if (business_id) {
      return await ctx.db
        .query("contacts")
        .withIndex("by_business_id", (q) => q.eq("business_id", business_id))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("contacts").order("desc").collect();
  },
});

// Get contact by ID
export const getById = query({
  args: { id: v.id("contacts") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

// Get contact by phone
export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    return await ctx.db
      .query("contacts")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
  },
});

// Create contact
export const create = mutation({
  args: {
    business_id: v.optional(v.id("business_keys")),
    full_name: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    source: v.optional(v.string()),
    temperature: v.optional(v.string()),
    lead_score: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, fields) => {
    const now = new Date().toISOString();
    return await ctx.db.insert("contacts", {
      ...fields,
      full_name: fields.full_name || fields.name,
      temperature: fields.temperature || "warm",
      lead_score: fields.lead_score ?? 50,
      active_leads_count: 0,
      last_contact_date: now,
      created_at: now,
      updated_at: now,
    });
  },
});

// Update contact
export const update = mutation({
  args: {
    id: v.id("contacts"),
    full_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    temperature: v.optional(v.string()),
    lead_score: v.optional(v.number()),
    budget_min: v.optional(v.number()),
    budget_max: v.optional(v.number()),
    preferred_locations: v.optional(v.array(v.string())),
    property_type_interests: v.optional(v.array(v.string())),
    memory_summary: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

// Count contacts (for analytics)
export const count = query({
  args: { temperature: v.optional(v.string()) },
  handler: async (ctx, { temperature }) => {
    const all = await ctx.db.query("contacts").collect();
    if (temperature) {
      return all.filter((c) => c.lead_temperature === temperature || c.temperature === temperature).length;
    }
    return all.length;
  },
});
