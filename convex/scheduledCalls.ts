import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List scheduled calls by status
export const listPending = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("scheduled_calls")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .collect();
  },
});

// List all scheduled calls
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 50 }) => {
    return await ctx.db
      .query("scheduled_calls")
      .order("desc")
      .take(limit);
  },
});

// Create a scheduled call
export const create = mutation({
  args: {
    business_id: v.optional(v.id("business_keys")),
    phone_number: v.string(),
    purpose: v.string(),
    scheduled_at: v.string(),
  },
  handler: async (ctx, fields) => {
    return await ctx.db.insert("scheduled_calls", {
      ...fields,
      status: "pending",
      created_at: new Date().toISOString(),
    });
  },
});

// Update status
export const updateStatus = mutation({
  args: {
    id: v.id("scheduled_calls"),
    status: v.string(),
    executed_at: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, executed_at }) => {
    const updates: Record<string, any> = { status };
    if (executed_at) updates.executed_at = executed_at;
    await ctx.db.patch(id, updates);
  },
});

// Delete a scheduled call
export const remove = mutation({
  args: { id: v.id("scheduled_calls") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
