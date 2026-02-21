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

    // Parse the Vapi tool call
    const body = await req.json();
    console.log("📞 Escalation request:", JSON.stringify(body));

    const message = body.message || body;

    // Extract tool call args
    let itemRequested = "";
    let callerContext = "";
    let toolCallId = "";

    const toolCalls = message.toolCalls || message.tool_calls || [];
    if (toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      toolCallId = toolCall.id || "";
      const args = toolCall.function?.arguments || toolCall.arguments || {};
      const parsed = typeof args === "string" ? JSON.parse(args) : args;
      itemRequested = parsed.item_requested || "";
      callerContext = parsed.caller_context || "";
    } else if (body.message?.functionCall?.parameters) {
      itemRequested = body.message.functionCall.parameters.item_requested || "";
      callerContext = body.message.functionCall.parameters.caller_context || "";
    } else {
      itemRequested = body.item_requested || "";
      callerContext = body.caller_context || "";
      toolCallId = body.toolCallId || "direct";
    }

    // ===== CRITICAL: Extract the parent call's controlUrl =====
    const callObj = message.call || body.call || {};
    const parentCallId = callObj.id || body.callId || "";
    const controlUrl = callObj.monitor?.controlUrl || "";

    console.log("🔗 Parent call ID:", parentCallId);
    console.log("🔗 Control URL:", controlUrl ? "captured" : "MISSING");

    if (!controlUrl) {
      console.error("❌ No controlUrl found in call payload");
    }

    // Get owner phone
    const { data: custData } = await supabase
      .from('customizations')
      .select('owner_phone, business_name')
      .limit(1)
      .maybeSingle();

    if (!custData?.owner_phone) {
      const noPhoneResult = "No human support number configured.";
      return new Response(
        JSON.stringify({ results: [{ toolCallId, result: noPhoneResult }] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const businessName = custData.business_name || "the business";

    // ===== Place outbound call to human — DIRECT, NO FLUFF =====
    const callPayload = {
      assistantId: "328ef302-11ca-46a4-b731-76561f9dcbb9",
      phoneNumberId: "009084af-dc2f-40b6-b38b-a4c4389a5b1b",
      customer: { number: custData.owner_phone },
      assistantOverrides: {
        firstMessage: `Quick question — a customer is asking: can we get ${itemRequested}?${callerContext ? ` Context: ${callerContext}.` : ''} What should I tell them?`,
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a relay AI calling the owner of ${businessName}. A customer on hold is asking about: "${itemRequested}".

YOUR JOB:
1. You already asked the question in your first message. Now LISTEN.
2. Let the owner speak WITHOUT interrupting.
3. Stay SILENT unless they ask you a question.
4. If they say "hello?" or seem confused, say: "A customer is asking about ${itemRequested}."
5. Once they give their answer, say: "Got it, thank you." Then end the call.
6. If they say they want to handle the call directly (e.g. "put them through", "transfer", "let me talk to them"), say: "Transferring now." and end the call.

CRITICAL: Do NOT introduce yourself. Do NOT explain who you are unless asked. Be brief.`
            }
          ]
        }
      },
    };

    console.log(`📞 Calling human at ${custData.owner_phone} about: ${itemRequested}`);

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
      return new Response(
        JSON.stringify({ results: [{ toolCallId, result: errMsg }] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Escalation call initiated:', callData.id);

    // ===== Save escalation request with controlUrl for relay =====
    const { error: escError } = await supabase.from("escalation_requests").insert({
      parent_call_id: parentCallId,
      control_url: controlUrl,
      escalation_call_id: callData.id,
      item_requested: itemRequested,
      status: "pending",
    });

    if (escError) {
      console.error("❌ Error saving escalation request:", escError);
    } else {
      console.log("✅ Escalation request saved for relay");
    }

    // Log to call history
    await supabase.from("call_history").insert({
      type: "outgoing",
      number: custData.owner_phone,
      topic: `Escalation: "${itemRequested}"`,
      duration_minutes: 0,
      timestamp: new Date().toISOString(),
      conversation_id: callData.id,
    });

    // Return immediately — tell customer to hold
    const holdMsg = `I'm checking with our team about "${itemRequested}" right now. Please hold for a moment.`;

    return new Response(
      JSON.stringify({ results: [{ toolCallId, result: holdMsg }] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Escalation error:', error);
    return new Response(
      JSON.stringify({ results: [{ toolCallId: "", result: "Sorry, could not reach the team right now." }] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
