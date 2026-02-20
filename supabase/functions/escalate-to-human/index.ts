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

    // Parse request — handle Vapi persisted tool call format
    let itemRequested = "";
    let callerContext = "";
    let toolCallId = "";

    try {
      const body = await req.json();
      console.log("📞 Escalation request:", JSON.stringify(body));

      const message = body.message || body;
      const toolCalls = message.toolCalls || message.tool_calls || [];

      if (toolCalls.length > 0) {
        const toolCall = toolCalls[0];
        toolCallId = toolCall.id || "";
        const args = toolCall.function?.arguments || toolCall.arguments || {};
        const parsed = typeof args === "string" ? JSON.parse(args) : args;
        itemRequested = parsed.item_requested || "";
        callerContext = parsed.caller_context || "";
      } else if (body.message?.functionCall?.parameters) {
        // Legacy inline tool format
        itemRequested = body.message.functionCall.parameters.item_requested || "";
        callerContext = body.message.functionCall.parameters.caller_context || "";
      } else {
        itemRequested = body.item_requested || "";
        callerContext = body.caller_context || "";
        toolCallId = body.toolCallId || "direct";
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
      const noPhoneResult = "No human support number configured. Unable to check with the team.";
      if (toolCallId) {
        return new Response(
          JSON.stringify({ results: [{ toolCallId, result: noPhoneResult }] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ results: { available: null, notes: noPhoneResult } }),
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
        firstMessage: `Hi, I'm the AI assistant for ${businessName}. A customer is on the line asking about "${itemRequested}". ${callerContext ? `Context: ${callerContext}.` : ''} Do you have this item available or can you help? Please speak — I'm listening and will relay your response back to the customer.`,
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a relay AI calling the business owner on behalf of ${businessName}. A customer is on hold asking about: "${itemRequested}". ${callerContext ? `Caller context: "${callerContext}".` : ''}

YOUR ONLY JOB:
1. Listen carefully to everything the owner says about this item.
2. Let them speak WITHOUT interrupting. They may give availability, pricing, alternatives, etc.
3. Do NOT say anything unless they ask you a question or go silent for more than 8 seconds.
4. If they ask "who is this?" or similar, say: "I'm the AI system for ${businessName}. A customer is asking about ${itemRequested}."
5. After the owner finishes speaking, say ONLY: "Thank you, I'll relay that to the customer." Then end the call.

IF THE OWNER SAYS THEY WANT TO HANDLE THE CALL DIRECTLY (anything like "put them through", "transfer the call", "I'll talk to them", "let me speak to them"):
- Say: "Sure, transferring now."
- Use the transferCall tool immediately.

IMPORTANT:
- Be SILENT and let the owner talk. Do not fill silences immediately.
- If the owner says "hello?" or seems confused, just say: "I'm listening, please go ahead."
- End the call naturally after getting the information.`
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
      const errMsg = "Could not reach the team right now. Please try again later.";
      if (toolCallId) {
        return new Response(
          JSON.stringify({ results: [{ toolCallId, result: errMsg }] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ results: { available: null, notes: errMsg } }),
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

    const successMsg = `I've contacted the team about "${itemRequested}". They'll look into it and get back to you shortly. Is there anything else I can help you with while you wait?`;

    if (toolCallId) {
      return new Response(
        JSON.stringify({ results: [{ toolCallId, result: successMsg }] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        results: {
          available: true,
          notes: successMsg
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
