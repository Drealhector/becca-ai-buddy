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
    const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_WEB_ASSISTANT_ID');

    if (!VAPI_API_KEY) throw new Error('VAPI_API_KEY not configured');
    if (!VAPI_ASSISTANT_ID) throw new Error('VAPI_WEB_ASSISTANT_ID not configured');

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
          results: "I'm sorry, I don't have a way to check with the team right now. The item isn't in our current inventory, but you can call back later or leave your number and we'll get back to you.",
          success: false,
          reason: "no_owner_phone"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Vapi phone number for outbound
    const phoneNumbersRes = await fetch('https://api.vapi.ai/phone-number', {
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    let phoneNumberId = null;
    if (phoneNumbersRes.ok) {
      const phoneNumbers = await phoneNumbersRes.json();
      if (Array.isArray(phoneNumbers) && phoneNumbers.length > 0) {
        phoneNumberId = phoneNumbers[0].id;
      }
    }

    if (!phoneNumberId) {
      return new Response(
        JSON.stringify({
          results: "I'm unable to reach the team right now. Please try again later or leave your contact info.",
          success: false,
          reason: "no_phone_number_id"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const businessName = custData.business_name || "the business";

    // Make outbound call to human owner
    const callPayload = {
      assistantId: VAPI_ASSISTANT_ID,
      customer: {
        number: custData.owner_phone,
      },
      phoneNumberId,
      assistantOverrides: {
        firstMessage: `Hi, this is the AI assistant for ${businessName}. I have a customer on the line asking about "${itemRequested}". ${callerContext ? `They mentioned: ${callerContext}.` : ''} Do you have this available or can you help with this request?`,
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant making a quick inquiry call on behalf of ${businessName}. A customer is asking about "${itemRequested}". Your job is to:
1. Politely explain that a customer is asking about this item
2. Ask if it's available or if they can help
3. Listen to the answer carefully
4. Thank them and end the call quickly
Keep it brief and professional. This is a quick check, not a long conversation.`
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
          results: "I tried to reach the team but couldn't connect right now. The item isn't in our current inventory, but I'd suggest trying again later.",
          success: false,
          reason: "call_failed"
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
        results: `I've reached out to the team to check on "${itemRequested}". They've been notified and will look into it. In the meantime, is there anything else I can help you with?`,
        success: true,
        callId: callData.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Escalation error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        results: "Sorry, I couldn't reach the team right now. Please try again later."
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
