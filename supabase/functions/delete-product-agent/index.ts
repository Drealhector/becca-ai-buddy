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
    const { productId, assistantId } = await req.json();

    console.log('Deleting product and AI agent:', productId, assistantId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Delete AI agent first (if exists)
    if (assistantId) {
      const { error: agentError } = await supabase
        .from('ai_agents')
        .delete()
        .eq('assistant_id', assistantId);
      
      if (agentError) {
        console.error('Error deleting AI agent:', agentError);
      }
    }

    // Delete product media
    const { error: mediaError } = await supabase
      .from('product_media')
      .delete()
      .eq('product_id', productId);
    
    if (mediaError) {
      console.error('Error deleting product media:', mediaError);
    }

    // Delete product (this will cascade to related tables)
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (error) throw error;

    console.log('Successfully deleted product:', productId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
