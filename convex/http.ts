import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

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

// CORS: restrict to configured origin instead of wildcard
function getCorsHeaders(): Record<string, string> {
  const origin = process.env.ALLOWED_ORIGIN || "http://localhost:5173";
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
  const corsHeaders = getCorsHeaders();

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

// ─── TELNYX: CUSTOMER LOOKUP TOOL ────────────────────────────
// Called by Telnyx AI Assistant during a call to get customer context
// Also returns available properties so the assistant can answer property questions
const telnyxCustomerLookup = httpAction(async (ctx, request) => {
  if (!validateTelnyxToolSecret(request)) {
    return new Response("Forbidden", { status: 403 });
  }
  try {
    const body = await request.json();
    const phoneNumber = body.phone_number || body.caller_number || body.from;

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
          if (p.price) parts.push(`${p.currency || "₦"}${p.price.toLocaleString()}${p.price_period ? "/" + p.price_period : ""}`);
          if (p.city) parts.push(p.city);
          if (p.status === "pending") parts.push("(pending)");
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
        context_prompt: (context.isReturning
          ? `This is a returning caller${context.name ? ` named ${context.name}` : ""}. They have contacted ${context.callCount} times. ${context.memorySummary ? `Memory: ${context.memorySummary.slice(0, 500)}` : ""}`
          : "This is a first-time caller. Be extra warm and welcoming.")
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
    const phoneNumber = body.phone_number || body.caller_number || body.from;
    const name = body.name || body.customer_name;
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

    // Also update CRM contact with richer data
    const existingContact = await ctx.runQuery(api.contacts.getByPhone, {
      phone: phoneNumber,
    });

    if (existingContact) {
      await ctx.runMutation(api.contacts.update, {
        id: existingContact._id,
        ...(name ? { full_name: name } : {}),
        ...(email ? { email } : {}),
        ...(notes ? { notes } : {}),
        ...(budget ? { budget_min: budget } : {}),
        ...(propertyInterest ? { property_type_interests: [propertyInterest] } : {}),
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
          if (p.price) parts.push(`${p.currency || "₦"}${p.price.toLocaleString()}${p.price_period ? " per " + p.price_period : ""}`);
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
  const corsHeaders = getCorsHeaders();

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
        instructions: personalityText + `\n\nIMPORTANT RULES:
- Keep responses concise (1 to 3 sentences for quick answers, slightly longer for detailed explanations).
- Do NOT use hyphens, en dashes, or em dashes. Use commas and periods instead.
- Be warm and conversational. You are on a phone call.
- ALWAYS ask for the caller's name early in the conversation in a natural way (e.g. "And who am I speaking with today?").
- When you learn the caller's name, use save_customer to save it immediately with their phone_number and name. Then use their name naturally throughout the call.
- When someone asks about properties, availability, pricing, or listings, use get_properties to search with filters (bedrooms, city, listing_type, property_type, max_price). Present results naturally as if you know them from memory.
- The customer_lookup tool is called automatically at the start of each call. It loads the caller's history, memory, and all available property listings. Use that context to personalize the conversation.
- If no properties match what the caller wants, offer to take their requirements so you can follow up when something becomes available. Use save_customer to record their preferences in the notes and property_interest fields.
- NEVER mention "database", "system", "records", "CRM", "tools", or "webhook". Just talk naturally as if you know everything from memory.
- When the call ends, all information is automatically saved. You do not need to tell the caller you are saving anything.`,
        dynamic_variables_webhook_url: `https://diligent-nightingale-429.convex.site/telnyx/dynamic-variables${process.env.TELNYX_TOOL_SECRET ? "?secret=" + process.env.TELNYX_TOOL_SECRET : ""}`,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Telnyx update error:", err);
      return new Response(
        JSON.stringify({ error: "Failed to sync" }),
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

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({
          dynamic_variables: { caller_name: "there" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Look up caller in unified callers table
    const context = await ctx.runQuery(api.channelHandler.getCustomerContext, {
      phone_number: phoneNumber,
      platform: "phone",
    });

    // Return dynamic_variables for greeting personalization
    // If we know the name, greeting becomes "Hi John!" otherwise "Hi there!"
    return new Response(
      JSON.stringify({
        dynamic_variables: {
          caller_name: context.name || "there",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Telnyx dynamic variables error:", error);
    return new Response(
      JSON.stringify({
        dynamic_variables: { caller_name: "there" },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ─── TELNYX: OUTBOUND CALL ────────────────────────────────────
const telnyxOutboundCall = httpAction(async (ctx, request) => {
  const corsHeaders = getCorsHeaders();

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
  const corsHeaders = getCorsHeaders();

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
  const corsHeaders = getCorsHeaders();
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
  const corsHeaders = getCorsHeaders();
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
  const corsHeaders = getCorsHeaders();
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
  const corsHeaders = getCorsHeaders();
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
// Called from dashboard when user selects or clones a voice.
// Updates the Telnyx AI Assistant's voice to the selected ElevenLabs voice.
const telnyxSyncVoice = httpAction(async (ctx, request) => {
  const corsHeaders = getCorsHeaders();

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Require authentication
  if (!(await validateDashboardAuth(ctx, request))) {
    return unauthorizedResponse(corsHeaders);
  }

  try {
    const { voice_id } = await request.json();

    if (!voice_id || typeof voice_id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(voice_id)) {
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

    // Telnyx voice format: "ElevenLabs.<voice_id>"
    const telnyxVoice = `ElevenLabs.${voice_id}`;

    const response = await fetch(`https://api.telnyx.com/v2/ai/assistants/${assistantId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${telnyxKey}`,
      },
      body: JSON.stringify({
        voice_settings: {
          voice: telnyxVoice,
          api_key_ref: "elevenlab",
          use_speaker_boost: true,
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
http.route({ path: "/telnyx/call-webhook", method: "POST", handler: telnyxCallWebhook });
http.route({ path: "/telnyx/sync-personality", method: "POST", handler: telnyxSyncPersonality });
http.route({ path: "/telnyx/sync-personality", method: "OPTIONS", handler: telnyxSyncPersonality });
http.route({ path: "/telnyx/sync-voice", method: "POST", handler: telnyxSyncVoice });
http.route({ path: "/telnyx/sync-voice", method: "OPTIONS", handler: telnyxSyncVoice });
http.route({ path: "/telnyx/outbound-call", method: "POST", handler: telnyxOutboundCall });
http.route({ path: "/telnyx/outbound-call", method: "OPTIONS", handler: telnyxOutboundCall });
http.route({ path: "/telnyx/end-call", method: "POST", handler: telnyxEndCall });
http.route({ path: "/telnyx/end-call", method: "OPTIONS", handler: telnyxEndCall });

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
