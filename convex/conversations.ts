import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List conversations, optionally filtered by platform
export const list = query({
  args: {
    platform: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { platform, limit = 20 }) => {
    let convos;
    if (platform && platform !== "all") {
      convos = await ctx.db
        .query("conversations")
        .order("desc")
        .filter((q) => q.eq(q.field("platform"), platform))
        .take(limit);
    } else {
      convos = await ctx.db
        .query("conversations")
        .order("desc")
        .take(limit);
    }
    return convos;
  },
});

// Get a single conversation by ID
export const getById = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Create a conversation
export const create = mutation({
  args: {
    business_id: v.optional(v.id("business_keys")),
    platform: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, fields) => {
    return await ctx.db.insert("conversations", {
      ...fields,
      start_time: new Date().toISOString(),
    });
  },
});

// Update conversation (end time, summary)
export const update = mutation({
  args: {
    id: v.id("conversations"),
    end_time: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

// List conversations with their latest messages (for dashboard)
export const listWithMessages = query({
  args: {
    platform: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { platform, limit = 20 }) => {
    let convos;
    if (platform && platform !== "all") {
      convos = await ctx.db
        .query("conversations")
        .order("desc")
        .filter((q) => q.eq(q.field("platform"), platform))
        .take(limit);
    } else {
      convos = await ctx.db
        .query("conversations")
        .order("desc")
        .take(limit);
    }

    // Fetch messages for each conversation
    const results = await Promise.all(
      convos.map(async (convo) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation_id", (q) => q.eq("conversation_id", convo._id))
          .order("desc")
          .take(15);

        return {
          ...convo,
          messages: messages.reverse(), // oldest first for display
          latest_message_time: messages.length > 0
            ? messages[0].timestamp
            : convo.start_time,
        };
      })
    );

    // Sort by latest message time
    results.sort((a, b) => {
      const timeA = a.latest_message_time ? new Date(a.latest_message_time).getTime() : 0;
      const timeB = b.latest_message_time ? new Date(b.latest_message_time).getTime() : 0;
      return timeB - timeA;
    });

    return results;
  },
});
