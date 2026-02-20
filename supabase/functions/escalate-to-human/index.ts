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
        firstMessage: `Hi, this is the AI assistant for ${businessName}. I have a customer on the line asking about "${itemRequested}". ${callerContext ? `They mentioned: ${callerContext}.` : ''} Do you have this available or can you help with this request?`,
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant making an inquiry call on behalf of ${businessName}. A customer is currently on hold asking about "${itemRequested}".

YOUR ROLE:
- Politely explain that a customer is asking about this item
- Listen to the owner's full response — they may explain details, availability, pricing, alternatives, etc.
- Take note of everything they say so you can relay it back accurately
- Do NOT rush or cut them off. Let the owner speak freely and end the call when THEY are ready.

IF THE OWNER SAYS THEY WANT TO HANDLE THE CALL DIRECTLY:
- If the owner says anything like "let me talk to them", "transfer the call to me", "I'll handle it", "put them through", etc.
- Respond: "Absolutely, I'll transfer the customer to you right now."
- Then use the transferCall tool to connect the original caller to this number.

IMPORTANT:
- Do NOT end the call yourself. The owner controls when the call ends.
- Be a good listener. Capture all details the owner shares.
- Stay professional and concise in your own responses.
- If the owner asks questions about the customer, share any context you have: "${callerContext || 'No additional context provided.'}"`
            }
          ],
          tools: [
            {
              type: "transferCall",
              destinations: [
                {
                  type: "number",
                  number: custData.owner_phone,
                  message: "Connecting you to the customer now."
                }
              ],
              function: {
                name: "transferCall",
                description: "Transfer the original customer call to the owner. Use this ONLY when the owner explicitly asks to speak with the customer directly.",
                parameters: {
                  type: "object",
                  properties: {}
                }
              }
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
