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

    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY is not configured');
    }

    // Create VAPI assistant
    const systemPrompt = `You are a sales assistant for ${productName}.

Product Details:
- Name: ${productName}
- Description: ${productDescription}
- Price: ${productPrice}
- Category: ${productCategory}
${productFeatures ? `- Features: ${productFeatures.join(', ')}` : ''}

${sellerInfo ? `Seller Information: ${sellerInfo}` : ''}

Your role is to help customers learn about this product and answer their questions. Be helpful, professional, and enthusiastic about the product.`;

    const vapiResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: productName,
        model: {
          provider: 'openai',
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            }
          ]
        },
        voice: {
          provider: 'playht',
          voiceId: 'jennifer'
        },
        firstMessage: `Hi! I'm here to help you learn about ${productName}. What would you like to know?`
      })
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error('VAPI API error:', errorText);
      throw new Error(`Failed to create VAPI assistant: ${errorText}`);
    }

    const vapiAssistant = await vapiResponse.json();
    console.log('VAPI assistant created:', vapiAssistant.id);

    // Store agent in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await supabase.from('ai_agents').insert({
      product_id: productId,
      agent_id: vapiAssistant.id,
      assistant_id: vapiAssistant.id,
      web_url: null,
      status: 'active'
    });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Successfully created AI agent for product:', productId);

    return new Response(
      JSON.stringify({ success: true, agentId: vapiAssistant.id }),
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
