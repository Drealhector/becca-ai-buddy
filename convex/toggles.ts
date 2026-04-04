import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get toggles (optionally by business)
export const get = query({
  args: {
    business_id: v.optional(v.id("business_keys")),
  },
  handler: async (ctx, { business_id }) => {
    if (business_id) {
      return await ctx.db
        .query("toggles")
        .withIndex("by_business_id", (q) => q.eq("business_id", business_id))
        .first();
    }
    return await ctx.db.query("toggles").first();
  },
});

// Update toggles
export const update = mutation({
  args: {
    id: v.id("toggles"),
    master_switch: v.optional(v.boolean()),
    whatsapp_on: v.optional(v.boolean()),
    instagram_on: v.optional(v.boolean()),
    facebook_on: v.optional(v.boolean()),
    telegram_on: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

// Create toggles
export const create = mutation({
  args: {
    business_id: v.optional(v.id("business_keys")),
    master_switch: v.optional(v.boolean()),
    whatsapp_on: v.optional(v.boolean()),
    instagram_on: v.optional(v.boolean()),
    facebook_on: v.optional(v.boolean()),
    telegram_on: v.optional(v.boolean()),
  },
  handler: async (ctx, fields) => {
    return await ctx.db.insert("toggles", {
      ...fields,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  },
});

// Check if master switch or a specific channel is on (for edge functions/webhooks)
export const checkToggle = query({
  args: {
    channel: v.optional(v.string()),
  },
  handler: async (ctx, { channel }) => {
    const toggles = await ctx.db.query("toggles").first();
    if (!toggles) return { master: false, channel: false };

    const master = toggles.master_switch ?? false;
    if (!channel) return { master, channel: master };

    const channelMap: Record<string, boolean | null | undefined> = {
      whatsapp: toggles.whatsapp_on,
      instagram: toggles.instagram_on,
      facebook: toggles.facebook_on,
      telegram: toggles.telegram_on,
    };

    return {
      master,
      channel: master && (channelMap[channel] ?? false),
    };
  },
});
