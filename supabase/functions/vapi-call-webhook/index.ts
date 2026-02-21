import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("📞 Received VAPI webhook:", JSON.stringify(payload, null, 2));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const eventType = payload.type || payload.message?.type;
    console.log("📊 Event type:", eventType);

    // ====== ASSISTANT-REQUEST: PRE-CALL MEMORY INJECTION ======
    if (eventType === "assistant-request") {
      console.log("🧠 Assistant-request received — injecting memory before call starts");

      const callData = payload.message?.call || payload.call || {};
      const customerNumber = callData.customer?.number || "";
      const assistantId = payload.message?.assistant?.id || payload.assistant?.id || "";

      const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY");
      let existingSystemPrompt = "";
      let existingFirstMessage = "";

      if (VAPI_API_KEY && assistantId) {
        try {
          const assistantRes = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
            headers: { "Authorization": `Bearer ${VAPI_API_KEY}` }
          });
          if (assistantRes.ok) {
            const assistantConfig = await assistantRes.json();
            const sysMsg = (assistantConfig.model?.messages || []).find((m: any) => m.role === "system");
            existingSystemPrompt = sysMsg?.content || "";
            existingFirstMessage = assistantConfig.firstMessage || "";
            console.log("📋 Fetched existing system prompt length:", existingSystemPrompt.length);
          } else {
            const errText = await assistantRes.text();
            console.error("⚠️ Could not fetch assistant config:", errText);
          }
        } catch (e) {
          console.error("⚠️ Error fetching assistant:", e);
        }
      }

      let memoryContext = "";
      let memoryFirstMessage = "";

      if (customerNumber && customerNumber !== "Web Call") {
        console.log("📞 Looking up memory for:", customerNumber);

        const { data: memData } = await supabase
          .from("customer_memory")
          .select("*")
          .eq("phone_number", customerNumber)
          .maybeSingle();

        if (memData) {
          const lastContact = new Date(memData.last_contacted_at);
          const now = new Date();
          const daysSince = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));

          const callHistory = (memData.call_history as any[]) || [];
          const recentSummaries = callHistory.slice(-2).map((h: any) => h.summary).filter(Boolean);
          const lastSummary = recentSummaries.length > 0 ? recentSummaries[recentSummaries.length - 1] : null;

          let timeRef = "";
          if (daysSince === 0) timeRef = "earlier today";
          else if (daysSince === 1) timeRef = "yesterday";
          else if (daysSince <= 6) timeRef = `a few days ago`;
          else if (daysSince <= 30) timeRef = "a couple of weeks ago";
          else timeRef = "a while back";

          memoryContext = `\n\n=== CALLER CONTEXT (PRE-LOADED BY SYSTEM — YOU ALREADY KNOW THIS) ===
This is a RETURNING caller. Their phone number is ${customerNumber}.
${memData.name ? `Their name is ${memData.name}.` : "You do NOT know their name yet. At a natural point later in the conversation (NOT immediately), casually ask 'By the way, may I know your name?' — ask ONLY ONCE. If they provide it, call save_customer_name with their phone number and name."}
They have called ${memData.conversation_count} times before.
You last spoke ${timeRef}.
${lastSummary ? `What you discussed last time: ${lastSummary}` : ""}
${recentSummaries.length > 1 ? `What you discussed the time before: ${recentSummaries[0]}` : ""}

YOUR GREETING MUST reflect that you remember them. ${memData.name ? `Use their name "${memData.name}".` : ""} Reference when you last spoke naturally. If relevant, mention what you talked about.
NEVER mention databases, records, memory systems, or that you "looked them up."
Sound natural, like you genuinely remember them from your last conversation.
=== END CALLER CONTEXT ===`;

          const nameGreet = memData.name ? `, ${memData.name}` : "";
          if (daysSince === 0) {
            memoryFirstMessage = `Hey${nameGreet}! Good to hear from you again today!${lastSummary ? ` We were just talking about something earlier — how's that going?` : ""}`;
          } else if (daysSince === 1) {
            memoryFirstMessage = `Hey${nameGreet}! We just spoke yesterday, right? Welcome back!${lastSummary ? ` Last time you were asking about something — did that work out?` : ""}`;
          } else if (daysSince <= 6) {
            memoryFirstMessage = `Hey${nameGreet}! We chatted a few days ago — good to hear from you again!${lastSummary ? ` How did things go since we last talked?` : ""}`;
          } else if (daysSince <= 30) {
            memoryFirstMessage = `Hey${nameGreet}! It's been a little while! Good to hear from you again.`;
          } else {
            memoryFirstMessage = `Hey${nameGreet}! It's been a while since we last spoke! Welcome back.`;
          }

          console.log("✅ Memory found — injecting. Calls:", memData.conversation_count, "Days since:", daysSince);
        } else {
          memoryContext = `\n\n=== CALLER CONTEXT (PRE-LOADED BY SYSTEM) ===
This is a FIRST-TIME caller. Their phone number is ${customerNumber}.
You do NOT know their name. At a natural point later in the conversation (NOT immediately), casually ask their name ONCE. If they provide it, call save_customer_name with their phone number and name.
=== END CALLER CONTEXT ===`;
          console.log("ℹ️ No memory found — first-time caller");
        }
      }

      const finalSystemPrompt = existingSystemPrompt + memoryContext;
      const response: any = {
        assistant: {
          model: {
            messages: [
              { role: "system", content: finalSystemPrompt }
            ]
          }
        }
      };

      if (memoryFirstMessage) {
        response.assistant.firstMessage = memoryFirstMessage;
      }

      console.log("📤 Returning assistant-request response with memory context");
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== TRANSFER DESTINATION REQUEST ======
    if (eventType === "transfer-destination-request") {
      console.log("🔀 Transfer destination request received");

      const { data: custData } = await supabase
        .from("customizations")
        .select("owner_phone, business_name")
        .limit(1)
        .maybeSingle();

      const humanPhone = custData?.owner_phone;

      if (!humanPhone) {
        console.error("❌ No human support phone configured");
        return new Response(
          JSON.stringify({ error: "No human support number configured" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("✅ Transferring call to:", humanPhone);
      return new Response(
        JSON.stringify({
          destination: {
            type: "number",
            number: humanPhone,
            message: `Connecting you to a team member now. One moment please.`
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== END-OF-CALL-REPORT ======
    if (eventType === "end-of-call-report") {
      const data = payload.message || payload;
      const callId = data.call?.id || data.callId || data.id || "unknown";

      // ===== CHECK IF THIS IS AN ESCALATION CALL ENDING =====
      const { data: escReq } = await supabase
        .from("escalation_requests")
        .select("*")
        .eq("escalation_call_id", callId)
        .eq("status", "pending")
        .maybeSingle();

      if (escReq) {
        console.log("🔄 Escalation call ended — relaying response to parent call");

        // Extract what the human said
        let humanResponse = "";
        let humanWantsTakeover = false;

        if (data.artifact?.messagesOpenAIFormatted) {
          const msgs = data.artifact.messagesOpenAIFormatted.filter((m: any) => m.role === "user");
          humanResponse = msgs.map((m: any) => m.content).join(" ").trim();
        } else if (data.artifact?.messages) {
          const msgs = data.artifact.messages.filter((m: any) => m.role === "user" || m.role === "human");
          humanResponse = msgs.map((m: any) => m.message || m.content || "").join(" ").trim();
        }

        // Check if human wants takeover
        const takeoverPhrases = ["transfer", "put them through", "let me talk", "let me speak", "i'll handle", "i will handle", "connect me"];
        const lowerResponse = humanResponse.toLowerCase();
        humanWantsTakeover = takeoverPhrases.some(p => lowerResponse.includes(p));

        console.log("👤 Human response:", humanResponse);
        console.log("🔀 Wants takeover:", humanWantsTakeover);

        // Update escalation record
        await supabase
          .from("escalation_requests")
          .update({
            human_response: humanResponse,
            status: humanWantsTakeover ? "takeover" : "answered",
            updated_at: new Date().toISOString(),
          })
          .eq("id", escReq.id);

        // ===== INJECT RESPONSE INTO PARENT CALL VIA controlUrl =====
        if (escReq.control_url) {
          try {
            if (humanWantsTakeover) {
              // Get owner phone for transfer
              const { data: custData } = await supabase
                .from("customizations")
                .select("owner_phone")
                .limit(1)
                .maybeSingle();

              if (custData?.owner_phone) {
                // Tell customer about transfer
                await fetch(escReq.control_url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "say",
                    content: "Great news — our team member wants to speak with you directly. Connecting you now.",
                    immediate: true,
                  }),
                });

                // Small delay then transfer
                await new Promise(r => setTimeout(r, 2000));

                await fetch(escReq.control_url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "transfer",
                    destination: custData.owner_phone,
                  }),
                });
                console.log("✅ Transfer command sent to parent call");
              }
            } else if (humanResponse) {
              // Step 1: Inject into assistant memory
              await fetch(escReq.control_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "add-message",
                  message: {
                    role: "system",
                    content: `Human support response about "${escReq.item_requested}": ${humanResponse}`,
                  },
                }),
              });
              console.log("✅ add-message sent to parent call");

              // Step 2: Speak the answer to the customer
              await fetch(escReq.control_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "say",
                  content: `Thanks for holding! I checked with our team — ${humanResponse}. Would you like to proceed or is there anything else I can help with?`,
                  immediate: true,
                }),
              });
              console.log("✅ say command sent to parent call");
            } else {
              // Human didn't say anything useful
              await fetch(escReq.control_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "say",
                  content: "Sorry about the wait — I wasn't able to get a clear answer from our team this time. Can I help you with anything else?",
                  immediate: true,
                }),
              });
              console.log("⚠️ No useful human response, sent fallback to customer");
            }
          } catch (ctrlErr) {
            console.error("❌ Error sending controlUrl commands:", ctrlErr);
          }
        } else {
          console.error("❌ No controlUrl stored for this escalation");
        }

        // Don't process this as a normal call — return early
        return new Response(
          JSON.stringify({ success: true, escalation_handled: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ===== NORMAL CALL END PROCESSING =====
      let transcriptText = "";
      if (data.artifact?.messagesOpenAIFormatted) {
        transcriptText = data.artifact.messagesOpenAIFormatted
          .filter((m: any) => m.role !== "system")
          .map((m: any) => {
            const role = m.role === "assistant" ? "AI" : "User";
            return `${role}: ${m.content}`;
          })
          .join("\n");
      } else if (data.artifact?.messages) {
        transcriptText = data.artifact.messages
          .filter((m: any) => m.role !== "system")
          .map((m: any) => {
            const role = m.role === "bot" || m.role === "assistant" ? "AI" : "User";
            return `${role}: ${m.message || m.content || ''}`;
          })
          .join("\n");
      }

      let durationSeconds = 0;
      if (data.startedAt && data.endedAt) {
        durationSeconds = Math.round(
          (new Date(data.endedAt).getTime() - new Date(data.startedAt).getTime()) / 1000
        );
      } else if (data.artifact?.messages && data.artifact.messages.length > 0) {
        const messages = data.artifact.messages.filter((m: any) => m.role !== "system");
        if (messages.length > 0) {
          const firstTime = messages[0].time;
          const lastMsg = messages[messages.length - 1];
          const lastTime = lastMsg.endTime || lastMsg.time;
          durationSeconds = Math.round((lastTime - firstTime) / 1000);
        }
      }

      const callType = data.call?.type || data.type;
      const isInbound = callType === "inboundPhoneCall" || callType === "webCall";
      const type = isInbound ? "incoming" : "outgoing";
      const customerNumber = data.call?.customer?.number || "Web Call";
      const callerInfo = customerNumber;
      const timestamp = data.startedAt || data.call?.createdAt || new Date().toISOString();
      const durationMinutes = Math.ceil(durationSeconds / 60);

      const callSummary = data.analysis?.summary || 
                          data.summary || 
                          transcriptText.substring(0, 500) || 
                          "Call completed";

      console.log("💾 Saving call data:", { transcriptText: transcriptText.substring(0, 100), durationSeconds, callId, type, customerNumber });

      // ====== CUSTOMER MEMORY ENGINE ======
      if (customerNumber && customerNumber !== "Web Call") {
        console.log("🧠 Processing customer memory for:", customerNumber);

        const { data: existingMemory } = await supabase
          .from("customer_memory")
          .select("*")
          .eq("phone_number", customerNumber)
          .maybeSingle();

        if (existingMemory) {
          const existingHistory = (existingMemory.call_history as any[]) || [];
          existingHistory.push({
            summary: callSummary,
            date: new Date().toISOString(),
          });

          const { error: memError } = await supabase
            .from("customer_memory")
            .update({
              conversation_count: existingMemory.conversation_count + 1,
              last_contacted_at: new Date().toISOString(),
              call_history: existingHistory,
            })
            .eq("phone_number", customerNumber);

          if (memError) console.error("❌ Error updating customer_memory:", memError);
          else console.log("✅ Customer memory updated. Total calls:", existingMemory.conversation_count + 1);
        } else {
          const { error: memError } = await supabase
            .from("customer_memory")
            .insert({
              phone_number: customerNumber,
              conversation_count: 1,
              first_contacted_at: new Date().toISOString(),
              last_contacted_at: new Date().toISOString(),
              call_history: [{ summary: callSummary, date: new Date().toISOString() }],
            });

          if (memError) console.error("❌ Error inserting customer_memory:", memError);
          else console.log("✅ New customer memory created for:", customerNumber);
        }
      }

      // Check if call already exists in history
      const { data: existingCall } = await supabase
        .from("call_history")
        .select("id")
        .eq("conversation_id", callId)
        .limit(1)
        .maybeSingle();

      if (existingCall) {
        await supabase
          .from("call_history")
          .update({ duration_minutes: durationMinutes, timestamp })
          .eq("conversation_id", callId);
        console.log("✅ Updated existing call history record");
      } else {
        const { error: historyError } = await supabase.from("call_history").insert({
          type,
          number: customerNumber,
          topic: `Call for DREALHECTOR`,
          duration_minutes: durationMinutes,
          timestamp,
          conversation_id: callId,
        });

        if (historyError) console.error("❌ Error saving call history:", historyError);
        else console.log("✅ Call history saved");
      }

      // Save transcript
      if (transcriptText) {
        const { error: transcriptError } = await supabase.from("transcripts").insert({
          conversation_id: callId,
          transcript_text: transcriptText,
          caller_info: callerInfo,
          timestamp,
          sales_flagged: transcriptText.toLowerCase().includes("buy") ||
            transcriptText.includes("$") ||
            transcriptText.toLowerCase().includes("purchase"),
        });

        if (transcriptError) console.error("❌ Error saving transcript:", transcriptError);
        else console.log("✅ Transcript saved");
      }

      console.log("✅ Call logged successfully");
    } else {
      console.log("ℹ️ Ignoring event type:", eventType);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
