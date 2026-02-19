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
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    // Fetch voices directly from ElevenLabs (since Vapi syncs with ElevenLabs)
    const elResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    });

    if (!elResponse.ok) {
      const errorText = await elResponse.text();
      console.error('ElevenLabs API error:', elResponse.status, errorText);
      throw new Error(`ElevenLabs API error: ${elResponse.status}`);
    }

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
  } catch (error) {
    console.error('Error fetching voices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage, voices: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
