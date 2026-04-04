import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

/**
 * UNIFIED CHANNEL HANDLER
 *
 * ONE brain. ONE memory. ONE personality. Every channel feeds here.
 *
 * Flow:
 * 1. Channel receives message (WhatsApp/Instagram/Facebook/Telegram/Phone/Web)
 * 2. Channel calls getCustomerContext() → gets memory + recent messages for AI prompt
 * 3. AI responds using bot_personality (single source) + customer context
 * 4. Channel calls processInteraction() → stores everything + feeds CRM
 *
 * This handler touches:
 * - conversations + messages (store the chat)
 * - callers (unified customer identity + memory)
 * - contacts + activities (CRM auto-population)
 * - call_history (phone calls only)
 */

// ─── AFTER AI RESPONDS: Store everything ─────────────────────
export const processInteraction = mutation({
  args: {
    // Channel
    platform: v.string(), // "whatsapp" | "instagram" | "facebook" | "telegram" | "phone" | "web"

    // Customer identity (at least one required)
    phone_number: v.optional(v.string()),       // phone number
    platform_user_id: v.optional(v.string()),   // social media user ID
    sender_name: v.optional(v.string()),

    // Conversation
    user_message: v.string(),
    ai_response: v.string(),
    conversation_summary: v.optional(v.string()),

    // Optional
    business_id: v.optional(v.id("business_keys")),
    call_duration_minutes: v.optional(v.number()),
    recording_url: v.optional(v.string()),
    call_type: v.optional(v.string()), // "incoming" | "outgoing"
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Determine the unified customer key
    // Phone-based channels use phone, social channels use platform:userId
    const customerKey = args.phone_number
      || (args.platform_user_id ? `${args.platform}:${args.platform_user_id}` : "unknown");

    // ── 1. CONVERSATION + MESSAGES ──────────────────────────
    // Find or create active conversation for this customer on this platform
    const existingConvos = await ctx.db
      .query("conversations")
      .filter((q) =>
        q.and(
          q.eq(q.field("platform"), args.platform),
          q.eq(q.field("summary"), `active:${customerKey}`)
        )
      )
      .take(1);

    let conversationId;
    if (existingConvos.length > 0) {
      conversationId = existingConvos[0]._id;
    } else {
      conversationId = await ctx.db.insert("conversations", {
        business_id: args.business_id,
        platform: args.platform,
        start_time: now,
        summary: `active:${customerKey}`,
      });
    }

    // Store both messages
    await ctx.db.insert("messages", {
      business_id: args.business_id,
      conversation_id: conversationId,
      content: args.user_message,
      role: "user",
      sender_name: args.sender_name ?? customerKey,
      platform: args.platform,
      timestamp: now,
    });

    await ctx.db.insert("messages", {
      business_id: args.business_id,
      conversation_id: conversationId,
      content: args.ai_response,
      role: "assistant",
      sender_name: "Becca",
      platform: args.platform,
      timestamp: now,
    });

    // ── 2. UNIFIED CUSTOMER (callers table) ─────────────────
    // One upsert handles everything: name, memory, count, channel tracking
    const existingCaller = await ctx.db
      .query("callers")
      .withIndex("by_phone", (q) => q.eq("phone", customerKey))
      .first();

    if (existingCaller) {
      const updates: Record<string, any> = {
        last_call_at: now,
        updated_at: now,
        call_count: (existingCaller.call_count ?? 0) + 1,
        last_channel: args.platform,
      };

      if (args.sender_name && !existingCaller.name) {
        updates.name = args.sender_name;
      }

      // Append to rolling memory
      if (args.conversation_summary) {
        const existing = existingCaller.memory_summary || "";
        const entry = `[${args.platform} ${now.split("T")[0]}] ${args.conversation_summary}`;
        updates.memory_summary = (existing + "\n" + entry).slice(-3000);
      }

      // Append to interaction history
      if (args.conversation_summary) {
        const history = Array.isArray(existingCaller.interaction_history)
          ? existingCaller.interaction_history
          : [];
        updates.interaction_history = [
          ...history,
          { summary: args.conversation_summary, date: now, channel: args.platform },
        ].slice(-50);
      }

      await ctx.db.patch(existingCaller._id, updates);
    } else {
      await ctx.db.insert("callers", {
        phone: customerKey,
        name: args.sender_name ?? undefined,
        call_count: 1,
        memory_summary: args.conversation_summary
          ? `[${args.platform} ${now.split("T")[0]}] ${args.conversation_summary}`
          : undefined,
        interaction_history: args.conversation_summary
          ? [{ summary: args.conversation_summary, date: now, channel: args.platform }]
          : [],
        first_contacted_at: now,
        last_call_at: now,
        last_channel: args.platform,
        updated_at: now,
      });
    }

    // ── 3. CRM: AUTO-CREATE/UPDATE CONTACT + LOG ACTIVITY ───
    // Find existing CRM contact by phone or platform ID
    let existingContact = null;
    if (args.phone_number) {
      const contacts = await ctx.db
        .query("contacts")
        .filter((q) => q.eq(q.field("phone"), args.phone_number))
        .take(1);
      existingContact = contacts[0] ?? null;
    }
    if (!existingContact && args.platform_user_id) {
      const contacts = await ctx.db
        .query("contacts")
        .filter((q) => q.eq(q.field("source"), `${args.platform}:${args.platform_user_id}`))
        .take(1);
      existingContact = contacts[0] ?? null;
    }

    let contactId;
    if (existingContact) {
      contactId = existingContact._id;
      await ctx.db.patch(existingContact._id, {
        updated_at: now,
        ...(args.sender_name && !existingContact.name ? { name: args.sender_name } : {}),
      });
    } else {
      contactId = await ctx.db.insert("contacts", {
        business_id: args.business_id,
        name: args.sender_name ?? undefined,
        phone: args.phone_number ?? undefined,
        source: args.platform_user_id
          ? `${args.platform}:${args.platform_user_id}`
          : args.platform,
        notes: `Auto-created from ${args.platform} interaction`,
        tags: [args.platform],
        created_at: now,
        updated_at: now,
      });
    }

    // Log CRM activity
    await ctx.db.insert("activities", {
      business_id: args.business_id,
      contact_id: contactId,
      type: args.platform === "phone" ? "call" : "message",
      title: `${args.platform} ${args.platform === "phone" ? "call" : "conversation"}`,
      description: args.conversation_summary
        || `${args.sender_name || customerKey}: "${args.user_message.slice(0, 100)}..."`,
      completed: true,
      created_at: now,
      updated_at: now,
    });

    // ── 4. AUTO-LEAD DETECTION ────────────────────────────────
    // If the customer mentions buying, selling, renting, or property keywords,
    // auto-create a lead in the pipeline
    const combinedText = (args.user_message + " " + (args.conversation_summary || "")).toLowerCase();
    const leadKeywords = /\b(buy|buying|purchase|sell|selling|rent|renting|lease|leasing|property|apartment|house|condo|land|bedroom|listing|mortgage|viewing|tour|schedule a visit)\b/i;

    if (leadKeywords.test(combinedText) && contactId) {
      // Check if this contact already has an active lead
      const existingLeads = await ctx.db
        .query("leads")
        .withIndex("by_contact_id", (q) => q.eq("contact_id", contactId))
        .collect();
      const hasActiveLead = existingLeads.some(
        (l) => l.status !== "closed_won" && l.status !== "closed_lost"
      );

      if (!hasActiveLead) {
        // Detect lead type from keywords
        let leadType = "buyer";
        if (/sell|selling|list/i.test(combinedText)) leadType = "seller";
        if (/rent|renting|lease|leasing/i.test(combinedText)) leadType = "renter";
        if (/invest|investment|portfolio/i.test(combinedText)) leadType = "investor";

        await ctx.db.insert("leads", {
          business_id: args.business_id,
          contact_id: contactId,
          title: `${args.sender_name || customerKey} — ${leadType} lead from ${args.platform}`,
          status: "new",
          lead_type: leadType,
          source: args.platform,
          property_interest: combinedText.match(/(\d+)\s*bed/i)?.[0] || undefined,
          notes: `Auto-created from ${args.platform}: "${args.user_message.slice(0, 150)}"`,
          created_at: now,
          updated_at: now,
        });

        // Update contact's active_leads_count
        if (existingContact) {
          await ctx.db.patch(contactId, {
            active_leads_count: (existingContact.active_leads_count ?? 0) + 1,
          });
        }
      }
    }

    // ── 5. PHONE-ONLY: CALL HISTORY + TRANSCRIPT ────────────
    if (args.platform === "phone") {
      await ctx.db.insert("call_history", {
        business_id: args.business_id,
        conversation_id: conversationId as any,
        type: args.call_type ?? "incoming",
        number: args.phone_number ?? "Unknown",
        topic: args.conversation_summary ?? args.user_message.slice(0, 100),
        duration_minutes: args.call_duration_minutes,
        recording_url: args.recording_url,
        timestamp: now,
      });

      // Auto-create transcript
      if (args.conversation_summary) {
        await ctx.db.insert("transcripts", {
          business_id: args.business_id,
          conversation_id: conversationId as any,
          transcript_text: args.conversation_summary,
          caller_info: args.phone_number ?? "Unknown",
          sales_flagged: /buy|purchase|\$|price|deal|offer/i.test(args.user_message + " " + args.ai_response),
          timestamp: now,
        });
      }
    }

    return { conversationId, customerKey, contactId };
  },
});

// ─── BEFORE AI RESPONDS: Get customer context ────────────────
// This is injected into the AI system prompt so it knows who it's talking to
export const getCustomerContext = query({
  args: {
    phone_number: v.optional(v.string()),
    platform_user_id: v.optional(v.string()),
    platform: v.optional(v.string()),
  },
  handler: async (ctx, { phone_number, platform_user_id, platform }) => {
    const customerKey = phone_number
      || (platform_user_id && platform ? `${platform}:${platform_user_id}` : null);

    if (!customerKey) {
      return {
        isReturning: false,
        name: null,
        callCount: 0,
        memorySummary: null,
        lastCallAt: null,
        lastChannel: null,
        crmTags: [],
        recentMessages: [],
      };
    }

    // Lookup unified customer record
    const caller = await ctx.db
      .query("callers")
      .withIndex("by_phone", (q) => q.eq("phone", customerKey))
      .first();

    // Lookup CRM contact
    let contact = null;
    if (phone_number) {
      const contacts = await ctx.db
        .query("contacts")
        .filter((q) => q.eq(q.field("phone"), phone_number))
        .take(1);
      contact = contacts[0] ?? null;
    }
    if (!contact && platform_user_id && platform) {
      const contacts = await ctx.db
        .query("contacts")
        .filter((q) => q.eq(q.field("source"), `${platform}:${platform_user_id}`))
        .take(1);
      contact = contacts[0] ?? null;
    }

    // Get recent messages for conversation context
    let recentMessages: any[] = [];
    const convos = await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("summary"), `active:${customerKey}`))
      .take(1);

    if (convos.length > 0) {
      const msgs = await ctx.db
        .query("messages")
        .withIndex("by_conversation_id", (q) => q.eq("conversation_id", convos[0]._id))
        .order("desc")
        .take(10);
      recentMessages = msgs.reverse().map((m) => ({
        role: m.role,
        content: m.content,
        platform: m.platform,
        timestamp: m.timestamp,
      }));
    }

    return {
      isReturning: !!caller,
      name: caller?.name ?? contact?.name ?? null,
      callCount: caller?.call_count ?? 0,
      memorySummary: caller?.memory_summary ?? null,
      lastCallAt: caller?.last_call_at ?? null,
      lastChannel: caller?.last_channel ?? null,
      crmTags: contact?.tags ?? [],
      recentMessages,
    };
  },
});
