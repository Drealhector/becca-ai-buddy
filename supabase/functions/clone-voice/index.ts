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

    const contentType = req.headers.get('content-type') || '';
    
    let voiceName: string;
    let audioBlob: Blob;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      voiceName = formData.get('name') as string;
      const audioFile = formData.get('audio') as File;
      
      if (!voiceName || !audioFile) {
        throw new Error('Missing voice name or audio file');
      }
      audioBlob = audioFile;
    } else {
      // JSON with base64 audio
      const body = await req.json();
      voiceName = body.name;
      const audioBase64 = body.audio;
      
      if (!voiceName || !audioBase64) {
        throw new Error('Missing voice name or audio data');
      }

      // Decode base64 to binary
      const binaryString = atob(audioBase64.split(',').pop() || audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      audioBlob = new Blob([bytes], { type: 'audio/webm' });
    }

    console.log(`Cloning voice "${voiceName}" on ElevenLabs...`);

    // Clone voice on ElevenLabs
    const formData = new FormData();
    formData.append('name', voiceName);
    formData.append('files', audioBlob, `${voiceName}.webm`);

    const cloneResponse = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!cloneResponse.ok) {
      const errorText = await cloneResponse.text();
      console.error('ElevenLabs clone error:', cloneResponse.status, errorText);
      throw new Error(`ElevenLabs voice clone failed: ${cloneResponse.status} - ${errorText}`);
    }

    const cloneData = await cloneResponse.json();
    const voiceId = cloneData.voice_id;

    console.log(`Voice cloned successfully! Voice ID: ${voiceId}`);

    return new Response(JSON.stringify({
      success: true,
      voice_id: voiceId,
      name: voiceName,
      provider: 'elevenlabs',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error cloning voice:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
