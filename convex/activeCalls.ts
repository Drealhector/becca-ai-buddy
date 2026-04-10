import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Store real caller phone at call start (called by dynamic_variables webhook)
export const store = mutation({
  args: {
    telnyx_call_id: v.string(),
    caller_phone: v.string(),
  },
  handler: async (ctx, { telnyx_call_id, caller_phone }) => {
    // Check if already stored (avoid duplicates)
    const existing = await ctx.db
      .query("active_calls")
      .withIndex("by_call_id", (q) => q.eq("telnyx_call_id", telnyx_call_id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { caller_phone });
      return existing._id;
    }
    return await ctx.db.insert("active_calls", {
      telnyx_call_id,
      caller_phone,
      created_at: new Date().toISOString(),
    });
  },
});

// Look up real caller phone by any Telnyx call identifier
export const getCallerPhone = query({
  args: {
    telnyx_call_id: v.string(),
  },
  handler: async (ctx, { telnyx_call_id }) => {
    const record = await ctx.db
      .query("active_calls")
      .withIndex("by_call_id", (q) => q.eq("telnyx_call_id", telnyx_call_id))
      .first();
    return record?.caller_phone ?? null;
  },
});

// Get the most recent active call's phone (fallback when call ID is unknown)
// Returns the phone from the most recent call started within the last 5 minutes
export const getMostRecentPhone = query({
  handler: async (ctx) => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const recent = await ctx.db
      .query("active_calls")
      .order("desc")
      .collect();
    // Find the most recent one that's within the last 5 minutes
    const active = recent.find((c) => c.created_at >= fiveMinAgo);
    return active?.caller_phone ?? null;
  },
});

// Cleanup old calls (optional, call periodically)
export const cleanup = mutation({
  handler: async (ctx) => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const old = await ctx.db
      .query("active_calls")
      .collect();
    let deleted = 0;
    for (const call of old) {
      if (call.created_at < oneDayAgo) {
        await ctx.db.delete(call._id);
        deleted++;
      }
    }
    return { deleted };
  },
});
