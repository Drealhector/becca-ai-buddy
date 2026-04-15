import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * AI RESPONSE ENGINE
 *
 * Single brain, single personality. Every channel calls this.
 * Uses bot_personality as THE system prompt + customer context for personalization.
 */

// Generate AI response for any channel
export const generateResponse = action({
  args: {
    user_message: v.string(),
    platform: v.string(),
    phone_number: v.optional(v.string()),
    platform_user_id: v.optional(v.string()),
    sender_name: v.optional(v.string()),
    business_id: v.optional(v.string()),
    image_base64: v.optional(v.string()),
    image_mime_type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate message length
    if (args.user_message.length > 4000) {
      throw new Error("Message exceeds maximum length (4000 characters)");
    }

    // 1. Get the ONE personality (single source of truth)
    const personality = await ctx.runQuery(api.botPersonality.get);
    const personalityText = personality?.personality_text || "You are Becca, a friendly and professional AI assistant.";

    // 2. Get customer context (memory, name, history — cross-channel)
    const customerContext = await ctx.runQuery(api.channelHandler.getCustomerContext, {
      phone_number: args.phone_number,
      platform_user_id: args.platform_user_id,
      platform: args.platform,
    });

    // 3. Get available properties so AI can answer property questions
    const allProperties = await ctx.runQuery(api.properties.list, {});
    const availableProperties = (allProperties || [])
      .filter((p: any) => p.status === "available" || p.status === "pending")
      .slice(0, 20);

    // 4. Build system prompt with personality + customer context + properties
    let systemPrompt = personalityText;

    // Inject customer context if returning customer
    if (customerContext.isReturning) {
      systemPrompt += `\n\n--- CUSTOMER CONTEXT (do NOT share this with the customer) ---`;
      if (customerContext.name) {
        systemPrompt += `\nCustomer name: ${customerContext.name}`;
      }
      systemPrompt += `\nTotal interactions: ${customerContext.callCount}`;
      if (customerContext.lastChannel) {
        systemPrompt += `\nLast contacted via: ${customerContext.lastChannel}`;
      }
      if (customerContext.memorySummary) {
        systemPrompt += `\nMemory from past conversations:\n${customerContext.memorySummary}`;
      }
      if (customerContext.crmTags && customerContext.crmTags.length > 0) {
        systemPrompt += `\nTags: ${customerContext.crmTags.join(", ")}`;
      }
      systemPrompt += `\n--- END CONTEXT ---`;
    }

    // Inject property listings so AI can answer property questions
    if (availableProperties.length > 0) {
      systemPrompt += `\n\n--- AVAILABLE PROPERTIES (${availableProperties.length} listings) ---`;
      for (const p of availableProperties) {
        const parts = [p.title || "Untitled"];
        if (p.property_type) parts.push(`(${p.property_type})`);
        if (p.listing_type) parts.push(`for ${p.listing_type}`);
        if (p.bedrooms) parts.push(`${p.bedrooms}bed`);
        if (p.bathrooms) parts.push(`${p.bathrooms}bath`);
        if (p.sqft) parts.push(`${p.sqft}sqft`);
        if (p.price) parts.push(`${p.currency || "₦"}${p.price.toLocaleString()}${p.price_period ? "/" + p.price_period : ""}`);
        if (p.address) parts.push(p.address);
        if (p.city) parts.push(p.city);
        if (p.status === "pending") parts.push("(pending)");
        if (p.description) parts.push(`— ${p.description.slice(0, 120)}`);
        systemPrompt += `\n• ${parts.join(" | ")}`;
      }
      systemPrompt += `\n--- END PROPERTIES ---`;
      systemPrompt += `\nWhen customers ask about properties, listings, availability, or prices, use the data above to give accurate answers. Recommend matching properties based on their needs. If nothing matches, let them know and offer to notify them when something becomes available.`;
    } else {
      systemPrompt += `\n\nNo properties are currently listed. If someone asks about properties, let them know that the listings are being updated and to check back soon, or offer to take their requirements so you can follow up.`;
    }

    // Add formatting rules
    systemPrompt += `\n\nFORMATTING RULES:
- Keep responses concise (1-3 sentences for chat, slightly longer for calls)
- Do NOT use hyphens (-), en dashes, or em dashes. Use commas and periods instead.
- Be warm and natural. You are chatting on ${args.platform}.
- If you learn the customer's name, use it naturally.
- NEVER mention "database", "system", "records", "CRM", or "listings data". Just talk naturally as if you know your inventory.`;

    // 5. Build conversation history from recent messages
    const messages: Array<{ role: string; content: string | Array<any> }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add recent conversation context
    for (const msg of customerContext.recentMessages) {
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      });
    }

    // Add the current message (with optional image for vision)
    if (args.image_base64) {
      const mimeType = args.image_mime_type || "image/png";
      messages.push({
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${args.image_base64}`,
            },
          },
          { type: "text", text: args.user_message },
        ],
      });
    } else {
      messages.push({ role: "user", content: args.user_message });
    }

    // 6. Call OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY not set in Convex environment variables");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI error:", error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || "I'm sorry, I couldn't process that. Could you try again?";

    // 7. Store everything via unified channel handler
    await ctx.runMutation(api.channelHandler.processInteraction, {
      platform: args.platform,
      phone_number: args.phone_number,
      platform_user_id: args.platform_user_id,
      sender_name: args.sender_name,
      user_message: args.user_message,
      ai_response: aiResponse,
      conversation_summary: args.user_message.length > 20
        ? `${args.sender_name || "Customer"}: ${args.user_message.slice(0, 80)}... → AI responded`
        : undefined,
      business_id: args.business_id as any,
    });

    return aiResponse;
  },
});
