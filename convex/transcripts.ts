import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List transcripts
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 100 }) => {
    return await ctx.db
      .query("transcripts")
      .order("desc")
      .take(limit);
  },
});

// Get transcript by conversation ID
export const getByConversationId = query({
  args: { conversation_id: v.string() },
  handler: async (ctx, { conversation_id }) => {
    return await ctx.db
      .query("transcripts")
      .withIndex("by_conversation_id", (q) => q.eq("conversation_id", conversation_id))
      .first();
  },
});

// Create a transcript
export const create = mutation({
  args: {
    business_id: v.optional(v.id("business_keys")),
    conversation_id: v.optional(v.string()),
    transcript_text: v.optional(v.string()),
    caller_info: v.optional(v.string()),
    sales_flagged: v.optional(v.boolean()),
  },
  handler: async (ctx, fields) => {
    return await ctx.db.insert("transcripts", {
      ...fields,
      timestamp: new Date().toISOString(),
    });
  },
});

// Update transcript text
export const update = mutation({
  args: {
    id: v.id("transcripts"),
    transcript_text: v.optional(v.string()),
    sales_flagged: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});
