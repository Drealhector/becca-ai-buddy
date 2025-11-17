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
      
      // Extract transcript - handle both string and array formats
      let transcriptText = "";
      if (typeof data.transcript === "string") {
        transcriptText = data.transcript;
      } else if (Array.isArray(data.transcript)) {
        transcriptText = data.transcript
          .map((t: any) => `${t.role}: ${t.content}`)
          .join("\n");
      } else if (data.messages) {
        transcriptText = data.messages
          .map((m: any) => `${m.role}: ${m.content || m.message}`)
          .join("\n");
      }
      
      const duration = data.duration || data.call?.duration || data.endedAt - data.startedAt || 0;
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
