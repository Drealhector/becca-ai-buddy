import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY is not configured');
    }

    const { toNumber, purpose, action, callId } = await req.json();

    // Handle end call action
    if (action === 'end' && callId) {
      console.log(`Ending call ${callId}`);
      const endRes = await fetch(`https://api.vapi.ai/call/${callId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ended' }),
      });
      
      const endData = await endRes.json();
      console.log('End call response:', endRes.status, JSON.stringify(endData));
      
      return new Response(JSON.stringify({ success: true, ended: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_WEB_ASSISTANT_ID');
    if (!VAPI_ASSISTANT_ID) {
      throw new Error('VAPI_WEB_ASSISTANT_ID is not configured');
    }

    if (!toNumber) {
      throw new Error('Phone number is required');
    }

    console.log(`Making outbound call to ${toNumber} with purpose: ${purpose}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch the assistant's current personality
    const { data: personalityData } = await supabase
      .from('bot_personality')
      .select('personality_text')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    const { data: custData } = await supabase
      .from('customizations')
      .select('business_name, assistant_personality')
      .limit(1)
      .maybeSingle();

    const personality = personalityData?.personality_text || custData?.assistant_personality || '';
    const businessName = custData?.business_name || 'our business';

    // First, get the phone number ID from Vapi account
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
        console.log('Using phone number ID:', phoneNumberId);
      }
    }

    // Fetch current assistant config to preserve toolIds
    const getResponse = await fetch(`https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`, {
      headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` }
    });

    let existingToolIds: string[] = [];
    if (getResponse.ok) {
      const existing = await getResponse.json();
      existingToolIds = existing.model?.toolIds || [];
    }

    // Build outbound-specific system prompt that blends purpose with personality
    let outboundPrompt = '';
    if (purpose) {
      outboundPrompt = `${personality}

=== OUTBOUND CALL CONTEXT ===
This is an OUTBOUND call YOU are making. You are NOT receiving a call.
You are calling on behalf of ${businessName}.
The purpose of this call: ${purpose}

CRITICAL OUTBOUND CALL BEHAVIOR:
- Parse the purpose intelligently. If a name is mentioned (e.g. "call Hector and tell him..."), the person's name is likely the one you're calling. Use it naturally.
- Your FIRST message should be a casual greeting. If you know the person's name, use it: "Hey, is this [Name]?" or "Hi [Name], how are you doing?"
- If no name is provided, just say something like "Hey, how's it going?"
- Do NOT immediately state the purpose. Have 1 or 2 natural pleasantry exchanges first (e.g. "How are you doing today?" and respond to their answer).
- THEN naturally transition to the purpose. Don't read it like a script. Weave it into conversation naturally.
- Keep everything to 1 or 2 sentences per response. Be conversational, not robotic.
- NEVER say "I am calling about:" or "The purpose of my call is:" — just flow into it naturally.
- Maintain your personality throughout. You are still the same character from your personality description.
- NEVER greet with "How may I help you?" — YOU called THEM, so you have a reason for calling.

=== CONVERSATIONAL STYLE ===
- Keep EVERY response to 1 or 2 sentences MAX.
- Be warm, casual, and human. Sound like a real person making a real call.
- Match the energy of the person you're talking to.
- Use natural fillers occasionally like "yeah", "so", "oh nice", "alright".`;
    }

    // Build the call payload
    const callPayload: any = {
      assistantId: VAPI_ASSISTANT_ID,
      customer: {
        number: toNumber,
      },
    };

    // Only add overrides if we have a purpose
    if (purpose && outboundPrompt) {
      callPayload.assistantOverrides = {
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: outboundPrompt }
          ],
          toolIds: existingToolIds,
        },
        // Don't set firstMessage — let the AI generate it naturally from the prompt
      };
    }

    // If we have a phone number ID, include it
    if (phoneNumberId) {
      callPayload.phoneNumberId = phoneNumberId;
    }

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
      console.error('Vapi call error:', callResponse.status, JSON.stringify(callData));
      throw new Error(callData.message || callData.error || `Vapi call failed: ${callResponse.status}`);
    }

    console.log('Call created successfully:', callData.id);

    // Log the outbound call to call_history
    await supabase.from("call_history").insert({
      type: "outgoing",
      number: toNumber,
      topic: purpose || `Outbound call to ${toNumber}`,
      duration_minutes: 0,
      timestamp: new Date().toISOString(),
      conversation_id: callData.id,
    });

    return new Response(JSON.stringify({
      success: true,
      callId: callData.id,
      status: callData.status,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error making outbound call:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
