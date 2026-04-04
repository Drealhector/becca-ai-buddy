import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get the bot personality (single row)
export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("bot_personality").first();
  },
});

// Update personality text
export const update = mutation({
  args: {
    id: v.id("bot_personality"),
    personality_text: v.string(),
  },
  handler: async (ctx, { id, personality_text }) => {
    await ctx.db.patch(id, {
      personality_text,
      updated_at: new Date().toISOString(),
    });
  },
});

// Create personality (if none exists)
export const create = mutation({
  args: {
    personality_text: v.string(),
  },
  handler: async (ctx, { personality_text }) => {
    return await ctx.db.insert("bot_personality", {
      personality_text,
      updated_at: new Date().toISOString(),
    });
  },
});
