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
    const { productId } = await req.json();
    console.log('🔄 Triggering master assistant update for product:', productId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call the update-master-assistant function
    const { data: updateResult, error: updateError } = await supabase.functions.invoke(
      'update-master-assistant'
    );

    if (updateError) {
      console.error('❌ Error updating master assistant:', updateError);
      throw updateError;
    }

    console.log('✅ Master assistant updated:', updateResult);

    // Get the master assistant ID from connections
    const { data: connection } = await supabase
      .from('connections')
      .select('vapi_assistant_id')
      .limit(1)
      .single();

    const assistantId = connection?.vapi_assistant_id;

    if (!assistantId) {
      throw new Error('Master assistant not found');
    }

    // Store reference in ai_agents table (for tracking)
    const { error: agentError } = await supabase.from('ai_agents').insert({
      product_id: productId,
      agent_id: assistantId,
      assistant_id: assistantId,
      web_url: null,
      status: 'active'
    });

    if (agentError && !agentError.message.includes('duplicate')) {
      console.error('Database error:', agentError);
      throw agentError;
    }

    console.log('✅ Product linked to master assistant:', productId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        agentId: assistantId,
        message: 'Master assistant updated with new product'
      }),
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
