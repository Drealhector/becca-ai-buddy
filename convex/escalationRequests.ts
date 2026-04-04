import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List escalation requests
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    return await ctx.db
      .query("escalation_requests")
      .order("desc")
      .take(limit);
  },
});

// Get by parent call ID
export const getByCallId = query({
  args: { parent_call_id: v.string() },
  handler: async (ctx, { parent_call_id }) => {
    return await ctx.db
      .query("escalation_requests")
      .withIndex("by_parent_call_id", (q) => q.eq("parent_call_id", parent_call_id))
      .first();
  },
});

// Create escalation
export const create = mutation({
  args: {
    parent_call_id: v.string(),
    control_url: v.string(),
    item_requested: v.optional(v.string()),
  },
  handler: async (ctx, fields) => {
    return await ctx.db.insert("escalation_requests", {
      ...fields,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  },
});

// Update escalation (human responds)
export const update = mutation({
  args: {
    id: v.id("escalation_requests"),
    status: v.optional(v.string()),
    human_response: v.optional(v.string()),
    escalation_call_id: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});
