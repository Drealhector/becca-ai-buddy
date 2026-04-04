import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get customizations (optionally by business)
export const get = query({
  args: {
    business_id: v.optional(v.id("business_keys")),
  },
  handler: async (ctx, { business_id }) => {
    if (business_id) {
      return await ctx.db
        .query("customizations")
        .withIndex("by_business_id", (q) => q.eq("business_id", business_id))
        .first();
    }
    return await ctx.db.query("customizations").first();
  },
});

// Update customizations
export const update = mutation({
  args: {
    id: v.id("customizations"),
    business_name: v.optional(v.string()),
    business_description: v.optional(v.string()),
    business_industry: v.optional(v.string()),
    business_hours: v.optional(v.string()),
    tone: v.optional(v.string()),
    greeting: v.optional(v.string()),
    faqs: v.optional(v.any()),
    logo_url: v.optional(v.string()),
    chat_logo_url: v.optional(v.string()),
    background_image_url: v.optional(v.string()),
    hub_bg_desktop_url: v.optional(v.string()),
    hub_bg_phone_url: v.optional(v.string()),
    hub_bg_tablet_url: v.optional(v.string()),
    owner_phone: v.optional(v.string()),
    assistant_personality: v.optional(v.string()),
    key_services: v.optional(v.string()),
    target_audience: v.optional(v.string()),
    special_instructions: v.optional(v.string()),
    setup_strength: v.optional(v.string()),
    custom_voices: v.optional(v.any()),
    voices: v.optional(v.any()),
    instagram_username: v.optional(v.string()),
    facebook_username: v.optional(v.string()),
    telegram_username: v.optional(v.string()),
    whatsapp_username: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

// Create customizations
export const create = mutation({
  args: {
    business_id: v.optional(v.id("business_keys")),
    business_name: v.optional(v.string()),
    tone: v.optional(v.string()),
    greeting: v.optional(v.string()),
    owner_phone: v.optional(v.string()),
  },
  handler: async (ctx, fields) => {
    return await ctx.db.insert("customizations", {
      ...fields,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  },
});
