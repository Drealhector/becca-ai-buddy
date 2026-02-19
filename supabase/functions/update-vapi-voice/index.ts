import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { voiceId, voiceName } = await req.json();

    if (!voiceId) {
      throw new Error('voiceId is required');
    }

    console.log(`Updating Vapi assistant ${VAPI_ASSISTANT_ID} with voice: ${voiceName} (${voiceId})`);

    const updateResponse = await fetch(`https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice: {
          provider: "11labs",
          voiceId: voiceId,
        },
      }),
    });

    if (!updateResponse.ok) {
      const errText = await updateResponse.text();
      console.error('Vapi update error:', updateResponse.status, errText);
      throw new Error(`Failed to update Vapi assistant: ${updateResponse.status} - ${errText}`);
    }

    const result = await updateResponse.json();
    console.log('✅ Vapi assistant voice updated successfully');

    return new Response(JSON.stringify({
      success: true,
      assistantId: VAPI_ASSISTANT_ID,
      voiceId,
      voiceName,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating Vapi voice:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
