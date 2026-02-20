import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) throw new Error('VAPI_API_KEY not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request - Vapi sends function call args in message.functionCall.parameters
    let itemRequested = "";
    let callerContext = "";

    try {
      const body = await req.json();
      console.log("📞 Escalation request:", JSON.stringify(body));

      if (body.message?.functionCall?.parameters) {
        itemRequested = body.message.functionCall.parameters.item_requested || "";
        callerContext = body.message.functionCall.parameters.caller_context || "";
      } else {
        itemRequested = body.item_requested || "";
        callerContext = body.caller_context || "";
      }
    } catch {
      throw new Error("Invalid request body");
    }

    // Get owner phone from customizations
    const { data: custData } = await supabase
      .from('customizations')
      .select('owner_phone, business_name')
      .limit(1)
      .maybeSingle();

    if (!custData?.owner_phone) {
      return new Response(
        JSON.stringify({
          results: {
            available: null,
            notes: "No human support number configured. Unable to check with the team."
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const businessName = custData.business_name || "the business";

    // Make outbound call to human owner using specific Telnyx phone number via Vapi
    const callPayload = {
      assistantId: "328ef302-11ca-46a4-b731-76561f9dcbb9",
      phoneNumberId: "009084af-dc2f-40b6-b38b-a4c4389a5b1b",
      customer: {
        number: custData.owner_phone,
      },
      assistantOverrides: {
        firstMessage: `Hi, this is the AI assistant for ${businessName}. A customer is asking if "${itemRequested}" is available. ${callerContext ? `They mentioned: ${callerContext}.` : ''} Please say yes or no.`,
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a minimal inquiry assistant for ${businessName}. A customer is asking about "${itemRequested}". Your ONLY job is to:
1. Ask the owner if this item is available
2. Listen for a yes or no answer
3. Thank them and end the call immediately
Keep it extremely brief. One question, one answer, done.`
            }
          ]
        }
      },
    };

    console.log(`📞 Escalating to human at ${custData.owner_phone} about: ${itemRequested}`);

    const callResponse = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(callPayload),
    });

    const callData = await callResponse.json();

    if (!callResponse.ok) {
      console.error('❌ Escalation call error:', callResponse.status, JSON.stringify(callData));
      return new Response(
        JSON.stringify({
          results: {
            available: null,
            notes: "Could not reach the team right now. Please try again later."
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Escalation call initiated:', callData.id);

    // Log escalation call
    await supabase.from("call_history").insert({
      type: "outgoing",
      number: custData.owner_phone,
      topic: `Escalation: Customer asked about "${itemRequested}"`,
      duration_minutes: 0,
      timestamp: new Date().toISOString(),
      conversation_id: callData.id,
    });

    return new Response(
      JSON.stringify({
        results: {
          available: true,
          notes: `Team has been contacted about "${itemRequested}". They've been notified and will confirm availability.`
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Escalation error:', error);
    return new Response(
      JSON.stringify({
        results: {
          available: null,
          notes: "Sorry, could not reach the team right now."
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
