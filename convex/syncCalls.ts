import { action, internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ─── CLEAR ALL SYNCED DATA (for re-sync) ────────────────────────────
export const clearSyncedData = mutation({
  handler: async (ctx) => {
    // Clear call_history
    const calls = await ctx.db.query("call_history").collect();
    for (const c of calls) await ctx.db.delete(c._id);

    // Clear transcripts
    const transcripts = await ctx.db.query("transcripts").collect();
    for (const t of transcripts) await ctx.db.delete(t._id);

    // NOTE: Do NOT clear callers — they are persistent memory used for greeting
    // callers by name. Clearing them breaks the "Hi {{caller_name}}" greeting.

    // Clear contacts (CRM contacts, will be recreated from sync)
    const contacts = await ctx.db.query("contacts").collect();
    for (const c of contacts) await ctx.db.delete(c._id);

    // Clear activities
    const activities = await ctx.db.query("activities").collect();
    for (const a of activities) await ctx.db.delete(a._id);

    // Clear leads
    const leads = await ctx.db.query("leads").collect();
    for (const l of leads) await ctx.db.delete(l._id);

    return { cleared: true };
  },
});

// ─── INTERNAL MUTATION: Write a single call to the database ─────────
export const writeCall = internalMutation({
  args: {
    telnyx_conversation_id: v.string(),
    caller_phone: v.string(),
    call_type: v.string(),
    started_at: v.string(),
    ended_at: v.string(),
    duration_minutes: v.number(),
    transcript_text: v.string(),
    caller_name: v.optional(v.string()),
    topic: v.optional(v.string()),
    recording_url: v.optional(v.string()),
    save_customer_notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const transcript = args.transcript_text.toLowerCase();
    const hasTranscript = args.transcript_text.length > 30;

    // Check if this conversation already exists in call_history
    const existing = await ctx.db
      .query("call_history")
      .filter((q) => q.eq(q.field("conversation_id"), args.telnyx_conversation_id))
      .first();

    if (existing) {
      // If we have a better transcript now, update everything
      if (hasTranscript) {
        // Update call_history
        await ctx.db.patch(existing._id, {
          ...(args.recording_url ? { recording_url: args.recording_url } : {}),
          ...(args.topic && args.topic !== `Phone call (${args.call_type})` ? { topic: args.topic } : {}),
          ...(args.duration_minutes > (existing.duration_minutes || 0) ? { duration_minutes: args.duration_minutes } : {}),
        });

        // Update or create transcript
        const existingTranscript = await ctx.db
          .query("transcripts")
          .filter((q) => q.eq(q.field("conversation_id"), args.telnyx_conversation_id))
          .first();

        if (existingTranscript) {
          if (!existingTranscript.transcript_text || existingTranscript.transcript_text.length < args.transcript_text.length) {
            await ctx.db.patch(existingTranscript._id, {
              transcript_text: args.transcript_text,
              caller_info: args.caller_name || existingTranscript.caller_info,
            });
          }
        } else {
          await ctx.db.insert("transcripts", {
            conversation_id: args.telnyx_conversation_id,
            transcript_text: args.transcript_text,
            caller_info: args.caller_name || args.caller_phone,
            timestamp: args.started_at,
          });
        }

        // ── RE-RUN APPOINTMENT DETECTION ON UPDATED TRANSCRIPT ──
        // Check if we already created a viewing activity for this call
        const existingContact = await ctx.db
          .query("contacts")
          .filter((q) => q.eq(q.field("phone"), args.caller_phone))
          .first();

        if (existingContact) {
          // Update contact name if we now have it
          if (args.caller_name && !existingContact.name) {
            await ctx.db.patch(existingContact._id, { name: args.caller_name, updated_at: now });
          }

          // Check if viewing activity already exists for this contact
          const existingViewing = await ctx.db
            .query("activities")
            .withIndex("by_contact_id", (q) => q.eq("contact_id", existingContact._id))
            .collect();
          const hasViewingAlready = existingViewing.some(
            (a) => (a.activity_type === "viewing" || a.type === "viewing") && a.created_at === args.started_at
          );

          if (!hasViewingAlready) {
            // Detect appointment from transcript OR save_customer notes
            const appointmentFromTranscript = transcript.match(
              /\b(appointment|viewing|schedule a visit|schedule a tour|schedule a viewing|come see|visit the|tour the|show me|book a viewing|book a visit|schedule viewing|want to view|want to see)\b/
            );
            const appointmentFromNotes = args.save_customer_notes?.toLowerCase().match(
              /\b(viewing|appointment|scheduled|visit)\b/
            );

            if (appointmentFromTranscript || appointmentFromNotes) {
              // Extract date/time from save_customer notes if available
              const notes = args.save_customer_notes || "";
              const nameOrPhone = args.caller_name || args.caller_phone;

              // Try to parse a real date from the notes
              let scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
              const dateMatch = notes.match(/(\w+ \d{1,2}(?:st|nd|rd|th)?,?\s*\d{4})/i);
              const timeMatch = notes.match(/(\d{1,2})\s*(AM|PM|am|pm)/);
              if (dateMatch) {
                try {
                  const parsed = new Date(dateMatch[1]);
                  if (timeMatch) {
                    let hours = parseInt(timeMatch[1]);
                    if (timeMatch[2].toLowerCase() === "pm" && hours < 12) hours += 12;
                    if (timeMatch[2].toLowerCase() === "am" && hours === 12) hours = 0;
                    parsed.setHours(hours, 0, 0);
                  }
                  if (!isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
                    scheduledAt = parsed.toISOString();
                  }
                } catch { /* use default */ }
              }

              await ctx.db.insert("activities", {
                contact_id: existingContact._id,
                type: "viewing",
                activity_type: "viewing",
                title: `Viewing appointment — ${nameOrPhone}`,
                description: notes || `Caller expressed interest in scheduling a viewing during phone call.`,
                completed: false,
                is_completed: false,
                is_ai_generated: true,
                scheduled_at: scheduledAt,
                created_at: args.started_at,
              });

              // Upgrade contact temperature to hot
              if (existingContact.temperature !== "hot") {
                await ctx.db.patch(existingContact._id, { temperature: "hot", updated_at: now });
              }
            }
          }
        }

        return { status: "updated", reason: "transcript_refreshed_with_crm" };
      }
      return { status: "skipped", reason: "already_synced" };
    }

    // ═══════════════════════════════════════════════════════════
    // NEW CALL — Full CRM processing
    // ═══════════════════════════════════════════════════════════

    // ── Categorize caller from transcript keywords ──
    let callerCategory: "buyer" | "seller" | "renter" | "unknown" = "unknown";
    if (/\b(sell|list my|listing my|put .* on (the )?market)\b/.test(transcript)) {
      callerCategory = "seller";
    } else if (/\b(rent|lease|renting|leasing)\b/.test(transcript)) {
      callerCategory = "renter";
    } else if (/\b(buy|purchase|buying|purchasing)\b/.test(transcript)) {
      callerCategory = "buyer";
    }

    // ── Detect high-interest signals ──
    const hasInterest = /\b(interested|viewing|appointment|schedule|visit|tour|show me|see the (house|property|place|unit))\b/.test(transcript);
    const contactTemperature = hasInterest ? "hot" : "warm";
    const leadStatus = hasInterest ? "qualified" : "new";

    // ── Build dynamic tags ──
    const tags: string[] = ["phone"];
    if (callerCategory !== "unknown") tags.push(callerCategory);

    // ── Build lead title with category ──
    const nameOrPhone = args.caller_name || args.caller_phone;
    const leadTitle = callerCategory !== "unknown"
      ? `${nameOrPhone} (${callerCategory})`
      : nameOrPhone;

    // 1. Write to call_history
    await ctx.db.insert("call_history", {
      conversation_id: args.telnyx_conversation_id,
      type: args.call_type,
      number: args.caller_phone,
      topic: args.topic || `Phone call (${args.call_type})`,
      duration_minutes: args.duration_minutes,
      recording_url: args.recording_url,
      timestamp: args.started_at,
    });

    // 2. Write to transcripts
    if (args.transcript_text) {
      await ctx.db.insert("transcripts", {
        conversation_id: args.telnyx_conversation_id,
        transcript_text: args.transcript_text,
        caller_info: args.caller_name || args.caller_phone,
        timestamp: args.started_at,
      });
    }

    // 3. Upsert caller in callers table
    const existingCaller = await ctx.db
      .query("callers")
      .withIndex("by_phone", (q) => q.eq("phone", args.caller_phone))
      .first();

    const summary = args.topic || `Phone call (${args.call_type}), ${args.duration_minutes.toFixed(1)} min`;

    if (existingCaller) {
      const existingMemory = existingCaller.memory_summary || "";
      const entry = `[phone ${args.started_at.split("T")[0]}] ${summary}`;
      const history = Array.isArray(existingCaller.interaction_history)
        ? existingCaller.interaction_history
        : [];

      await ctx.db.patch(existingCaller._id, {
        last_call_at: args.started_at,
        updated_at: now,
        call_count: (existingCaller.call_count ?? 0) + 1,
        last_channel: "phone",
        memory_summary: (existingMemory + "\n" + entry).slice(-3000),
        interaction_history: [
          ...history,
          { summary, date: args.started_at, channel: "phone" },
        ].slice(-50),
        ...(args.caller_name && !existingCaller.name ? { name: args.caller_name } : {}),
      });
    } else {
      await ctx.db.insert("callers", {
        phone: args.caller_phone,
        name: args.caller_name ?? undefined,
        call_count: 1,
        memory_summary: `[phone ${args.started_at.split("T")[0]}] ${summary}`,
        interaction_history: [{ summary, date: args.started_at, channel: "phone" }],
        first_contacted_at: args.started_at,
        last_call_at: args.started_at,
        last_channel: "phone",
        updated_at: now,
      });
    }

    // 4. Auto-create CRM contact with temperature based on transcript analysis
    // Use caller name from args, or fall back to callers table (persistent memory)
    const resolvedName = args.caller_name || (existingCaller?.name && existingCaller.name !== "Unknown" ? existingCaller.name : undefined);

    const existingContact = await ctx.db
      .query("contacts")
      .filter((q) => q.eq(q.field("phone"), args.caller_phone))
      .first();

    let contactId;
    if (existingContact) {
      contactId = existingContact._id;
      // Upgrade temperature to hot if interest detected, never downgrade
      const shouldUpgradeTemp = contactTemperature === "hot" && existingContact.temperature !== "hot";
      // Update name if we have one and the contact doesn't
      const needsName = resolvedName && (!existingContact.name || existingContact.name === existingContact.phone);
      await ctx.db.patch(existingContact._id, {
        updated_at: now,
        ...(needsName ? { name: resolvedName, full_name: resolvedName } : {}),
        ...(shouldUpgradeTemp ? { temperature: "hot" } : {}),
        // Merge new tags into existing tags without duplicates
        tags: [...new Set([...(existingContact.tags ?? []), ...tags])],
      });
    } else {
      contactId = await ctx.db.insert("contacts", {
        name: resolvedName ?? undefined,
        full_name: resolvedName ?? undefined,
        phone: args.caller_phone,
        source: "phone",
        notes: `Auto-created from phone call`,
        tags,
        temperature: contactTemperature,
        created_at: now,
        updated_at: now,
      });
    }

    // 5. Log CRM activity
    await ctx.db.insert("activities", {
      contact_id: contactId,
      type: "call",
      activity_type: "call",
      title: `${args.call_type === "incoming" ? "Incoming" : "Outgoing"} call${resolvedName ? " with " + resolvedName : ""}`,
      description: summary,
      completed: true,
      is_completed: true,
      is_ai_generated: true,
      completed_at: args.ended_at,
      created_at: args.started_at,
    });

    // 5b. Appointment/viewing detection — from transcript keywords OR save_customer notes
    const appointmentFromTranscript = transcript.match(
      /\b(appointment|viewing|schedule a visit|schedule a tour|schedule a viewing|come see|visit the|tour the|show me|book a viewing|book a visit|schedule viewing|want to view|want to see)\b/
    );
    const appointmentFromNotes = args.save_customer_notes?.toLowerCase().match(
      /\b(viewing|appointment|scheduled|visit)\b/
    );

    if (appointmentFromTranscript || appointmentFromNotes) {
      const notes = args.save_customer_notes || "";

      // Try to parse a real date from the save_customer notes
      let scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const dateMatch = notes.match(/(\w+ \d{1,2}(?:st|nd|rd|th)?,?\s*\d{4})/i);
      const timeMatch = notes.match(/(\d{1,2})\s*(AM|PM|am|pm)/);
      if (dateMatch) {
        try {
          const parsed = new Date(dateMatch[1]);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            if (timeMatch[2].toLowerCase() === "pm" && hours < 12) hours += 12;
            if (timeMatch[2].toLowerCase() === "am" && hours === 12) hours = 0;
            parsed.setHours(hours, 0, 0);
          }
          if (!isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
            scheduledAt = parsed.toISOString();
          }
        } catch { /* use default */ }
      }

      await ctx.db.insert("activities", {
        contact_id: contactId,
        type: "viewing",
        activity_type: "viewing",
        title: `Viewing appointment — ${nameOrPhone}`,
        description: notes || `Caller expressed interest in scheduling a viewing/appointment during phone call. Keyword detected: "${(appointmentFromTranscript || appointmentFromNotes)?.[0]}". Follow up to confirm date and time.`,
        completed: false,
        is_completed: false,
        is_ai_generated: true,
        scheduled_at: scheduledAt,
        created_at: args.started_at,
      });
    }

    // 6. Auto-create lead with category and interest-based status
    const existingLead = await ctx.db
      .query("leads")
      .filter((q) => q.eq(q.field("contact_id"), contactId))
      .first();

    if (!existingLead) {
      const appointmentNote = (appointmentFromTranscript || appointmentFromNotes)
        ? ` | Appointment/viewing interest detected — follow up to confirm.`
        : "";
      // Map caller category to lead_type for pipeline display
      const leadType = callerCategory !== "unknown" ? callerCategory : undefined;
      await ctx.db.insert("leads", {
        contact_id: contactId,
        title: leadTitle,
        status: leadStatus,
        lead_type: leadType,
        priority: hasInterest ? "high" : "medium",
        source: "phone",
        notes: (callerCategory !== "unknown"
          ? `Auto-created from phone call — categorized as ${callerCategory}`
          : `Auto-created from phone call`) + appointmentNote,
        created_at: now,
        updated_at: now,
      });
    } else {
      // Update existing lead: add category if missing, upgrade status if interest detected
      const updates: Record<string, any> = { updated_at: now };
      if (callerCategory !== "unknown" && !existingLead.title?.includes(callerCategory)) {
        updates.title = `${existingLead.title} (${callerCategory})`;
      }
      if (hasInterest && existingLead.status === "new") {
        updates.status = "interested";
      }
      if ((appointmentFromTranscript || appointmentFromNotes) && !(existingLead.notes ?? "").includes("Appointment/viewing interest")) {
        updates.notes = (existingLead.notes ?? "") + ` | Appointment/viewing interest detected — follow up to confirm.`;
      }
      if (Object.keys(updates).length > 1) {
        await ctx.db.patch(existingLead._id, updates);
      }
    }

    return { status: "synced" };
  },
});

// ─── ACTION: Fetch recent calls from Telnyx and sync them ─────────
export const syncRecentCalls = action({
  args: {
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const telnyxKey = process.env.TELNYX_API_KEY;
    const assistantId = process.env.TELNYX_ASSISTANT_ID;
    const telnyxPhone = process.env.TELNYX_PHONE_NUMBER || "";

    if (!telnyxKey || !assistantId) {
      return { error: "TELNYX_API_KEY or TELNYX_ASSISTANT_ID not set" };
    }

    const pageSize = args.pageSize || 10;

    // 1. Fetch recent conversations
    const convosRes = await fetch(
      `https://api.telnyx.com/v2/ai/conversations?page%5Bsize%5D=${pageSize}`,
      { headers: { Authorization: `Bearer ${telnyxKey}` } }
    );
    if (!convosRes.ok) return { error: `Telnyx conversations API: ${convosRes.status}` };
    const { data: conversations } = await convosRes.json();

    // 2. Fetch recent recordings (match by call_session_id AND call_leg_id)
    const recsRes = await fetch(
      `https://api.telnyx.com/v2/recordings?page%5Bsize%5D=100`,
      { headers: { Authorization: `Bearer ${telnyxKey}` } }
    );
    const recordingsBySession: Record<string, string> = {};
    const recordingsByLeg: Record<string, string> = {};
    if (recsRes.ok) {
      const { data: recs } = await recsRes.json();
      for (const r of recs) {
        const url = r.download_urls?.wav || r.download_urls?.mp3;
        if (!url) continue;
        if (r.call_session_id) recordingsBySession[r.call_session_id] = url;
        if (r.call_leg_id) recordingsByLeg[r.call_leg_id] = url;
      }
    }

    let synced = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const convo of conversations) {
      if (convo.metadata?.assistant_id !== assistantId) { skipped++; continue; }
      if (convo.metadata?.telnyx_conversation_channel !== "phone_call") { skipped++; continue; }

      // Skip conversations that might still be active
      const lastMsgTime = convo.last_message_at ? new Date(convo.last_message_at).getTime() : 0;
      const threeMinutesAgo = Date.now() - 3 * 60 * 1000;
      if (lastMsgTime > threeMinutesAgo && convo.status !== "ended" && convo.status !== "completed") {
        skipped++;
        continue;
      }

      const fromNumber = convo.metadata.from || "";
      const toNumber = convo.metadata.to || "";

      // Direction
      let callType = "incoming";
      let callerPhone = fromNumber;
      if (fromNumber && telnyxPhone && fromNumber.replace(/\D/g, "").endsWith(telnyxPhone.replace(/\D/g, "").slice(-10))) {
        callType = "outgoing";
        callerPhone = toNumber;
      }

      // Recording URL — try call_session_id first, then call_leg_id
      const sessionId = convo.metadata.call_session_id;
      const legId = convo.metadata.call_leg_id;
      const recordingUrl =
        (sessionId ? recordingsBySession[sessionId] : undefined) ||
        (legId ? recordingsByLeg[legId] : undefined);

      // Fetch ALL messages for transcript + caller name + save_customer notes (ALL pages)
      let transcriptText = "";
      let lookupName: string | undefined;
      let savedName: string | undefined;
      let saveCustomerNotes: string | undefined;

      try {
        const allMessages: any[] = [];
        let pageNum = 1;
        let totalPages = 1;

        while (pageNum <= totalPages) {
          const msgsUrl = pageNum === 1
            ? `https://api.telnyx.com/v2/ai/conversations/${convo.id}/messages`
            : `https://api.telnyx.com/v2/ai/conversations/${convo.id}/messages?page%5Bnumber%5D=${pageNum}&page%5Bsize%5D=20`;
          const msgsRes: Response = await fetch(msgsUrl, {
            headers: { Authorization: `Bearer ${telnyxKey}` },
          });
          if (!msgsRes.ok) break;

          const msgsJson: any = await msgsRes.json();
          if (msgsJson.data) allMessages.push(...msgsJson.data);

          // Use total_pages from meta for pagination
          totalPages = msgsJson.meta?.total_pages || 1;
          pageNum++;
        }

        if (allMessages.length > 0) {
          const lines: string[] = [];

          // Messages come newest-first, reverse for chronological order
          for (const msg of allMessages.reverse()) {
            const text = msg.text || "";

            if (msg.role === "user" && text) {
              lines.push(`Caller: ${text}`);
            } else if (msg.role === "assistant") {
              // Extract save_customer tool call data (appointment info lives here)
              if (msg.tool_calls) {
                for (const tc of msg.tool_calls) {
                  if (tc.function?.name === "save_customer") {
                    try {
                      const toolArgs = JSON.parse(tc.function.arguments || "{}");
                      if (toolArgs.name && !savedName) savedName = toolArgs.name;
                      if (toolArgs.notes) saveCustomerNotes = toolArgs.notes;
                    } catch { /* ignore */ }
                  }
                }
              }
              // Strip emotion tags from displayed text
              const cleanText = text.replace(/<emotion[^>]*\/>/g, "").trim();
              if (cleanText) lines.push(`Becca: ${cleanText}`);
            } else if (msg.role === "tool" && text) {
              // Extract name from customer_lookup results (highest priority — from CRM data)
              try {
                const result = JSON.parse(text);
                if (result.context_prompt) {
                  const nameMatch = result.context_prompt.match(/caller named (\w+[\w\s]*\w)/);
                  if (nameMatch) lookupName = nameMatch[1].trim();
                }
              } catch { /* ignore */ }
            }
          }
          transcriptText = lines.join("\n");
        }
      } catch { /* continue */ }

      // Duration
      const start = new Date(convo.created_at);
      const end = new Date(convo.last_message_at || convo.created_at);
      const durationMin = Math.max(0.1, Math.round((end.getTime() - start.getTime()) / 60000 * 10) / 10);

      // Topic from first meaningful caller message
      let topic = `Phone call (${callType})`;
      const firstCallerMsg = transcriptText.split("\n").find(l => l.startsWith("Caller:"));
      if (firstCallerMsg) topic = firstCallerMsg.replace("Caller: ", "").slice(0, 100);

      try {
        const result = await ctx.runMutation(internal.syncCalls.writeCall, {
          telnyx_conversation_id: convo.id,
          caller_phone: callerPhone,
          call_type: callType,
          started_at: convo.created_at,
          ended_at: convo.last_message_at || convo.created_at,
          duration_minutes: durationMin,
          transcript_text: transcriptText,
          caller_name: lookupName || savedName,
          topic,
          recording_url: recordingUrl,
          save_customer_notes: saveCustomerNotes,
        });
        if (result.status === "synced") synced++;
        else if (result.status === "updated") updated++;
        else skipped++;
      } catch (err) {
        console.error("Sync error:", convo.id, err);
        errors++;
      }
    }

    return { total: conversations.length, synced, updated, skipped, errors };
  },
});
