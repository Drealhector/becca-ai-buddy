import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List call history
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 100 }) => {
    return await ctx.db
      .query("call_history")
      .order("desc")
      .take(limit);
  },
});

// Get a single call
export const getById = query({
  args: { id: v.id("call_history") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Create a call history record
export const create = mutation({
  args: {
    business_id: v.optional(v.id("business_keys")),
    conversation_id: v.optional(v.string()),
    type: v.optional(v.string()),
    number: v.optional(v.string()),
    topic: v.optional(v.string()),
    duration_minutes: v.optional(v.number()),
    recording_url: v.optional(v.string()),
  },
  handler: async (ctx, fields) => {
    return await ctx.db.insert("call_history", {
      ...fields,
      timestamp: new Date().toISOString(),
    });
  },
});

// Update call (duration, recording URL)
export const update = mutation({
  args: {
    id: v.id("call_history"),
    duration_minutes: v.optional(v.number()),
    recording_url: v.optional(v.string()),
    topic: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

// Delete a call
export const remove = mutation({
  args: { id: v.id("call_history") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
