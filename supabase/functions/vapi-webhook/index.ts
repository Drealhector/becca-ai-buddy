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
    const { transcript, conversation_id, timestamp, caller_info, duration_seconds } = await req.json();
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const durationMinutes = duration_seconds ? Math.ceil(duration_seconds / 60) : 0;

    // Save transcript
    const { data: transcriptData } = await supabase
      .from("transcripts")
      .insert({
        conversation_id,
        transcript_text: transcript,
        timestamp: timestamp || new Date().toISOString(),
        caller_info,
        sales_flagged: transcript.toLowerCase().includes("buy") || 
                       transcript.includes("$") ||
                       transcript.toLowerCase().includes("purchase"),
      })
      .select()
      .single();

    // Save to call history
    await supabase.from("call_history").insert({
      type: "incoming",
      number: caller_info,
      topic: "Call via Vapi",
      timestamp: timestamp || new Date().toISOString(),
      duration_minutes: durationMinutes,
    });

    // If sales flagged, update wallet
    if (transcriptData?.sales_flagged) {
      const { data: wallet } = await supabase
        .from("wallet")
        .select("*")
        .limit(1)
        .single();

      if (wallet) {
        await supabase.from("sales").insert({
          conversation_id,
          amount: 0,
          description: "Sale detected from call",
          timestamp: new Date().toISOString(),
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Vapi webhook error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
