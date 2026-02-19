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

    const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_WEB_ASSISTANT_ID');
    if (!VAPI_ASSISTANT_ID) {
      throw new Error('VAPI_WEB_ASSISTANT_ID is not configured');
    }

    const { toNumber, purpose } = await req.json();

    if (!toNumber) {
      throw new Error('Phone number is required');
    }

    console.log(`Making outbound call to ${toNumber} with purpose: ${purpose}`);

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

    // Create the outbound call via Vapi API
    const callPayload: any = {
      assistantId: VAPI_ASSISTANT_ID,
      customer: {
        number: toNumber,
      },
      assistantOverrides: {
        firstMessage: purpose
          ? `Hi, I'm calling about: ${purpose}. How can I help you today?`
          : undefined,
      },
    };

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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
