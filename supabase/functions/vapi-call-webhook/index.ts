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

    // ====== ASSISTANT-REQUEST: CALLER LOOKUP BEFORE SPEAKING ======
    if (eventType === "assistant-request") {
      console.log("🧠 Assistant-request received — looking up caller");

      // 1. Extract phone number
      const phone = payload.message?.call?.customer?.number || "";
      const BECCA_ASSISTANT_ID = "328ef302-11ca-46a4-b731-76561f9dcbb9";

      // 2. If no phone or web call, just return normal assistant
      if (!phone || phone === "Web Call") {
        console.log("ℹ️ No phone number — returning default assistant");
        return new Response(
          JSON.stringify({ assistantId: BECCA_ASSISTANT_ID }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. Query callers table
      console.log("📞 Looking up caller:", phone);
      const { data: caller } = await supabase
        .from("callers")
        .select("*")
        .eq("phone", phone)
        .single();

      // CASE A — FIRST TIME CALLER
      if (!caller) {
        console.log("ℹ️ First-time caller — no overrides");
        return new Response(
          JSON.stringify({ assistantId: BECCA_ASSISTANT_ID }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // CASE B — RETURNING CALLER
      const now = new Date();
      const lastCall = new Date(caller.last_call_at);
      const diffDays = Math.floor(
        (now.getTime() - lastCall.getTime()) / (1000 * 60 * 60 * 24)
      );

      let lastCallPhrase: string;
      if (diffDays === 0) lastCallPhrase = "earlier today";
      else if (diffDays === 1) lastCallPhrase = "yesterday";
      else if (diffDays === 2) lastCallPhrase = "2 days ago";
      else if (diffDays <= 6) lastCallPhrase = "a few days ago";
      else if (diffDays <= 13) lastCallPhrase = "about a week ago";
      else lastCallPhrase = "a couple weeks ago";

      console.log("✅ Returning caller. Calls:", caller.call_count, "Days since:", diffDays, "Phrase:", lastCallPhrase);

      // Return assistant override with variableValues
      const response = {
        assistantId: BECCA_ASSISTANT_ID,
        assistantOverrides: {
          variableValues: {
            lastCallPhrase,
            memorySummary: caller.memory_summary || "",
            storedName: caller.name || null,
          }
        }
      };

      console.log("📤 Returning assistant-request with caller context");
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

      // ====== STEP 3: UPSERT CALLERS TABLE ======
      if (customerNumber && customerNumber !== "Web Call") {
        const phone = customerNumber;
        const nowIso = new Date().toISOString();
        console.log("🧠 Upserting caller record for:", phone);

        // 3.2 Build new memory summary
        const newSummary: string | null =
          data.analysis?.summary ??
          (transcriptText ? transcriptText.substring(0, 500) : null);

        // 3.3 Extract captured name from structured data
        const capturedName: string | null =
          payload.message?.analysis?.structuredData?.captured_name ?? null;

        // 3.4 Fetch existing caller
        const { data: existing } = await supabase
          .from("callers")
          .select("*")
          .eq("phone", phone)
          .maybeSingle();

        // Merge memory: old + separator + new, truncate to ~3000 chars
        const mergedMemory = existing?.memory_summary
          ? `${existing.memory_summary}\n- ${newSummary}`
          : (newSummary ? `- ${newSummary}` : null);
        const truncatedMemory = mergedMemory
          ? mergedMemory.substring(0, 3000)
          : null;

        // Build upsert payload
        const updatePayload: any = {
          last_call_at: nowIso,
          call_count: (existing?.call_count ?? 0) + 1,
          memory_summary: truncatedMemory,
          updated_at: nowIso,
        };

        // Only set name if callers.name is null AND capturedName is provided
        if (!existing?.name && capturedName) {
          updatePayload.name = capturedName;
        }

        // Upsert — onConflict: "phone" guarantees no duplicate numbers
        const { error: callerError } = await supabase
          .from("callers")
          .upsert(
            { phone, ...updatePayload },
            { onConflict: "phone" }
          );

        if (callerError) console.error("❌ Error upserting caller:", callerError);
        else console.log("✅ Caller upserted. Count:", updatePayload.call_count, "Name:", updatePayload.name || existing?.name || "unknown");
      }

      // ====== CUSTOMER MEMORY ENGINE (legacy) ======
      if (customerNumber && customerNumber !== "Web Call") {
        const { data: existingMemory } = await supabase
          .from("customer_memory")
          .select("*")
          .eq("phone_number", customerNumber)
          .maybeSingle();

        if (existingMemory) {
          const existingHistory = (existingMemory.call_history as any[]) || [];
          existingHistory.push({ summary: callSummary, date: new Date().toISOString() });
          await supabase
            .from("customer_memory")
            .update({
              conversation_count: existingMemory.conversation_count + 1,
              last_contacted_at: new Date().toISOString(),
              call_history: existingHistory,
            })
            .eq("phone_number", customerNumber);
        } else {
          await supabase
            .from("customer_memory")
            .insert({
              phone_number: customerNumber,
              conversation_count: 1,
              first_contacted_at: new Date().toISOString(),
              last_contacted_at: new Date().toISOString(),
              call_history: [{ summary: callSummary, date: new Date().toISOString() }],
            });
        }
      }

      // Extract recording URL from Vapi payload
      const recordingUrl = data.artifact?.recordingUrl || 
                           data.recordingUrl || 
                           data.artifact?.stereoRecordingUrl ||
                           null;
      console.log("🎙️ Recording URL:", recordingUrl);

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
          .update({ duration_minutes: durationMinutes, timestamp, recording_url: recordingUrl })
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
          recording_url: recordingUrl,
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
