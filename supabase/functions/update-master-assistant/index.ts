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
    console.log('🔄 Updating master assistant with all products...');

    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY is not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
You have access to a function called "get_product_media" that can show customers images and videos of products.

When customers ask about a product's appearance, details, or want to see it:
1. Call get_product_media with the product name
2. The function will return media URLs with labels
3. Describe what you're showing them

Examples:
- "Let me show you the front view of these shoes..."
- "Here's a detailed look at the material..."
- "Check out this video demonstration..."

IMPORTANT: When a conversation starts with {{product_name}}, that means the customer clicked on that specific product. Tailor your first message to that product specifically and reference it directly. Be contextual and engaging about THAT product.`;

    // Check if master assistant exists in connections
    const { data: connection } = await supabase
      .from('connections')
      .select('vapi_assistant_id')
      .limit(1)
      .single();

    let assistantId = connection?.vapi_assistant_id;

    const assistantConfig = {
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
        functions: [
          {
            name: "get_product_media",
            description: "Retrieves product images and videos to show customers. Call this when customers want to see a product, ask about its appearance, or need visual details.",
            parameters: {
              type: "object",
              properties: {
                product_name: {
                  type: "string",
                  description: "The name of the product to fetch media for (e.g., 'Nike Air Max', 'iPhone 15')"
                },
                label_filter: {
                  type: "string",
                  description: "Optional: specific view or type to show (e.g., 'front view', 'back view', 'demo video')"
                }
              },
              required: ["product_name"]
            },
            async: false,
            server: {
              url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/get-product-media`
            }
          }
        ]
      },
      voice: {
        provider: 'playht',
        voiceId: 'jennifer'
      },
      firstMessage: "Hi! I'm here to help you learn about our products. What interests you today?"
    };

    let vapiResponse;
    
    if (assistantId) {
      // Update existing assistant
      console.log('📝 Updating existing assistant:', assistantId);
      vapiResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assistantConfig)
      });
    } else {
      // Create new assistant
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

    // Store/update assistant ID in connections
    if (!assistantId) {
      const { error: insertError } = await supabase
        .from('connections')
        .upsert({
          id: crypto.randomUUID(),
          vapi_assistant_id: vapiAssistant.id,
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Database error:', insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        assistantId: vapiAssistant.id,
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
