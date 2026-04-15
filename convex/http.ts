import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * CHANNEL HTTP ENDPOINTS
 *
 * These replace all n8n webhooks. Each channel has ONE endpoint.
 * Tokens are read from the connections table (per-business) for SaaS multi-tenancy.
 * For now (single tenant), we also fall back to env vars.
 *
 * Endpoints:
 * POST /whatsapp    - WhatsApp Business API webhook
 * GET  /whatsapp    - WhatsApp webhook verification
 * POST /instagram   - Instagram + Facebook Messenger webhook
 * GET  /instagram   - Instagram/FB webhook verification
 * POST /telegram    - Telegram Bot webhook
 * POST /web-chat    - Web chat from frontend
 */

// Helper: get connections (first record for now, will be per-business later)
async function getConnections(ctx: any) {
  return await ctx.runQuery(api.connections.get, {});
}

// ─── SECURITY HELPERS ────────────────────────────────────────

// CORS: restrict to configured origins (comma-separated in env)
function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const allowed = (process.env.ALLOWED_ORIGIN || "http://localhost:5173").split(",").map(o => o.trim());
  const origin = (requestOrigin && allowed.includes(requestOrigin)) ? requestOrigin : allowed[0];
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Dashboard auth: validate Bearer token against business_keys
async function validateDashboardAuth(ctx: any, request: Request): Promise<boolean> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  if (!token) return false;
  const business = await ctx.runQuery(api.businessKeys.getByKey, { business_key: token });
  return !!(business && business.is_active);
}

// Unauthorized response helper
function unauthorizedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Unauthorized" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Meta webhook signature verification (HMAC-SHA256)
async function verifyMetaSignature(request: Request, rawBody: string): Promise<boolean> {
  const signature = request.headers.get("X-Hub-Signature-256");
  if (!signature) return false;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) return false;

  const expectedSig = signature.replace("sha256=", "");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const hexSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hexSig === expectedSig;
}

// Telnyx tool endpoint secret validation
function validateTelnyxToolSecret(request: Request): boolean {
  const secret = process.env.TELNYX_TOOL_SECRET;
  if (!secret) return true; // skip if not configured yet
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

// ─── WEBHOOK VERIFICATION (Meta requires this for WhatsApp + Instagram) ──
const verifyWebhook = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
  if (!VERIFY_TOKEN) {
    console.error("META_VERIFY_TOKEN env var not set");
    return new Response("Server misconfigured", { status: 500 });
  }

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
});

// ─── WHATSAPP WEBHOOK ────────────────────────────────────────
const whatsappWebhook = httpAction(async (ctx, request) => {
  try {
    // Verify Meta webhook signature
    const rawBody = await request.text();
    if (process.env.FACEBOOK_APP_SECRET) {
      const isValid = await verifyMetaSignature(request, rawBody);
      if (!isValid) {
        console.error("WhatsApp webhook signature verification failed");
        return new Response("Forbidden", { status: 403 });
      }
    }
    const body = JSON.parse(rawBody);
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message || !message.text?.body) {
      return new Response("OK", { status: 200 });
    }

    // Check toggle
    const toggleStatus = await ctx.runQuery(api.toggles.checkToggle, { channel: "whatsapp" });
    if (!toggleStatus.channel) {
      return new Response("OK", { status: 200 });
    }

    const phoneNumber = message.from;
    const userMessage = message.text.body;
    const senderName = body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name || null;

    // Generate AI response
    const aiResponse = await ctx.runAction(api.ai.generateResponse, {
      user_message: userMessage,
      platform: "whatsapp",
      phone_number: phoneNumber,
      sender_name: senderName,
    });

    // Get tokens from connections table (SaaS: per-business)
    const conn = await getConnections(ctx);
    const accessToken = conn?.whatsapp_access_token || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = conn?.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (accessToken && phoneNumberId) {
      await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phoneNumber,
          text: { body: aiResponse },
        }),
      });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return new Response("OK", { status: 200 });
  }
});

// ─── TELNYX WHATSAPP WEBHOOK ────────────────────────────────
// Receives WhatsApp messages via Telnyx's webhook system (separate from Meta's direct API above).
// Telnyx uses ED25519 signatures — skipping verification for now (can add later).
const telnyxWhatsAppWebhook = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();

    // Debug: log the raw payload to understand the format
    console.log("WhatsApp webhook payload:", JSON.stringify(body).substring(0, 500));

    // Telnyx WhatsApp may wrap in different formats — try all known structures
    // Format 1: Direct Meta format { messages: [...], messaging_product: "whatsapp" }
    // Format 2: Telnyx envelope { data: { event_type: "...", payload: { ... } } }
    // Format 3: Meta nested { entry: [{ changes: [{ value: { messages: [...] } }] }] }
    let message = body.messages?.[0];
    let contacts = body.contacts;

    if (!message && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      // Meta nested format
      const value = body.entry[0].changes[0].value;
      message = value.messages[0];
      contacts = value.contacts;
    }

    if (!message && body.data?.payload?.messages?.[0]) {
      // Telnyx envelope format
      message = body.data.payload.messages[0];
      contacts = body.data.payload.contacts;
    }

    if (!message) {
      console.log("WhatsApp webhook: no message found in payload, skipping");
      return new Response("OK", { status: 200 });
    }

    const phoneNumber = message.from; // e.g. "2347042208155"
    const senderName = contacts?.[0]?.profile?.name || body.contacts?.[0]?.profile?.name || null;
    const messageType = message.type; // "text", "image", "audio", "document", etc.

    // Normalize phone number to E.164 format
    const normalizedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;

    // Extract text content
    let userMessage = "";
    if (messageType === "text") {
      userMessage = message.text?.body || "";
    } else if (messageType === "image") {
      userMessage = message.image?.caption || "Sent an image";
    } else if (messageType === "audio") {
      userMessage = "Sent a voice note";
    } else if (messageType === "document") {
      userMessage = message.document?.caption || "Sent a document";
    } else if (messageType === "location") {
      userMessage = `Shared location: ${message.location?.name || ""} (${message.location?.latitude}, ${message.location?.longitude})`;
    } else {
      userMessage = `Sent a ${messageType} message`;
    }

    if (!phoneNumber || !userMessage) {
      return new Response("OK", { status: 200 });
    }

    // Check toggle
    const toggleStatus = await ctx.runQuery(api.toggles.checkToggle, { channel: "whatsapp" });
    if (!toggleStatus.channel) {
      return new Response("OK", { status: 200 });
    }

    // Handle images — download via Meta Cloud API through Telnyx
    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;
    const telnyxApiKey = process.env.TELNYX_API_KEY;

    if (messageType === "image" && message.image?.id && telnyxApiKey) {
      try {
        // Get media URL from Telnyx/Meta
        const mediaRes = await fetch(`https://api.telnyx.com/v2/whatsapp/media/${message.image.id}`, {
          headers: { Authorization: `Bearer ${telnyxApiKey}` },
        });
        if (mediaRes.ok) {
          const mediaData = await mediaRes.json();
          const mediaUrl = mediaData.data?.url || mediaData.url;
          if (mediaUrl) {
            const imgRes = await fetch(mediaUrl, {
              headers: { Authorization: `Bearer ${telnyxApiKey}` },
            });
            if (imgRes.ok) {
              const arrayBuf = await imgRes.arrayBuffer();
              const bytes = new Uint8Array(arrayBuf);
              let binary = "";
              for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
              imageBase64 = btoa(binary);
              imageMimeType = message.image.mime_type || "image/jpeg";
            }
          }
        }
      } catch (imgErr) {
        console.error("WhatsApp image download error:", imgErr);
      }
    }

    const messageForAI = imageBase64
      ? (userMessage === "Sent an image" ? "The customer sent an image. Describe what you see and respond helpfully." : userMessage)
      : userMessage;

    // Generate AI response
    const aiResponse = await ctx.runAction(api.ai.generateResponse, {
      user_message: messageForAI,
      platform: "whatsapp",
      phone_number: normalizedPhone,
      sender_name: senderName || undefined,
      ...(imageBase64 ? { image_base64: imageBase64, image_mime_type: imageMimeType } : {}),
    });

    // Reply via Telnyx WhatsApp API
    // Try multiple send approaches — embedded signup numbers may need different endpoints
    const phoneNumberId = body.data?.payload?.metadata?.phone_number_id
      || body.metadata?.phone_number_id;
    const envPhone = process.env.TELNYX_WHATSAPP_NUMBER || "+15559051085";
    const recipientPhone = phoneNumber.replace(/^\+/, ""); // Meta format: no +
    console.log("WhatsApp replying to:", recipientPhone, "via phone_number_id:", phoneNumberId);

    if (telnyxApiKey && aiResponse) {
      let sent = false;

      // Approach 1: Meta Cloud API format via Telnyx proxy
      if (phoneNumberId && !sent) {
        try {
          const cloudRes = await fetch(`https://api.telnyx.com/v2/whatsapp/${phoneNumberId}/messages`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${telnyxApiKey}`,
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: recipientPhone,
              type: "text",
              text: { body: aiResponse },
            }),
          });
          if (cloudRes.ok) {
            console.log("WhatsApp reply sent via Cloud API proxy");
            sent = true;
          } else {
            console.error("Cloud API proxy failed:", cloudRes.status, await cloudRes.text());
          }
        } catch (e) {
          console.error("Cloud API proxy error:", e);
        }
      }

      // Approach 2: Standard Telnyx messaging API (fallback)
      if (!sent) {
        try {
          const msgRes = await fetch("https://api.telnyx.com/v2/messages/whatsapp", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${telnyxApiKey}`,
            },
            body: JSON.stringify({
              from: envPhone,
              to: normalizedPhone,
              whatsapp_message: {
                type: "text",
                text: { body: aiResponse, preview_url: false },
              },
            }),
          });
          if (msgRes.ok) {
            console.log("WhatsApp reply sent via messaging API");
            sent = true;
          } else {
            console.error("Messaging API failed:", msgRes.status, await msgRes.text());
          }
        } catch (e) {
          console.error("Messaging API error:", e);
        }
      }

      if (!sent) {
        console.error("All WhatsApp reply methods failed");
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Telnyx WhatsApp webhook error:", error);
    return new Response("OK", { status: 200 });
  }
});

// ─── INSTAGRAM + FACEBOOK MESSENGER WEBHOOK ─────────────────
const instagramWebhook = httpAction(async (ctx, request) => {
  try {
    // Verify Meta webhook signature
    const rawBody = await request.text();
    if (process.env.FACEBOOK_APP_SECRET) {
      const isValid = await verifyMetaSignature(request, rawBody);
      if (!isValid) {
        console.error("Instagram/FB webhook signature verification failed");
        return new Response("Forbidden", { status: 403 });
      }
    }
    const body = JSON.parse(rawBody);
    const entry = body.entry?.[0];
    const isInstagram = body.object === "instagram";
    const platform = isInstagram ? "instagram" : "facebook";

    // Check toggle
    const toggleStatus = await ctx.runQuery(api.toggles.checkToggle, { channel: platform });
    if (!toggleStatus.channel) {
      return new Response("OK", { status: 200 });
    }

    const conn = await getConnections(ctx);
    const messaging = entry?.messaging?.[0];
    const commentChange = entry?.changes?.[0];

    if (messaging?.message?.text) {
      // DM handling
      const senderId = messaging.sender.id;
      const userMessage = messaging.message.text;
      const senderName = messaging.sender?.username || messaging.sender?.name || null;

      const aiResponse = await ctx.runAction(api.ai.generateResponse, {
        user_message: userMessage,
        platform,
        platform_user_id: senderId,
        sender_name: senderName,
      });

      // Reply via DM
      const accessToken = isInstagram
        ? (conn?.instagram_access_token || process.env.INSTAGRAM_ACCESS_TOKEN)
        : (conn?.facebook_access_token || process.env.FACEBOOK_ACCESS_TOKEN);

      if (accessToken) {
        const apiUrl = isInstagram
          ? "https://graph.instagram.com/v21.0/me/messages"
          : "https://graph.facebook.com/v24.0/me/messages";

        await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            recipient: { id: senderId },
            message: { text: aiResponse },
          }),
        });
      }
    } else if (commentChange?.value?.text) {
      // Instagram comment handling
      const commentText = commentChange.value.text;
      const commentId = commentChange.value.id;
      const commenterId = commentChange.value.from?.id;

      const aiResponse = await ctx.runAction(api.ai.generateResponse, {
        user_message: commentText,
        platform: "instagram",
        platform_user_id: commenterId,
        sender_name: commentChange.value.from?.username || null,
      });

      const accessToken = conn?.instagram_access_token || process.env.INSTAGRAM_ACCESS_TOKEN;
      if (accessToken && commentId) {
        await fetch(
          `https://graph.instagram.com/v21.0/${commentId}/replies`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ message: aiResponse }),
          }
        );
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Instagram/FB webhook error:", error);
    return new Response("OK", { status: 200 });
  }
});

// ─── TELEGRAM WEBHOOK ────────────────────────────────────────
const telegramWebhook = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const message = body.message;

    if (!message?.text) {
      return new Response("OK", { status: 200 });
    }

    // Check toggle
    const toggleStatus = await ctx.runQuery(api.toggles.checkToggle, { channel: "telegram" });
    if (!toggleStatus.channel) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const userId = message.from.id.toString();
    const userMessage = message.text;
    const firstName = message.from.first_name || "";
    const lastName = message.from.last_name || "";
    const senderName = (firstName + " " + lastName).trim() || undefined;

    const aiResponse = await ctx.runAction(api.ai.generateResponse, {
      user_message: userMessage,
      platform: "telegram",
      platform_user_id: userId,
      sender_name: senderName,
    });

    // Get bot token from connections (per-business) or env
    const conn = await getConnections(ctx);
    const botToken = conn?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;

    if (botToken) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: aiResponse,
        }),
      });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return new Response("OK", { status: 200 });
  }
});

// ─── WEB CHAT ENDPOINT ──────────────────────────────────────
// Called from dashboard (BeccaChatDialog — with auth) and public pages (WebChat/Widget — no auth).
// Auth is optional: if present, validate. If absent, allow as public chat.
const webChatEndpoint = httpAction(async (ctx, request) => {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { message, sender_name } = await request.json();

    // Validate message length
    if (!message || typeof message !== "string" || message.length > 4000) {
      return new Response(
        JSON.stringify({ error: "Message too long or invalid (max 4000 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await ctx.runAction(api.ai.generateResponse, {
      user_message: message,
      platform: "web",
      sender_name: sender_name || "Web Visitor",
    });

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Web chat error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process message" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── HELPER: FORMAT PRICES FOR SPEECH ──────────────────────────
function formatPrice(price: number, currency?: string, period?: string): string {
  const c = currency || "Naira";
  let formatted = "";
  if (price >= 1000000000) {
    formatted = `${(price / 1000000000).toFixed(1).replace('.0', '')} billion ${c}`;
  } else if (price >= 1000000) {
    formatted = `${(price / 1000000).toFixed(1).replace('.0', '')} million ${c}`;
  } else if (price >= 1000) {
    formatted = `${(price / 1000).toFixed(0)} thousand ${c}`;
  } else {
    formatted = `${price} ${c}`;
  }
  if (period) formatted += ` per ${period}`;
  return formatted;
}

// ─── TELNYX: CUSTOMER LOOKUP TOOL ────────────────────────────
// Called by Telnyx AI Assistant during a call to get customer context
// Also returns available properties so the assistant can answer property questions
const telnyxCustomerLookup = httpAction(async (ctx, request) => {
  if (!validateTelnyxToolSecret(request)) {
    return new Response("Forbidden", { status: 403 });
  }
  try {
    const body = await request.json();
    // CRITICAL: The LLM sends "+234" as placeholder. Telnyx sends the real call_control_id
    // as a HEADER (x-telnyx-call-control-id), not in the body. We use it to look up
    // the real caller phone from active_calls table (stored at call start by dynamic_variables).
    const payload = body.data?.payload || body.payload || body;
    const metadata = body.data?.metadata || body.metadata || {};

    // Get call_control_id from HEADER first (Telnyx sends it there), then body as fallback
    const callId = request.headers.get("x-telnyx-call-control-id")
      || payload.call_control_id || metadata.call_control_id
      || payload.call_session_id || metadata.call_session_id
      || payload.call_leg_id || metadata.call_leg_id;

    // Resolve real phone from active_calls using call-specific ID
    let phoneNumber: string | null = null;
    if (callId) {
      phoneNumber = await ctx.runQuery(api.activeCalls.getCallerPhone, { telnyx_call_id: callId });
    }
    // Fallback: Telnyx metadata (some payload formats include it)
    if (!phoneNumber) {
      const metaPhone = payload.telnyx_end_user_target || metadata.telnyx_end_user_target;
      if (metaPhone && metaPhone.length > 5 && metaPhone !== "+234") phoneNumber = metaPhone;
    }

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ found: false, message: "No phone number provided" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get customer context from unified callers table
    const context = await ctx.runQuery(api.channelHandler.getCustomerContext, {
      phone_number: phoneNumber,
      platform: "phone",
    });

    // Get available properties so assistant knows what's on the market
    const properties = await ctx.runQuery(api.properties.list, {});
    const availableProperties = (properties || [])
      .filter((p: any) => p.status === "available" || p.status === "pending")
      .slice(0, 20);

    const propertySummary = availableProperties.length > 0
      ? availableProperties.map((p: any) => {
          const parts = [p.title || "Untitled"];
          if (p.property_type) parts.push(p.property_type);
          if (p.listing_type) parts.push(`for ${p.listing_type}`);
          if (p.bedrooms) parts.push(`${p.bedrooms}bed`);
          if (p.bathrooms) parts.push(`${p.bathrooms}bath`);
          if (p.price) parts.push(formatPrice(p.price, "Naira", p.price_period));
          if (p.city) parts.push(p.city);
          return parts.join(" | ");
        }).join("\n")
      : "No properties currently listed.";

    return new Response(
      JSON.stringify({
        found: context.isReturning,
        name: context.name,
        call_count: context.callCount,
        memory: context.memorySummary,
        last_channel: context.lastChannel,
        last_call: context.lastCallAt,
        tags: context.crmTags,
        available_properties: propertySummary,
        property_count: availableProperties.length,
        context_prompt: (() => {
          const callerInvalidNames = ["unknown", "there", "caller", "customer", "user", "anonymous", ""];
          const callerRealName = context.name && !callerInvalidNames.includes(context.name.toLowerCase().trim()) ? context.name : null;

          let prompt = "";
          if (context.isReturning) {
            prompt = `This is a returning caller${callerRealName ? ` named ${callerRealName}` : " (you don't know their name yet — ask for it!)"}. They have contacted ${context.callCount} times.`;
            if (context.memorySummary) prompt += ` Memory: ${context.memorySummary.slice(0, 500)}`;
          } else {
            prompt = "This is a first-time caller. Be extra warm and welcoming. Ask for their name early in the conversation.";
          }

          // Add caller preferences if known (so AI doesn't re-ask)
          const prefs: string[] = [];
          if (context.budgetMin || context.budgetMax) {
            const min = context.budgetMin ? `${(context.budgetMin / 1_000_000).toFixed(1)}M` : "?";
            const max = context.budgetMax ? `${(context.budgetMax / 1_000_000).toFixed(1)}M` : "?";
            prefs.push(`Budget: ${min}-${max} Naira`);
          }
          if (context.preferredLocations && context.preferredLocations.length > 0) {
            prefs.push(`Preferred areas: ${context.preferredLocations.join(", ")}`);
          }
          if (context.propertyTypeInterests && context.propertyTypeInterests.length > 0) {
            prefs.push(`Looking for: ${context.propertyTypeInterests.join(", ")}`);
          }
          if (context.temperature) {
            prefs.push(`Lead temperature: ${context.temperature}`);
          }
          if (prefs.length > 0) {
            prompt += `\n\nKNOWN PREFERENCES (don't re-ask these, use them to personalize):\n${prefs.join("\n")}`;
          }

          return prompt;
        })()
          + `\n\nAVAILABLE PROPERTIES (${availableProperties.length} listings):\n${propertySummary}`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Telnyx customer lookup error:", error);
    return new Response(
      JSON.stringify({ found: false, error: "Lookup failed" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ─── TELNYX: SAVE CUSTOMER ──────────────────────────────────
// Called by Telnyx AI Assistant mid-call when it learns the caller's name
// or any other info worth saving. Feeds directly into unified callers + CRM contacts.
const telnyxSaveCustomer = httpAction(async (ctx, request) => {
  if (!validateTelnyxToolSecret(request)) {
    return new Response("Forbidden", { status: 403 });
  }
  try {
    const body = await request.json();
    // CRITICAL: Look up REAL phone from active_calls table (stored by dynamic_variables at call start).
    // The LLM sends "+234" as placeholder. Telnyx sends call_control_id as a HEADER.
    const payload = body.data?.payload || body.payload || body;
    const metadata = body.data?.metadata || body.metadata || {};

    // Get call_control_id from HEADER first (Telnyx sends it there), then body as fallback
    const callId = request.headers.get("x-telnyx-call-control-id")
      || payload.call_control_id || metadata.call_control_id
      || payload.call_session_id || metadata.call_session_id
      || payload.call_leg_id || metadata.call_leg_id;

    // Resolve real phone from active_calls using call-specific ID
    let phoneNumber: string | null = null;
    if (callId) {
      phoneNumber = await ctx.runQuery(api.activeCalls.getCallerPhone, { telnyx_call_id: callId });
    }
    if (!phoneNumber) {
      const metaPhone = payload.telnyx_end_user_target || metadata.telnyx_end_user_target;
      if (metaPhone && metaPhone.length > 5 && metaPhone !== "+234") phoneNumber = metaPhone;
    }
    const rawName = body.name || body.customer_name || "";
    // Filter out placeholder/invalid names — the AI sometimes saves "Unknown" or "Caller"
    const nameInvalid = ["unknown", "there", "caller", "customer", "user", "anonymous", ""];
    const name = rawName && !nameInvalid.includes(rawName.toLowerCase().trim()) ? rawName : undefined;
    const notes = body.notes || body.summary;
    const email = body.email;
    const budget = body.budget;
    const propertyInterest = body.property_interest;

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ success: false, message: "No phone number provided" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update unified callers table (name + memory)
    await ctx.runMutation(api.callers.upsert, {
      phone: phoneNumber,
      name: name || undefined,
      call_summary: notes || undefined,
      channel: "phone",
    });

    // Also update OR CREATE CRM contact with richer data
    const existingContact = await ctx.runQuery(api.contacts.getByPhone, {
      phone: phoneNumber,
    });

    if (existingContact) {
      // Update existing contact with any new info
      await ctx.runMutation(api.contacts.update, {
        id: existingContact._id,
        ...(name ? { full_name: name } : {}),
        ...(email ? { email } : {}),
        ...(notes ? { notes } : {}),
        ...(budget ? { budget_min: budget } : {}),
        ...(propertyInterest ? { property_type_interests: [propertyInterest] } : {}),
      });
    } else {
      // CREATE new CRM contact — this is critical for name to appear in CRM
      await ctx.runMutation(api.contacts.create, {
        name: name || undefined,
        full_name: name || undefined,
        phone: phoneNumber,
        source: "phone",
        temperature: "warm",
        notes: notes || `Auto-created from phone call via save_customer`,
        tags: ["phone"],
        ...(email ? { email } : {}),
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: `Customer ${name || phoneNumber} saved` }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Telnyx save customer error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Save failed" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ─── TELNYX: GET PROPERTIES ─────────────────────────────────
// Called by Telnyx AI Assistant when caller asks about specific properties
// Supports filters: bedrooms, city, listing_type, property_type, max_price
const telnyxGetProperties = httpAction(async (ctx, request) => {
  if (!validateTelnyxToolSecret(request)) {
    return new Response("Forbidden", { status: 403 });
  }
  try {
    const body = await request.json();
    const filters = {
      bedrooms: body.bedrooms ? Number(body.bedrooms) : null,
      city: body.city?.toLowerCase() || null,
      state: body.state?.toLowerCase() || null,
      listing_type: body.listing_type?.toLowerCase() || null, // sale, rent, lease
      property_type: body.property_type?.toLowerCase() || null, // house, apartment, condo, land
      max_price: body.max_price ? Number(body.max_price) : null,
      min_price: body.min_price ? Number(body.min_price) : null,
    };

    const allProperties = await ctx.runQuery(api.properties.list, {});
    let results = (allProperties || []).filter(
      (p: any) => p.status === "available" || p.status === "pending"
    );

    // Apply filters
    if (filters.bedrooms) {
      results = results.filter((p: any) => p.bedrooms && p.bedrooms >= filters.bedrooms!);
    }
    if (filters.city) {
      results = results.filter((p: any) => p.city?.toLowerCase().includes(filters.city!));
    }
    if (filters.state) {
      results = results.filter((p: any) => p.state?.toLowerCase().includes(filters.state!));
    }
    if (filters.listing_type) {
      results = results.filter((p: any) => p.listing_type?.toLowerCase() === filters.listing_type);
    }
    if (filters.property_type) {
      results = results.filter((p: any) => p.property_type?.toLowerCase() === filters.property_type);
    }
    if (filters.max_price) {
      results = results.filter((p: any) => p.price && p.price <= filters.max_price!);
    }
    if (filters.min_price) {
      results = results.filter((p: any) => p.price && p.price >= filters.min_price!);
    }

    const formatted = results.slice(0, 10).map((p: any) => ({
      title: p.title || "Untitled",
      property_type: p.property_type,
      listing_type: p.listing_type,
      status: p.status,
      price: p.price,
      price_display: p.price ? formatPrice(p.price, "Naira", p.price_period) : undefined,
      currency: p.currency || "₦",
      price_period: p.price_period,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      sqft: p.sqft,
      address: p.address,
      city: p.city,
      state: p.state,
      description: p.description?.slice(0, 200),
      features: p.features?.slice(0, 5),
    }));

    // Build a natural language summary for the assistant
    const summary = results.length === 0
      ? "No properties match those criteria right now."
      : results.slice(0, 10).map((p: any) => {
          const parts = [p.title || "Untitled property"];
          if (p.property_type) parts.push(`(${p.property_type})`);
          if (p.listing_type) parts.push(`for ${p.listing_type}`);
          if (p.bedrooms) parts.push(`${p.bedrooms} bedrooms`);
          if (p.bathrooms) parts.push(`${p.bathrooms} bathrooms`);
          if (p.sqft) parts.push(`${p.sqft} sqft`);
          if (p.price) parts.push(formatPrice(p.price, "Naira", p.price_period));
          if (p.address) parts.push(`at ${p.address}`);
          if (p.city) parts.push(p.city);
          if (p.description) parts.push(`— ${p.description.slice(0, 100)}`);
          return parts.join(", ");
        }).join("\n");

    return new Response(
      JSON.stringify({
        total_matches: results.length,
        properties: formatted,
        summary,
        filters_applied: Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== null)
        ),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Telnyx get properties error:", error);
    return new Response(
      JSON.stringify({ total_matches: 0, properties: [], summary: "Error fetching properties." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ─── TELNYX: LOCATION LOOKUP TOOL ─────────────────────────────
// Called by Telnyx AI assistant to look up real locations in Nigeria via OpenStreetMap
const telnyxLocationLookup = httpAction(async (ctx, request) => {
  if (!validateTelnyxToolSecret(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
  }

  try {
    const body = await request.json();
    const location = body.location || body.query || "";

    if (!location) {
      return new Response(JSON.stringify({ found: false, message: "No location provided" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Search with Nigeria bias using OpenStreetMap Nominatim (free, no API key)
    const query = encodeURIComponent(`${location}, Nigeria`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&countrycodes=ng&limit=5&addressdetails=1`,
      { headers: { "User-Agent": "BeccaRealEstate/1.0" } }
    );

    if (!response.ok) {
      return new Response(JSON.stringify({ found: false, message: "Location service unavailable" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const results = await response.json();

    if (results.length === 0) {
      return new Response(JSON.stringify({
        found: false,
        message: `Could not find "${location}" in Nigeria. Ask the caller to spell it or provide more details.`,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Format the top results
    const locations = results.slice(0, 3).map((r: any) => ({
      name: r.display_name,
      type: r.type,
      city: r.address?.city || r.address?.town || r.address?.village || r.address?.state,
      state: r.address?.state,
      lat: r.lat,
      lon: r.lon,
    }));

    const topResult = locations[0];
    const summary = `Found "${location}" in ${topResult.state || "Nigeria"}. Full location: ${topResult.name}`;

    return new Response(JSON.stringify({
      found: true,
      summary,
      location_name: location,
      confirmed_location: topResult.name,
      state: topResult.state,
      city: topResult.city,
      matches: locations,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Location lookup error:", error);
    return new Response(JSON.stringify({ found: false, message: "Location lookup failed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// ─── TELNYX: CALL END WEBHOOK ────────────────────────────────
// Called by Telnyx when a call ends — logs to CRM + updates memory
// Receives call progress events from TeXML Application + AI Assistant events
const telnyxCallWebhook = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const event = body.data?.event_type || body.event_type;
    const payload = body.data?.payload || body.payload || body.data || body;

    console.log("Telnyx webhook event:", event, JSON.stringify(payload).slice(0, 500));

    // Handle call end events (multiple possible event names)
    const isCallEnd = [
      "call.hangup", "call_hangup",
      "assistant.call.completed",
      "call.machine.detection.ended",
      "call_machine_detection_ended",
    ].includes(event);

    // Also handle the AI Assistant post-conversation webhook
    const isPostConversation = event === "assistant.conversation.completed"
      || event === "conversation.completed"
      || (payload.conversation_id && payload.transcript);

    if (isCallEnd || isPostConversation) {
      // Extract phone numbers — Telnyx uses "from" and "to"
      const fromNumber = payload.from || payload.caller_number;
      const toNumber = payload.to || payload.called_number;
      const telnyxPhone = process.env.TELNYX_PHONE_NUMBER || "";

      // Detect call direction: if "from" is our Telnyx number, it's outgoing
      let callType = "incoming";
      let customerPhone = fromNumber;
      if (fromNumber && telnyxPhone && fromNumber.replace(/\D/g, "").endsWith(telnyxPhone.replace(/\D/g, "").slice(-10))) {
        callType = "outgoing";
        customerPhone = toNumber || fromNumber;
      }

      // Extract duration, transcript, recording
      const durationSecs = payload.duration_secs || payload.call_duration || payload.duration;
      const transcript = payload.transcript || payload.conversation_summary
        || payload.summary || payload.conversation_transcript;
      const recordingUrl = payload.recording_url || payload.recording_urls?.[0]
        || payload.media_url || payload.recording?.url;

      // Log to CRM via processInteraction
      if (customerPhone) {
        await ctx.runMutation(api.channelHandler.processInteraction, {
          platform: "phone",
          phone_number: customerPhone,
          user_message: transcript || `Phone call (${callType})`,
          ai_response: "Call handled by Becca AI assistant",
          conversation_summary: transcript
            ? transcript.slice(0, 500)
            : `Phone call (${callType}), duration: ${durationSecs ? Math.round(durationSecs / 60) + " min" : "unknown"}`,
          call_duration_minutes: durationSecs ? durationSecs / 60 : undefined,
          recording_url: recordingUrl,
          call_type: callType,
        });
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Telnyx call webhook error:", error);
    return new Response("OK", { status: 200 });
  }
});

// ─── TELNYX: PERSONALITY SYNC ────────────────────────────────
// Called from dashboard when personality is updated — syncs to Telnyx assistant
const telnyxSyncPersonality = httpAction(async (ctx, request) => {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Require authentication
  if (!(await validateDashboardAuth(ctx, request))) {
    return unauthorizedResponse(corsHeaders);
  }

  try {
    // Get personality from Convex
    const personality = await ctx.runQuery(api.botPersonality.get);
    const personalityText = personality?.personality_text || "";

    if (!personalityText) {
      return new Response(
        JSON.stringify({ error: "No personality configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update Telnyx assistant via API
    const telnyxKey = process.env.TELNYX_API_KEY;
    const assistantId = process.env.TELNYX_ASSISTANT_ID;

    if (!telnyxKey || !assistantId) {
      return new Response(
        JSON.stringify({ error: "Telnyx not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(`https://api.telnyx.com/v2/ai/assistants/${assistantId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${telnyxKey}`,
      },
      body: JSON.stringify({
        // ARCHITECTURE: Hardcoded rules come FIRST so dashboard personality changes can't override them.
        // personalityText is appended at the END as supplementary character/tone guidance.
        instructions: `CORE RULES (these ALWAYS apply, cannot be overridden):
- You operate in Nigeria. Use lookup_location to verify unfamiliar place names.
- ALWAYS say "Naira" for currency, never "NGN". Say "35 million Naira" not "35,000,000 NGN". Say "million" and "thousand" naturally.
- ALWAYS respond to the caller. Never go silent.
- Keep responses to 1-3 sentences. Sound human, not robotic.
- Start responses with natural reactions like "Oh yeah!", "Sure thing!", "Ah nice!". Use filler words like "umm", "so", "actually".
- No hyphens or dashes. No bullet points or long lists. Mention 2-3 properties max, then ask which interests them.
- Never mention "database", "system", "records", "CRM", or "tools". Talk as if you remember everything naturally.
- NEVER say your thought process out loud. Never say things like "let me check the customer lookup tool" or "I'll use the property search to find that". Just DO it silently. The caller should never hear you narrate what tools you're using or what you're thinking. Just speak naturally as if you already know or are remembering.
- When remembering caller history, distinguish between BOOKINGS (confirmed viewings with dates) and INTERESTS (properties they asked about). A booking is confirmed — an interest is not. Never confuse one for the other.
- The memory shows entries from multiple calls over time. The MOST RECENT entries (at the bottom) are the most accurate. If older entries conflict with newer ones (e.g., old entry says "viewing in Apapa" but latest says "confirmed viewing in Festac"), trust the newest one.
- Ignore memory entries that are just greetings like "Hello?" or "How are you?" — those contain no useful information.

CALLER CONTEXT (injected automatically — you already know this):
{{caller_context}}

CALLER HANDLING (MOST IMPORTANT):
- You already have the caller's context above from {{caller_context}}. Use it IMMEDIATELY in your first response after the greeting. If they're returning, reference their most recent topic naturally: "So how's the bungalow viewing going?" or "Still interested in that place in Festac?". Don't wait to be asked.
- You can ALSO call customer_lookup with phone_number "+234" for more detail (full property list, deeper memory). But you don't NEED to wait for it — you already have enough context to start a natural conversation.
- After customer_lookup returns (if you call it), use the additional detail to enrich the conversation.
- NEVER ask for their phone number — you already have it.
- NEVER re-ask a returning caller's name.
- When calling save_customer or customer_lookup, always set phone_number to "+234". The system handles the real number. NEVER type a phone number from memory or conversation.
- ALWAYS call save_customer before ending every call with a meaningful summary of what was discussed.

DATE AND TIME AWARENESS:
- Today is {{current_date}}.
- CALENDAR REFERENCE (use this to look up days — NEVER guess): {{calendar}}
- When you mention ANY date, look it up in the calendar reference above to get the correct day of the week. For example if the calendar says "April 20 = Monday (in 10 days)", then say "April 20th, that's Monday, 10 days from now."
- NEVER guess what day a date falls on. ALWAYS check the calendar reference. If a date is not in the reference, just say the date and how far away it is without naming the day.
- Use natural time references: "this weekend", "next week Monday", "in 3 days", "tomorrow afternoon".

PROPERTY SEARCH:
- Use get_properties with filters: bedrooms (number), city (string), listing_type ("sale"/"rent"/"lease"), property_type ("house"/"apartment"/"commercial"/"land"), max_price (number), min_price (number). Use "city" not "location".
- Bungalow/duplex = "house". Flat/studio = "apartment". Warehouse/office = "commercial".
- Present prices in words: "35 million Naira" or "3 and a half million Naira per year".

APPOINTMENTS AND SAVING:
- Book viewings directly. Ask what day and time works, confirm with day-of-week context ("So that's Thursday the 17th at 2 PM"), and save with save_customer.
- Save caller preferences with save_customer if no properties match, so you can follow up later.

CONVERSATION FLOW EXAMPLES:

Example 1 — Returning caller (YOU MUST follow this pattern):
[greeting plays: "Hi Kingsley!"]
[IMMEDIATELY call customer_lookup — don't wait]
[customer_lookup returns: memory about warehouse in Apapa, viewing on April 15]
Caller: Hello?
You: Hey Kingsley! So you've got that warehouse viewing in Apapa coming up this Tuesday — are you all set for that, or do you need anything before then?
[Why: Referenced specific past topic IMMEDIATELY in first response. Added day-of-week context. Didn't wait to be asked.]

Example 2 — Returning caller with past viewing date:
[customer_lookup returns: viewing was scheduled for April 5th (already passed)]
Caller: Hi!
You: Hey Amara! Last time we set up a viewing for that 3-bedroom in Festac — that was last Saturday. How did it go? Did you like it?
[Why: Acknowledged the viewing happened, asked for feedback naturally]

Example 3 — First-time caller:
[customer_lookup returns: first-time caller, no name]
Caller: Hi, I'm looking for a property.
You: Oh hey, welcome! I'd love to help you out. And who am I speaking with today?
Caller: I'm Chidi.
You: Nice to meet you, Chidi! So are you looking to buy, rent, or lease? And any particular area you're interested in?
[Why: Asked name naturally within first exchange, then qualifying questions]

Example 4 — Scheduling with date awareness:
Caller: Can I come see it on the 20th?
You: April 20th — that's next Sunday. What time works for you?
Caller: Around 3 PM.
You: Perfect! Sunday the 20th at 3 PM for the warehouse viewing in Apapa. I'll have everything ready for you!
[Why: Confirmed the day of week, full date, time, and property in one natural sentence]

Example 5 — Price objection:
Caller: That's too much for me.
You: I hear you. What range are you comfortable with? I might have something that fits better — we've got options from 800 thousand to 350 million depending on what you're after.

ENDING CALLS (follow this EXACT sequence — never skip steps):
Step 1: When the conversation naturally wraps up, FIRST call save_customer with a summary of everything discussed.
Step 2: THEN say a warm, personal goodbye OUT LOUD to the caller. Use their name. Examples:
  - "It was really nice chatting with you, Peter! Your viewing is on Saturday April 25th — I'll make sure everything is ready. Talk to you soon!"
  - "Thanks for calling, Amara! I'll keep my eyes open for 3-bedrooms in Lekki in your budget. Don't hesitate to call back anytime. Have a great day!"
  - "Lovely speaking with you, Chidi! See you at the viewing on Tuesday. Take care!"
Step 3: Wait for the caller to respond (they'll usually say "bye" or "thanks").
Step 4: ONLY THEN call hangup.

CRITICAL: If you call hangup without saying goodbye first, that is WRONG. Always speak your farewell first.
- Say goodbye ONCE — one warm, complete farewell sentence. Do NOT say goodbye multiple times or keep adding more farewell phrases. One goodbye is perfect, two feels awkward, three feels like you can't let go.
- After your single goodbye, if the caller says "bye" back, call hangup immediately. Don't add another "bye bye" or "take care" — just end it cleanly.

Example 6 — Proper call ending:
Caller: Alright, that's all I needed. Thank you!
You: [calls save_customer first]
You: You're welcome, Peter! Your viewing for the bungalow in Festac is on April 25th — I'll have everything ready. Enjoy the rest of your day!
Caller: Bye.
[calls hangup immediately — do NOT say another goodbye]

` + `\n\nASSISTANT PERSONALITY AND CHARACTER:\n` + personalityText,
        dynamic_variables_webhook_url: `https://diligent-nightingale-429.convex.site/telnyx/dynamic-variables${process.env.TELNYX_TOOL_SECRET ? "?secret=" + process.env.TELNYX_TOOL_SECRET : ""}`,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Telnyx update error:", response.status, err);
      return new Response(
        JSON.stringify({ error: "Failed to sync to Telnyx", status: response.status, detail: err }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Telnyx sync error:", error);
    return new Response(
      JSON.stringify({ error: "Sync failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── TELNYX: DYNAMIC VARIABLES WEBHOOK ──────────────────────
// Fired automatically at the START of every call by Telnyx.
// Returns dynamic_variables (for greeting personalization) + context.
// Responds within 1 second as required by Telnyx.
const telnyxDynamicVariables = httpAction(async (ctx, request) => {
  if (!validateTelnyxToolSecret(request)) {
    return new Response("Forbidden", { status: 403 });
  }
  try {
    const body = await request.json();
    // Telnyx sends caller phone in data.payload.telnyx_end_user_target
    const payload = body.data?.payload || body.payload || body;
    const phoneNumber = payload.telnyx_end_user_target
      || payload.from || payload.phone_number || payload.caller_number;

    // DEBUG: Log entire body structure to find call IDs
    console.log("dynamic_variables FULL BODY:", JSON.stringify({
      topKeys: Object.keys(body),
      payloadKeys: Object.keys(payload),
      phone: phoneNumber,
      call_control_id: payload.call_control_id,
      call_session_id: payload.call_session_id,
      call_leg_id: payload.call_leg_id,
      header_call_id: request.headers.get("x-telnyx-call-control-id"),
      data_keys: body.data ? Object.keys(body.data) : "no data",
      data_payload_keys: body.data?.payload ? Object.keys(body.data.payload) : "no data.payload",
    }));

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({
          dynamic_variables: { caller_name: "there" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Store the real caller phone under ALL call-specific IDs.
    // NO "latest" key — that causes race conditions when 2+ calls arrive simultaneously.
    // Each call has unique IDs so lookups are always call-specific.
    const callIds = [
      payload.call_control_id,
      payload.call_session_id,
      payload.call_leg_id,
      request.headers.get("x-telnyx-call-control-id"),
    ].filter(Boolean) as string[];

    for (const id of callIds) {
      if (phoneNumber && id) {
        await ctx.runMutation(api.activeCalls.store, {
          telnyx_call_id: id,
          caller_phone: phoneNumber,
        });
      }
    }

    // Look up caller in unified callers table
    const context = await ctx.runQuery(api.channelHandler.getCustomerContext, {
      phone_number: phoneNumber,
      platform: "phone",
    });

    // Return dynamic_variables for greeting personalization + caller phone for auto-lookup
    // If we know the name, greeting becomes "Hi John!" otherwise "Hi there!"
    // Filter out placeholder names that aren't real names
    const invalidNames = ["unknown", "there", "caller", "customer", "user", "anonymous", ""];
    const rawName = context.name || "";
    const isRealName = rawName.length > 0 && !invalidNames.includes(rawName.toLowerCase().trim());

    // Build current date + next 21 days calendar so the LLM never guesses wrong
    const now = new Date();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentDate = `${dayNames[now.getUTCDay()]}, ${monthNames[now.getUTCMonth()]} ${now.getUTCDate()}, ${now.getUTCFullYear()}`;

    // Generate calendar reference for the next 21 days
    const calendarLines: string[] = [];
    for (let i = 0; i <= 21; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const label = i === 0 ? "TODAY" : i === 1 ? "TOMORROW" : `in ${i} days`;
      calendarLines.push(`${monthNames[d.getUTCMonth()]} ${d.getUTCDate()} = ${dayNames[d.getUTCDay()]} (${label})`);
    }
    const calendarRef = calendarLines.join(", ");

    // Build caller context string so the assistant ALWAYS has customer history
    // even if customer_lookup tool is never called (which happens sometimes)
    let callerContext = "";
    if (context.isReturning && isRealName) {
      callerContext = `CALLER INFO: This is ${rawName}, a returning caller (${context.callCount} calls).`;
      // Add last meaningful memory entries (skip "Hello?" junk, take last 3 useful ones)
      if (context.memorySummary) {
        const lines = context.memorySummary.split("\n").filter((l: string) => {
          const content = l.split("] ")[1] || l;
          return content.trim().length > 20 && !/^(Hello|Hi|How are|Okay|Yes|Yeah|Alright|Mhmm)/i.test(content.trim());
        });
        const recent = lines.slice(-3);
        if (recent.length > 0) callerContext += " Recent: " + recent.join(" | ");
      }
      // Add preferences
      const prefs: string[] = [];
      if (context.budgetMin || context.budgetMax) {
        const min = context.budgetMin ? `${(context.budgetMin / 1_000_000).toFixed(0)}M` : "?";
        const max = context.budgetMax ? `${(context.budgetMax / 1_000_000).toFixed(0)}M` : "?";
        prefs.push(`Budget: ${min}-${max} Naira`);
      }
      if (context.preferredLocations && context.preferredLocations.length > 0) prefs.push(`Areas: ${context.preferredLocations.join(", ")}`);
      if (context.propertyTypeInterests && context.propertyTypeInterests.length > 0) prefs.push(`Looking for: ${context.propertyTypeInterests.join(", ")}`);
      if (prefs.length > 0) callerContext += " Preferences: " + prefs.join(". ") + ".";
    } else if (context.isReturning) {
      callerContext = "CALLER INFO: Returning caller but name unknown — ask for their name.";
    } else {
      callerContext = "CALLER INFO: First-time caller — be warm, ask for their name.";
    }

    return new Response(
      JSON.stringify({
        dynamic_variables: {
          caller_name: isRealName ? rawName : "there",
          caller_phone: phoneNumber,
          current_date: currentDate,
          calendar: calendarRef,
          caller_context: callerContext,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Telnyx dynamic variables error:", error);
    return new Response(
      JSON.stringify({
        dynamic_variables: { caller_name: "there", current_date: new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ─── TELNYX: OUTBOUND CALL ────────────────────────────────────
const telnyxOutboundCall = httpAction(async (ctx, request) => {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Require authentication
  if (!(await validateDashboardAuth(ctx, request))) {
    return unauthorizedResponse(corsHeaders);
  }

  try {
    const { to_number, purpose } = await request.json();

    // Validate E.164 phone number format
    if (!to_number || !/^\+[1-9]\d{1,14}$/.test(to_number)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format. Use E.164 format (e.g., +1234567890)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const telnyxKey = process.env.TELNYX_API_KEY;
    const assistantId = process.env.TELNYX_ASSISTANT_ID;
    const fromNumber = process.env.TELNYX_PHONE_NUMBER;

    if (!telnyxKey || !assistantId || !fromNumber) {
      return new Response(
        JSON.stringify({ error: "Telnyx not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initiate outbound call via Telnyx AI Assistant
    const response = await fetch("https://api.telnyx.com/v2/ai/assistants/" + assistantId + "/calls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${telnyxKey}`,
      },
      body: JSON.stringify({
        to: to_number,
        from: fromNumber,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Telnyx outbound call error:", err);
      return new Response(
        JSON.stringify({ error: "Failed to initiate call" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    return new Response(
      JSON.stringify({ success: true, call_id: data.data?.call_control_id || data.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Outbound call error:", error);
    return new Response(
      JSON.stringify({ error: "Call failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── TELNYX: END CALL ────────────────────────────────────────
const telnyxEndCall = httpAction(async (ctx, request) => {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Require authentication
  if (!(await validateDashboardAuth(ctx, request))) {
    return unauthorizedResponse(corsHeaders);
  }

  try {
    const { call_id } = await request.json();
    const telnyxKey = process.env.TELNYX_API_KEY;

    if (!telnyxKey || !call_id) {
      return new Response(
        JSON.stringify({ error: "Missing call_id or API key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await fetch(`https://api.telnyx.com/v2/calls/${call_id}/actions/hangup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${telnyxKey}`,
      },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("End call error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to end call" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── LOGO/BACKGROUND GENERATION ─────────────────────────────
const generateLogoEndpoint = httpAction(async (ctx, request) => {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (!(await validateDashboardAuth(ctx, request))) return unauthorizedResponse(corsHeaders);
  try {
    const body = await request.json();
    const result = await ctx.runAction(api.storage.generateLogo, {
      prompt: body.prompt || "",
      action_type: body.action,
      business_name: body.businessName || body.businessInfo,
      industry: body.industry,
    });
    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Logo generation error:", error);
    return new Response(JSON.stringify({ error: "Logo generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// ─── UPDATE LOGO URL ─────────────────────────────────────────
const updateLogoEndpoint = httpAction(async (ctx, request) => {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (!(await validateDashboardAuth(ctx, request))) return unauthorizedResponse(corsHeaders);
  try {
    const { logo_url } = await request.json();
    const customizations = await ctx.runQuery(api.customizations.get, {});
    if (customizations?._id) {
      await ctx.runMutation(api.customizations.update, { id: customizations._id, logo_url });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Logo update error:", error);
    return new Response(JSON.stringify({ error: "Logo update failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// ─── ANALYZE DATA ────────────────────────────────────────────
const analyzeEndpoint = httpAction(async (ctx, request) => {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (!(await validateDashboardAuth(ctx, request))) return unauthorizedResponse(corsHeaders);
  try {
    const body = await request.json();
    const result = await ctx.runAction(api.aiTools.analyzeData, {
      messages: body.messages,
      question: body.question,
      conversationHistory: body.conversationHistory,
    });
    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Analysis error:", error);
    return new Response(JSON.stringify({ error: "Analysis failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// ─── CHARACTER CREATOR ───────────────────────────────────────
const createCharacterEndpoint = httpAction(async (ctx, request) => {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (!(await validateDashboardAuth(ctx, request))) return unauthorizedResponse(corsHeaders);
  try {
    const body = await request.json();
    const result = await ctx.runAction(api.aiTools.createCharacter, {
      action_type: body.action || "generate_new",
      description: body.description,
      personality: body.personality,
      business_context: body.business_context,
      refinement: body.refinement,
    });
    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Character creation error:", error);
    return new Response(JSON.stringify({ error: "Character creation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// ─── TELNYX: SYNC VOICE ─────────────────────────────────────
// Called from dashboard when user selects a voice.
// Updates the Telnyx AI Assistant's voice to the selected voice.
// Voice ID format: full Telnyx voice string
const telnyxSyncVoice = httpAction(async (ctx, request) => {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Require authentication
  if (!(await validateDashboardAuth(ctx, request))) {
    return unauthorizedResponse(corsHeaders);
  }

  try {
    const { voice_id } = await request.json();

    if (!voice_id || typeof voice_id !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid voice_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const telnyxKey = process.env.TELNYX_API_KEY;
    const assistantId = process.env.TELNYX_ASSISTANT_ID;

    if (!telnyxKey || !assistantId) {
      return new Response(
        JSON.stringify({ error: "Telnyx not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Voice ID is the full Telnyx voice string
    // No prefix needed — it's already in the correct format
    const telnyxVoice = voice_id;

    const response = await fetch(`https://api.telnyx.com/v2/ai/assistants/${assistantId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${telnyxKey}`,
      },
      body: JSON.stringify({
        voice_settings: {
          voice: telnyxVoice,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Telnyx voice sync error:", err);
      return new Response(
        JSON.stringify({ error: "Failed to sync voice to Telnyx" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Voice synced to Telnyx: ${telnyxVoice}`);
    return new Response(
      JSON.stringify({ success: true, voice: telnyxVoice }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Telnyx voice sync error:", error);
    return new Response(
      JSON.stringify({ error: "Voice sync failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── REGISTER ROUTES ─────────────────────────────────────────

// Social channels
http.route({ path: "/whatsapp", method: "GET", handler: verifyWebhook });
http.route({ path: "/whatsapp", method: "POST", handler: whatsappWebhook });
http.route({ path: "/telnyx/whatsapp", method: "POST", handler: telnyxWhatsAppWebhook });
http.route({ path: "/instagram", method: "GET", handler: verifyWebhook });
http.route({ path: "/instagram", method: "POST", handler: instagramWebhook });
http.route({ path: "/telegram", method: "POST", handler: telegramWebhook });
http.route({ path: "/web-chat", method: "POST", handler: webChatEndpoint });
http.route({ path: "/web-chat", method: "OPTIONS", handler: webChatEndpoint });

// Telnyx (phone calls)
http.route({ path: "/telnyx/dynamic-variables", method: "POST", handler: telnyxDynamicVariables });
http.route({ path: "/telnyx/customer-lookup", method: "POST", handler: telnyxCustomerLookup });
http.route({ path: "/telnyx/save-customer", method: "POST", handler: telnyxSaveCustomer });
http.route({ path: "/telnyx/get-properties", method: "POST", handler: telnyxGetProperties });
http.route({ path: "/telnyx/lookup-location", method: "POST", handler: telnyxLocationLookup });
http.route({ path: "/telnyx/call-webhook", method: "POST", handler: telnyxCallWebhook });
http.route({ path: "/telnyx/sync-personality", method: "POST", handler: telnyxSyncPersonality });
http.route({ path: "/telnyx/sync-personality", method: "OPTIONS", handler: telnyxSyncPersonality });
http.route({ path: "/telnyx/sync-voice", method: "POST", handler: telnyxSyncVoice });
http.route({ path: "/telnyx/sync-voice", method: "OPTIONS", handler: telnyxSyncVoice });
http.route({ path: "/telnyx/outbound-call", method: "POST", handler: telnyxOutboundCall });
http.route({ path: "/telnyx/outbound-call", method: "OPTIONS", handler: telnyxOutboundCall });
http.route({ path: "/telnyx/end-call", method: "POST", handler: telnyxEndCall });
http.route({ path: "/telnyx/end-call", method: "OPTIONS", handler: telnyxEndCall });

// Sync calls from Telnyx
const syncCallsEndpoint = httpAction(async (ctx, request) => {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Require authentication
  if (!(await validateDashboardAuth(ctx, request))) {
    return unauthorizedResponse(corsHeaders);
  }

  try {
    const result = await ctx.runAction(api.syncCalls.syncRecentCalls, { pageSize: 20 });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sync calls error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to sync calls" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
http.route({ path: "/sync-calls", method: "POST", handler: syncCallsEndpoint });
http.route({ path: "/sync-calls", method: "OPTIONS", handler: syncCallsEndpoint });

// AI tools (logo, analyze, character creator)
http.route({ path: "/generate-logo", method: "POST", handler: generateLogoEndpoint });
http.route({ path: "/generate-logo", method: "OPTIONS", handler: generateLogoEndpoint });
http.route({ path: "/update-logo", method: "POST", handler: updateLogoEndpoint });
http.route({ path: "/update-logo", method: "OPTIONS", handler: updateLogoEndpoint });
http.route({ path: "/analyze", method: "POST", handler: analyzeEndpoint });
http.route({ path: "/analyze", method: "OPTIONS", handler: analyzeEndpoint });
http.route({ path: "/create-character", method: "POST", handler: createCharacterEndpoint });
http.route({ path: "/create-character", method: "OPTIONS", handler: createCharacterEndpoint });

export default http;
