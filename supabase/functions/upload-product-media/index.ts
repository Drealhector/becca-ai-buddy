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
    const { assistantId, productId, mediaUrl, mediaType, label, description } = await req.json();

    console.log('Uploading media for assistant:', assistantId);

    // Call n8n webhook to update AI agent with media
    const n8nResponse = await fetch('https://drealhector467.app.n8n.cloud/webhook/media-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assistantId,
        productId,
        mediaUrl,
        mediaType,
        label,
        description
      })
    });

    const result = await n8nResponse.json();
    console.log('n8n response:', result);

    if (result.success) {
      // Store media in database
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error } = await supabase.from('product_media').insert({
        product_id: productId,
        assistant_id: assistantId,
        media_url: mediaUrl,
        media_type: mediaType,
        label,
        description
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Failed to upload media to AI agent');
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
