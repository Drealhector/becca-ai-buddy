import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List deals
export const list = query({
  args: { business_id: v.optional(v.id("business_keys")) },
  handler: async (ctx, { business_id }) => {
    if (business_id) {
      return await ctx.db
        .query("deals")
        .withIndex("by_business_id", (q) => q.eq("business_id", business_id))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("deals").order("desc").collect();
  },
});

// Get deals by lead
export const listByLead = query({
  args: { lead_id: v.id("leads") },
  handler: async (ctx, { lead_id }) => {
    return await ctx.db
      .query("deals")
      .withIndex("by_lead_id", (q) => q.eq("lead_id", lead_id))
      .collect();
  },
});

// Create deal
export const create = mutation({
  args: {
    business_id: v.optional(v.id("business_keys")),
    lead_id: v.optional(v.id("leads")),
    title: v.optional(v.string()),
    deal_value: v.optional(v.number()),
    stage: v.optional(v.string()),
    expected_close: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, fields) => {
    const now = new Date().toISOString();
    return await ctx.db.insert("deals", {
      ...fields,
      status: "active",
      created_at: now,
      updated_at: now,
    });
  },
});

// Update deal
export const update = mutation({
  args: {
    id: v.id("deals"),
    stage: v.optional(v.string()),
    deal_value: v.optional(v.number()),
    status: v.optional(v.string()),
    actual_close_date: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

// Revenue this month
export const revenueThisMonth = query({
  handler: async (ctx) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const closedDeals = await ctx.db
      .query("deals")
      .filter((q) => q.eq(q.field("stage"), "closed_won"))
      .collect();

    return closedDeals
      .filter((d) => d.actual_close_date && d.actual_close_date >= startOfMonth && d.actual_close_date <= endOfMonth)
      .reduce((sum, d) => sum + (d.deal_value ?? 0), 0);
  },
});

// Count closed deals this month
export const closedThisMonth = query({
  handler: async (ctx) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const closedDeals = await ctx.db
      .query("deals")
      .filter((q) => q.eq(q.field("stage"), "closed_won"))
      .collect();

    return closedDeals.filter((d) => d.actual_close_date && d.actual_close_date >= startOfMonth).length;
  },
});
