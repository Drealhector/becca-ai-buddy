import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Log the event type
    const eventType = payload.type || payload.message?.type;
    console.log("📊 Event type:", eventType);

    // Handle call end event
    if (eventType === "end-of-call-report") {
      const data = payload.message || payload;
      
      // Extract transcript from messagesOpenAIFormatted (excluding system messages)
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
            const role = m.role === "bot" ? "AI" : "User";
            return `${role}: ${m.message}`;
          })
          .join("\n");
      }
      
      // Calculate duration from message timestamps (in milliseconds, convert to seconds)
      let duration = 0;
      if (data.artifact?.messages && data.artifact.messages.length > 0) {
        const messages = data.artifact.messages.filter((m: any) => m.role !== "system");
        if (messages.length > 0) {
          const firstMessageTime = messages[0].time;
          const lastMessage = messages[messages.length - 1];
          const lastMessageEndTime = lastMessage.endTime || lastMessage.time;
          duration = Math.round((lastMessageEndTime - firstMessageTime) / 1000); // Convert to seconds
        }
      }
      
      const callId = data.call?.id || data.callId || data.id || "unknown";

      console.log("💾 Saving call data:", { transcriptText, duration, callId });

      // Save to call_history
      const { error: historyError } = await supabase.from("call_history").insert({
        type: "incoming",
        number: "Web Call",
        topic: "Call with DREALHECTOR",
        duration_minutes: Math.ceil(duration / 60),
        timestamp: new Date().toISOString(),
      });

      if (historyError) {
        console.error("❌ Error saving call history:", historyError);
      } else {
        console.log("✅ Call history saved");
      }

      // Save transcript if available
      if (transcriptText) {
        const { error: transcriptError } = await supabase.from("transcripts").insert({
          conversation_id: callId,
          transcript_text: transcriptText,
          caller_info: "Web Call",
          timestamp: new Date().toISOString(),
          sales_flagged: false,
        });

        if (transcriptError) {
          console.error("❌ Error saving transcript:", transcriptError);
        } else {
          console.log("✅ Transcript saved");
        }
      } else {
        console.log("⚠️ No transcript available");
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
