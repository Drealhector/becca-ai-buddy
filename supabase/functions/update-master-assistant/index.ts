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
    console.log('🔄 Updating master assistant...');

    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY is not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check for serverUrl override from request body
    let requestBody: any = {};
    try {
      requestBody = await req.json();
    } catch {
      // No body or invalid JSON, that's fine
    }

    // Fetch bot personality
    const { data: personalityData } = await supabase
      .from('bot_personality')
      .select('personality_text')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    const basePersonality = personalityData?.personality_text || 
      "You are a helpful and enthusiastic sales assistant. Be professional, friendly, and knowledgeable about the products.";

    // Fetch all products with their sales instructions
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });

    if (productsError) throw productsError;

    // Build comprehensive product knowledge
    let productsInfo = "\n\n=== PRODUCTS YOU CAN HELP WITH ===\n";
    
    if (products && products.length > 0) {
      products.forEach((product: any) => {
        productsInfo += `\n--- ${product.name.toUpperCase()} ---\n`;
        productsInfo += `Product ID: ${product.id}\n`;
        productsInfo += `Description: ${product.description || 'N/A'}\n`;
        productsInfo += `Price: ${product.currency || 'USD'} ${product.price || 'N/A'}\n`;
        productsInfo += `Category: ${product.category || 'N/A'}\n`;
        productsInfo += `Stock: ${product.stock || 'N/A'} units\n`;
        
        if (product.features && product.features.length > 0) {
          productsInfo += `Features: ${product.features.join(', ')}\n`;
        }
        
        if (product.sales_instructions) {
          productsInfo += `SALES APPROACH: ${product.sales_instructions}\n`;
        }
        
        productsInfo += `Link: /product/${product.link_slug}\n`;
      });
    } else {
      productsInfo += "No products available yet.\n";
    }

    const systemPrompt = `${basePersonality}

${productsInfo}

=== YOUR CAPABILITIES ===
You have access to tools for checking product availability and transferring calls to our manager.

IMPORTANT: When a conversation starts with {{product_name}}, that means the customer clicked on that specific product. Tailor your first message to that product specifically.`;

    // Check if master assistant exists in connections
    const { data: connection } = await supabase
      .from('connections')
      .select('vapi_assistant_id')
      .limit(1)
      .single();

    let assistantId = connection?.vapi_assistant_id;

    // Use toolIds instead of deprecated model.functions
    const toolIds = [
      "93520019-103b-4afa-ac12-4d09f2e453c2", // get_inventory
      "76f61ace-fb6d-4323-a226-7ffa61969008", // transferCall
    ];

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/vapi-call-webhook`;

    const assistantConfig: any = {
      name: "Master Product Sales Assistant",
      model: {
        provider: 'openai',
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          }
        ],
        toolIds,
      },
      serverUrl: requestBody.serverUrl || webhookUrl,
      voice: {
        provider: '11labs',
        voiceId: 'sarah'
      },
      firstMessage: "Hi! I'm here to help you learn about our products. What interests you today?"
    };

    let vapiResponse;
    
    if (assistantId) {
      console.log('📝 Trying to update existing assistant:', assistantId);
      vapiResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assistantConfig)
      });

      // If assistant not found, create a new one
      if (vapiResponse.status === 404) {
        console.log('⚠️ Assistant not found, creating new one...');
        assistantId = null;
        vapiResponse = await fetch('https://api.vapi.ai/assistant', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(assistantConfig)
        });
      }
    } else {
      console.log('✨ Creating new master assistant');
      vapiResponse = await fetch('https://api.vapi.ai/assistant', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assistantConfig)
      });
    }

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error('❌ VAPI API error:', errorText);
      throw new Error(`Failed to update VAPI assistant: ${errorText}`);
    }

    const vapiAssistant = await vapiResponse.json();
    console.log('✅ Master assistant updated:', vapiAssistant.id);
    console.log('🔗 Server URL set to:', assistantConfig.serverUrl);

    // Always update the assistant ID in connections
    if (vapiAssistant.id !== connection?.vapi_assistant_id) {
      const { error: updateError } = await supabase
        .from('connections')
        .update({
          vapi_assistant_id: vapiAssistant.id,
          updated_at: new Date().toISOString()
        })
        .not('id', 'is', null);

      if (updateError) {
        // Try upsert if no row exists
        await supabase.from('connections').upsert({
          id: crypto.randomUUID(),
          vapi_assistant_id: vapiAssistant.id,
          updated_at: new Date().toISOString()
        });
      }
      console.log('💾 Updated connections with new assistant ID');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        assistantId: vapiAssistant.id,
        serverUrl: assistantConfig.serverUrl,
        productsCount: products?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
