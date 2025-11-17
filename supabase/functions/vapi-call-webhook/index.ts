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
    console.log("📞 Received VAPI webhook:", payload);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle call end event
    if (payload.type === "end-of-call-report" || payload.message?.type === "end-of-call-report") {
      const data = payload.message || payload;
      
      const transcript = data.transcript || "";
      const duration = data.duration || data.call?.duration || 0;
      const callId = data.call?.id || data.callId || "unknown";

      // Save to call_history
      await supabase.from("call_history").insert({
        type: "incoming",
        number: "Web Call",
        topic: "Call with DREALHECTOR",
        duration_minutes: Math.ceil(duration / 60),
        timestamp: new Date().toISOString(),
      });

      // Save transcript if available
      if (transcript) {
        await supabase.from("transcripts").insert({
          conversation_id: callId,
          transcript_text: transcript,
          caller_info: "Web Call",
          timestamp: new Date().toISOString(),
          sales_flagged: false,
        });
      }

      console.log("✅ Call logged successfully");
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
