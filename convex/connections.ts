import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get connections (optionally by business)
export const get = query({
  args: {
    business_id: v.optional(v.id("business_keys")),
  },
  handler: async (ctx, { business_id }) => {
    if (business_id) {
      return await ctx.db
        .query("connections")
        .withIndex("by_business_id", (q) => q.eq("business_id", business_id))
        .first();
    }
    return await ctx.db.query("connections").first();
  },
});

// Get connection status (safe for frontend — no raw tokens)
export const getStatus = query({
  args: {
    business_id: v.optional(v.id("business_keys")),
  },
  handler: async (ctx, { business_id }) => {
    const conn = business_id
      ? await ctx.db.query("connections").withIndex("by_business_id", (q) => q.eq("business_id", business_id)).first()
      : await ctx.db.query("connections").first();
    if (!conn) return null;
    return {
      _id: conn._id,
      phone_number: conn.phone_number,
      telnyx_phone_number: conn.telnyx_phone_number,
      whatsapp_connected: !!conn.whatsapp_access_token,
      whatsapp_phone_number_id: conn.whatsapp_phone_number_id,
      whatsapp_business_account_id: conn.whatsapp_business_account_id,
      instagram_connected: !!conn.instagram_access_token,
      instagram_page_id: conn.instagram_page_id,
      facebook_connected: !!conn.facebook_access_token,
      facebook_page_id: conn.facebook_page_id,
      telegram_connected: !!conn.telegram_bot_token,
      telegram_chat_id: conn.telegram_chat_id,
      telnyx_configured: !!conn.telnyx_api_key,
      telnyx_connection_id: conn.telnyx_connection_id,
      telnyx_sip_uri: conn.telnyx_sip_uri,
      telnyx_app_id: conn.telnyx_app_id,
    };
  },
});

// Update connections
export const update = mutation({
  args: {
    id: v.id("connections"),
    phone_number: v.optional(v.string()),
    whatsapp_n8n_webhook_url: v.optional(v.string()),
    instagram_n8n_webhook_url: v.optional(v.string()),
    facebook_n8n_webhook_url: v.optional(v.string()),
    telegram_n8n_webhook_url: v.optional(v.string()),
    // Channel tokens (per-business)
    whatsapp_access_token: v.optional(v.string()),
    whatsapp_phone_number_id: v.optional(v.string()),
    whatsapp_business_account_id: v.optional(v.string()),
    instagram_access_token: v.optional(v.string()),
    instagram_page_id: v.optional(v.string()),
    facebook_access_token: v.optional(v.string()),
    facebook_page_id: v.optional(v.string()),
    telegram_bot_token: v.optional(v.string()),
    telegram_chat_id: v.optional(v.string()),
    // Telnyx
    telnyx_api_key: v.optional(v.string()),
    telnyx_connection_id: v.optional(v.string()),
    telnyx_phone_number: v.optional(v.string()),
    telnyx_sip_uri: v.optional(v.string()),
    telnyx_app_id: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

// Create connections
export const create = mutation({
  args: {
    business_id: v.optional(v.id("business_keys")),
    phone_number: v.optional(v.string()),
    telnyx_api_key: v.optional(v.string()),
    telnyx_connection_id: v.optional(v.string()),
    telnyx_phone_number: v.optional(v.string()),
  },
  handler: async (ctx, fields) => {
    return await ctx.db.insert("connections", {
      ...fields,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  },
});

// Upsert connections (create if not exists, update if exists)
export const upsert = mutation({
  args: {
    business_id: v.optional(v.id("business_keys")),
    phone_number: v.optional(v.string()),
    whatsapp_n8n_webhook_url: v.optional(v.string()),
    instagram_n8n_webhook_url: v.optional(v.string()),
    facebook_n8n_webhook_url: v.optional(v.string()),
    telegram_n8n_webhook_url: v.optional(v.string()),
    // Channel tokens (per-business)
    whatsapp_access_token: v.optional(v.string()),
    whatsapp_phone_number_id: v.optional(v.string()),
    whatsapp_business_account_id: v.optional(v.string()),
    instagram_access_token: v.optional(v.string()),
    instagram_page_id: v.optional(v.string()),
    facebook_access_token: v.optional(v.string()),
    facebook_page_id: v.optional(v.string()),
    telegram_bot_token: v.optional(v.string()),
    telegram_chat_id: v.optional(v.string()),
    // Telnyx
    telnyx_api_key: v.optional(v.string()),
    telnyx_connection_id: v.optional(v.string()),
    telnyx_phone_number: v.optional(v.string()),
    telnyx_sip_uri: v.optional(v.string()),
    telnyx_app_id: v.optional(v.string()),
  },
  handler: async (ctx, fields) => {
    const existing = await ctx.db.query("connections").first();
    if (existing) {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) updates[key] = value;
      }
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }
    return await ctx.db.insert("connections", {
      ...fields,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  },
});
