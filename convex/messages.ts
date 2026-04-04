import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List messages for a conversation
export const listByConversation = query({
  args: {
    conversation_id: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { conversation_id, limit = 50 }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation_id", (q) => q.eq("conversation_id", conversation_id))
      .order("desc")
      .take(limit);
  },
});

// List messages by platform
export const listByPlatform = query({
  args: {
    platform: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { platform, limit = 50 }) => {
    return await ctx.db
      .query("messages")
      .order("desc")
      .filter((q) => q.eq(q.field("platform"), platform))
      .take(limit);
  },
});

// Create a message
export const create = mutation({
  args: {
    business_id: v.optional(v.id("business_keys")),
    conversation_id: v.optional(v.id("conversations")),
    content: v.optional(v.string()),
    role: v.optional(v.string()),
    sender_name: v.optional(v.string()),
    platform: v.optional(v.string()),
  },
  handler: async (ctx, fields) => {
    return await ctx.db.insert("messages", {
      ...fields,
      timestamp: new Date().toISOString(),
    });
  },
});
