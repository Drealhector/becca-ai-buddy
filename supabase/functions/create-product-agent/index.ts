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
    const { 
      productId, 
      productName, 
      productDescription, 
      productPrice, 
      productCategory,
      productFeatures,
      sellerInfo 
    } = await req.json();

    console.log('Creating AI agent for product:', productId);

    // Call n8n webhook to create AI agent
    const n8nResponse = await fetch('https://drealhector467.app.n8n.cloud/webhook/product-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        productName,
        productDescription,
        productPrice,
        productCategory,
        productFeatures,
        mediaItems: [],
        sellerInfo
      })
    });

    const result = await n8nResponse.json();
    console.log('n8n response:', result);

    if (result.success && result.agentId) {
      // Store agent in database
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error } = await supabase.from('ai_agents').insert({
        product_id: productId,
        agent_id: result.agentId,
        assistant_id: result.agentId,
        web_url: result.webUrl || null,
        status: 'active'
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, agentId: result.agentId, webUrl: result.webUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Failed to create AI agent');
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
