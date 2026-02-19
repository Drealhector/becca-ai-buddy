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

    // Fetch voices from the user's Vapi account
    const response = await fetch('https://api.vapi.ai/voice', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vapi API error:', response.status, errorText);
      
      // If Vapi doesn't have a /voice endpoint, fall back to ElevenLabs voices
      const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
      if (ELEVENLABS_API_KEY) {
        console.log('Falling back to ElevenLabs voices...');
        const elResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
          headers: { 'xi-api-key': ELEVENLABS_API_KEY },
        });

        if (elResponse.ok) {
          const elData = await elResponse.json();
          const voices = (elData.voices || []).map((v: any) => ({
            id: v.voice_id,
            name: v.name,
            provider: 'elevenlabs',
            description: v.labels ? Object.values(v.labels).join(', ') : 'ElevenLabs voice',
            category: v.category || 'premade',
            preview_url: v.preview_url || null,
          }));

          return new Response(JSON.stringify({ voices, source: 'elevenlabs' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      throw new Error(`Vapi API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Normalize Vapi voice data
    const voices = (Array.isArray(data) ? data : data.voices || []).map((v: any) => ({
      id: v.id || v.voice_id || v.voiceId,
      name: v.name || 'Unnamed Voice',
      provider: v.provider || 'vapi',
      description: v.description || '',
      category: v.category || 'default',
      preview_url: v.previewUrl || v.preview_url || null,
    }));

    return new Response(JSON.stringify({ voices, source: 'vapi' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching voices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage, voices: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
