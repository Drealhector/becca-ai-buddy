import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Available Vapi voice providers and their voices
const VAPI_VOICES = [
  // ElevenLabs voices
  { id: 'elevenlabs-rachel', name: 'Rachel', provider: 'elevenlabs', description: 'Warm, friendly female voice' },
  { id: 'elevenlabs-adam', name: 'Adam', provider: 'elevenlabs', description: 'Clear, professional male voice' },
  { id: 'elevenlabs-charlie', name: 'Charlie', provider: 'elevenlabs', description: 'Natural, conversational male voice' },
  { id: 'elevenlabs-emily', name: 'Emily', provider: 'elevenlabs', description: 'Expressive, engaging female voice' },
  
  // PlayHT voices
  { id: 'playht-jennifer', name: 'Jennifer', provider: 'playht', description: 'Professional female voice' },
  { id: 'playht-matthew', name: 'Matthew', provider: 'playht', description: 'Professional male voice' },
  
  // Azure voices  
  { id: 'azure-aria', name: 'Aria', provider: 'azure', description: 'Natural, expressive female voice' },
  { id: 'azure-guy', name: 'Guy', provider: 'azure', description: 'Natural male voice' },
  
  // Deepgram voices
  { id: 'deepgram-aura-asteria', name: 'Asteria', provider: 'deepgram', description: 'Clear, articulate female voice' },
  { id: 'deepgram-aura-luna', name: 'Luna', provider: 'deepgram', description: 'Warm, friendly female voice' },
  { id: 'deepgram-aura-stella', name: 'Stella', provider: 'deepgram', description: 'Professional female voice' },
  { id: 'deepgram-aura-athena', name: 'Athena', provider: 'deepgram', description: 'Authoritative female voice' },
  { id: 'deepgram-aura-hera', name: 'Hera', provider: 'deepgram', description: 'Confident female voice' },
  { id: 'deepgram-aura-orion', name: 'Orion', provider: 'deepgram', description: 'Strong male voice' },
  { id: 'deepgram-aura-arcas', name: 'Arcas', provider: 'deepgram', description: 'Clear male voice' },
  { id: 'deepgram-aura-perseus', name: 'Perseus', provider: 'deepgram', description: 'Professional male voice' },
  { id: 'deepgram-aura-angus', name: 'Angus', provider: 'deepgram', description: 'Natural male voice' },
  { id: 'deepgram-aura-orpheus', name: 'Orpheus', provider: 'deepgram', description: 'Expressive male voice' },
  { id: 'deepgram-aura-helios', name: 'Helios', provider: 'deepgram', description: 'Warm male voice' },
  { id: 'deepgram-aura-zeus', name: 'Zeus', provider: 'deepgram', description: 'Authoritative male voice' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Returning available Vapi voices...');

    return new Response(JSON.stringify({ voices: VAPI_VOICES }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching Vapi voices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage, voices: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
