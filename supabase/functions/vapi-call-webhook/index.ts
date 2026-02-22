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
      console.log("🧠 Assistant-request received — looking up caller before speaking");

      const callData = payload.message?.call || payload.call || {};
      const customerNumber = callData.customer?.number || "";
      const assistantId = payload.message?.assistant?.id || payload.assistant?.id || "";
      const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY");

      // 1. Fetch existing assistant config (system prompt + toolIds)
      let existingSystemPrompt = "";
      let existingFirstMessage = "";
      let existingToolIds: string[] = [];

      if (VAPI_API_KEY && assistantId) {
        try {
          const res = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
            headers: { "Authorization": `Bearer ${VAPI_API_KEY}` }
          });
          if (res.ok) {
            const cfg = await res.json();
            const sysMsg = (cfg.model?.messages || []).find((m: any) => m.role === "system");
            existingSystemPrompt = sysMsg?.content || "";
            existingFirstMessage = cfg.firstMessage || "";
            existingToolIds = cfg.model?.toolIds || [];
            console.log("📋 Fetched assistant config. Prompt length:", existingSystemPrompt.length, "ToolIds:", existingToolIds.length);
          } else {
            console.error("⚠️ Could not fetch assistant config:", await res.text());
          }
        } catch (e) {
          console.error("⚠️ Error fetching assistant:", e);
        }
      }

      // 2. Look up caller in callers table
      let callerContext = "";
      let callerFirstMessage = "";

      if (customerNumber && customerNumber !== "Web Call") {
        console.log("📞 Looking up caller:", customerNumber);

        const { data: caller } = await supabase
          .from("callers")
          .select("*")
          .eq("phone", customerNumber)
          .maybeSingle();

        if (caller) {
          // === RETURNING CALLER ===
          const daysSince = Math.floor((Date.now() - new Date(caller.last_call_at).getTime()) / 86400000);

          let lastCallPhrase = "";
          if (daysSince === 0) lastCallPhrase = "earlier today";
          else if (daysSince === 1) lastCallPhrase = "yesterday";
          else if (daysSince === 2) lastCallPhrase = "two days ago";
          else if (daysSince <= 6) lastCallPhrase = "a few days ago";
          else if (daysSince <= 13) lastCallPhrase = "about a week ago";
          else lastCallPhrase = "a couple weeks ago";

          const nameInstruction = caller.name
            ? `You already know their name is "${caller.name}". Use it naturally. Do NOT ask for their name.`
            : `You do NOT know their name yet. Ask for it once, naturally, early in the conversation. Do not ask again after that.`;

          callerContext = `\n\n=== RETURNING CALLER CONTEXT (PRE-LOADED — YOU ALREADY KNOW THIS) ===
Phone: ${customerNumber}
${caller.name ? `Name: ${caller.name}` : "Name: unknown"}
Call count: ${caller.call_count}
Last spoke: ${lastCallPhrase}
${caller.memory_summary ? `Memory summary: ${caller.memory_summary}` : "No previous summary available."}

${nameInstruction}

Your greeting MUST reflect that you remember them. Use relative time only (e.g. "${lastCallPhrase}"). NEVER use exact dates. NEVER mention databases, records, or memory systems.
Sound natural — like you genuinely remember them.
=== END CALLER CONTEXT ===`;

          const nameGreet = caller.name ? `, ${caller.name}` : "";
          if (daysSince === 0) {
            callerFirstMessage = `Hey${nameGreet}! Good to hear from you again today!`;
          } else if (daysSince === 1) {
            callerFirstMessage = `Hey${nameGreet}! We just spoke yesterday — welcome back!`;
          } else if (daysSince <= 6) {
            callerFirstMessage = `Hey${nameGreet}! We chatted a few days ago — good to hear from you again!`;
          } else if (daysSince <= 13) {
            callerFirstMessage = `Hey${nameGreet}! It's been about a week — welcome back!`;
          } else {
            callerFirstMessage = `Hey${nameGreet}! It's been a little while — great to hear from you again!`;
          }

          console.log("✅ Returning caller found. Calls:", caller.call_count, "Days since:", daysSince);
        } else {
          // === FIRST-TIME CALLER ===
          callerContext = `\n\n=== FIRST-TIME CALLER CONTEXT ===
This is a FIRST-TIME caller. Phone: ${customerNumber}.
Do NOT ask for their name. Just greet them naturally and discover their intent.
=== END CALLER CONTEXT ===`;
          console.log("ℹ️ First-time caller — no record found");
        }
      }

      // 3. Build response
      const finalSystemPrompt = existingSystemPrompt + callerContext;

      const response: any = {
        assistant: {
          model: {
            messages: [{ role: "system", content: finalSystemPrompt }],
            ...(existingToolIds.length > 0 ? { toolIds: existingToolIds } : {})
          }
        }
      };

      if (callerFirstMessage) {
        response.assistant.firstMessage = callerFirstMessage;
      }

      console.log("📤 Returning assistant-request response");
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

      console.log("✅ Transferring call to manager:", humanPhone);
      return new Response(
        JSON.stringify({
          destination: {
            type: "number",
            number: humanPhone,
            message: `Connecting you to our manager now. One moment please.`
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== END-OF-CALL-REPORT ======
    if (eventType === "end-of-call-report") {
      const data = payload.message || payload;
      const callId = data.call?.id || data.callId || data.id || "unknown";

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
