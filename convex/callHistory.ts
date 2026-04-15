import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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

// Call stats for analytics
export const stats = query({
  handler: async (ctx) => {
    const calls = await ctx.db.query("call_history").collect();
    let totalCalls = calls.length;
    let incoming = 0;
    let outgoing = 0;
    let totalDuration = 0;
    for (const c of calls) {
      if (c.type === "incoming") incoming++;
      else outgoing++;
      totalDuration += c.duration_minutes || 0;
    }
    return {
      totalCalls,
      incoming,
      outgoing,
      avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls * 10) / 10 : 0,
      totalDuration: Math.round(totalDuration * 10) / 10,
    };
  },
});

// Fetch a FRESH recording URL from Telnyx (the stored ones expire after 10 min)
export const getFreshRecordingUrl = action({
  args: {
    call_session_id: v.optional(v.string()),
    call_leg_id: v.optional(v.string()),
    conversation_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const telnyxKey = process.env.TELNYX_API_KEY;
    if (!telnyxKey) return { url: null, error: "TELNYX_API_KEY not set" };

    try {
      // Fetch recent recordings from Telnyx
      const response = await fetch(
        "https://api.telnyx.com/v2/recordings?page%5Bsize%5D=100",
        { headers: { Authorization: `Bearer ${telnyxKey}` } }
      );
      if (!response.ok) return { url: null, error: `Telnyx API: ${response.status}` };

      const { data: recordings } = await response.json();

      // Find matching recording by session_id or leg_id
      for (const rec of recordings) {
        const url = rec.download_urls?.wav || rec.download_urls?.mp3;
        if (!url) continue;

        if (args.call_session_id && rec.call_session_id === args.call_session_id) {
          return { url };
        }
        if (args.call_leg_id && rec.call_leg_id === args.call_leg_id) {
          return { url };
        }
      }

      // If no session/leg match, try matching by conversation metadata
      if (args.conversation_id) {
        // Fetch the conversation to get its call_session_id
        const convRes = await fetch(
          `https://api.telnyx.com/v2/ai/conversations/${args.conversation_id}`,
          { headers: { Authorization: `Bearer ${telnyxKey}`, "Content-Type": "application/json" } }
        );
        if (convRes.ok) {
          const convData = await convRes.json();
          const conv = convData.data || convData;
          const sessionId = conv.metadata?.call_session_id;
          const legId = conv.metadata?.call_leg_id;

          for (const rec of recordings) {
            const url = rec.download_urls?.wav || rec.download_urls?.mp3;
            if (!url) continue;
            if (sessionId && rec.call_session_id === sessionId) return { url };
            if (legId && rec.call_leg_id === legId) return { url };
          }
        }
      }

      return { url: null, error: "Recording not found" };
    } catch (error) {
      console.error("Error fetching fresh recording URL:", error);
      return { url: null, error: "Failed to fetch recording" };
    }
  },
});

// Delete a call
export const remove = mutation({
  args: { id: v.id("call_history") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
