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

  const TELNYX_API_KEY = Deno.env.get("TELNYX_API_KEY");
  const TELNYX_PHONE_NUMBER = Deno.env.get("TELNYX_PHONE_NUMBER");
  const TELNYX_CALL_CONTROL_APP_ID = Deno.env.get("TELNYX_CALL_CONTROL_APP_ID");

  if (!TELNYX_API_KEY) {
    return new Response(JSON.stringify({ error: "TELNYX_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!TELNYX_PHONE_NUMBER) {
    return new Response(JSON.stringify({ error: "TELNYX_PHONE_NUMBER not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!TELNYX_CALL_CONTROL_APP_ID) {
    return new Response(JSON.stringify({ error: "TELNYX_CALL_CONTROL_APP_ID not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { toNumber, purpose } = await req.json();

    if (!toNumber || !purpose) {
      return new Response(JSON.stringify({ error: "toNumber and purpose are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the current personality from the database
    const { data: personalityData } = await supabase
      .from("bot_personality")
      .select("personality_text")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    const basePersonality = personalityData?.personality_text || 
      "You are a helpful, professional, and friendly AI assistant.";

    // Blend base personality with the purpose of this specific outbound call
    const outboundSystemPrompt = `${basePersonality}

--- OUTBOUND CALL CONTEXT ---
You are initiating this outbound call with the following specific purpose: "${purpose}".

For this call:
- Stay focused on the purpose above while keeping your personality consistent.
- Be professional and clear about why you are calling at the start of the conversation.
- Keep the conversation on topic while remaining warm and helpful.
- Do NOT reveal that you are an AI unless directly asked.`;

    // Create the outbound call via Telnyx API
    const telnyxResponse = await fetch("https://api.telnyx.com/v2/calls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TELNYX_API_KEY}`,
      },
      body: JSON.stringify({
        connection_id: TELNYX_CALL_CONTROL_APP_ID,
        to: toNumber,
        from: TELNYX_PHONE_NUMBER,
        from_display_name: "BECCA AI",
        // Pass purpose via custom headers for TeXML webhook to pick up
        custom_headers: [
          { name: "X-Call-Purpose", value: purpose },
          { name: "X-Call-Type", value: "outbound" },
        ],
        // Webhook URL for this call's TeXML instructions
        webhook_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/telnyx-webhook`,
        // Pass the blended system prompt as a SIP header for TeXML AI tag
        sip_headers: [
          { name: "X-System-Prompt", value: encodeURIComponent(outboundSystemPrompt.substring(0, 2000)) },
        ],
      }),
    });

    const telnyxData = await telnyxResponse.json();

    if (!telnyxResponse.ok) {
      console.error("Telnyx API error:", telnyxData);
      return new Response(
        JSON.stringify({ error: "Telnyx call failed", details: telnyxData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callControlId = telnyxData?.data?.call_control_id || "";

    // Save to call_history immediately
    await supabase.from("call_history").insert({
      type: "outgoing",
      number: toNumber,
      topic: purpose,
      duration_minutes: 0,
      timestamp: new Date().toISOString(),
      conversation_id: callControlId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        callControlId,
        message: `Outbound call initiated to ${toNumber}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error initiating Telnyx call:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
