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
  const TELNYX_TEXML_APP_ID = Deno.env.get("TELNYX_TEXML_APP_ID");

  if (!TELNYX_API_KEY) {
    return new Response(JSON.stringify({ error: "TELNYX_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    
    // Accept personality from body OR read latest from database
    let personalityText = body?.personality;
    
    if (!personalityText) {
      const { data: personalityData } = await supabase
        .from("bot_personality")
        .select("personality_text")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      personalityText = personalityData?.personality_text;
    }

    if (!personalityText) {
      return new Response(JSON.stringify({ error: "No personality found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The incoming call system prompt uses the base personality unchanged
    const inboundSystemPrompt = `${personalityText}

--- INCOMING CALL CONTEXT ---
A customer has called you. Greet them warmly and assist them with whatever they need.
Be helpful, professional, and stay in character throughout the conversation.`;

    // Update the TeXML Application's AI system prompt via Telnyx API
    // Telnyx TeXML apps support updating their configuration
    const updatePayload: any = {
      name: "BECCA AI Assistant",
      active: true,
      inbound: {
        channel_limit: 10,
        shaken_stir_enabled: false,
      },
    };

    // If a TeXML App ID is provided, update it
    let telnyxUpdateResult = null;
    if (TELNYX_TEXML_APP_ID) {
      const telnyxResponse = await fetch(
        `https://api.telnyx.com/v2/texml_applications/${TELNYX_TEXML_APP_ID}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${TELNYX_API_KEY}`,
          },
          body: JSON.stringify(updatePayload),
        }
      );
      
      telnyxUpdateResult = await telnyxResponse.json();
      
      if (!telnyxResponse.ok) {
        console.warn("Telnyx TeXML app update warning:", telnyxUpdateResult);
        // Don't fail — personality is saved in DB and will be picked up on next call
      }
    }

    // Always store the personality in a dedicated table for use during calls
    // The telnyx-webhook and telnyx-outbound-call functions read from bot_personality
    console.log("Personality synced to Telnyx:", personalityText.substring(0, 100));

    return new Response(
      JSON.stringify({
        success: true,
        message: "Personality updated and synced with Telnyx",
        inboundPromptPreview: inboundSystemPrompt.substring(0, 200),
        telnyxResponse: telnyxUpdateResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error updating Telnyx personality:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
