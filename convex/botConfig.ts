import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get the bot config (single row)
export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("bot_config").first();
  },
});

// Update bot config
export const update = mutation({
  args: {
    id: v.id("bot_config"),
    bot_active: v.optional(v.boolean()),
    character: v.optional(v.string()),
    is_enabled: v.optional(v.boolean()),
    model: v.optional(v.string()),
    personality: v.optional(v.string()),
    system_prompt: v.optional(v.string()),
    tone: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

// Create bot config (if none exists)
export const create = mutation({
  args: {
    bot_active: v.optional(v.boolean()),
    character: v.optional(v.string()),
    is_enabled: v.optional(v.boolean()),
    model: v.optional(v.string()),
    personality: v.optional(v.string()),
    system_prompt: v.optional(v.string()),
    tone: v.optional(v.string()),
  },
  handler: async (ctx, fields) => {
    return await ctx.db.insert("bot_config", {
      ...fields,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  },
});
