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
    const { personality, firstMessage } = await req.json();
    
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_WEB_ASSISTANT_ID');
    
    if (!VAPI_API_KEY || !VAPI_ASSISTANT_ID) {
      throw new Error('VAPI_API_KEY or VAPI_WEB_ASSISTANT_ID not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch current inventory summary for the system prompt
    const { data: inventory } = await supabase
      .from('inventory')
      .select('*')
      .eq('is_available', true)
      .order('name');

    let inventoryNote = "";
    if (inventory && inventory.length > 0) {
      inventoryNote = `\n\n=== CURRENT INVENTORY (${inventory.length} items) ===\nYou have access to a tool called "check_inventory" to look up real-time inventory. ALWAYS use this tool when someone asks about availability, pricing, what you have, or what's in stock. Never guess — always check.\n`;
    } else {
      inventoryNote = `\n\nYou have access to a tool called "check_inventory" to look up real-time inventory. Use it when anyone asks about what's available. Currently the inventory may be empty.\n`;
    }

    const systemPrompt = `${personality}

${inventoryNote}

=== MANDATORY INVENTORY INSTRUCTIONS ===
If a caller asks about product availability, price, stock, or category,
you MUST call the check_inventory tool before responding.
Never guess prices or availability.
If no result is returned, say the item is currently unavailable.
Keep responses short and conversational.

=== ADDITIONAL INSTRUCTIONS ===
- When someone asks "what do you have?", "what's available?", "do you have X?", or anything about products/items/inventory, ALWAYS call the check_inventory tool first before answering.
- Provide accurate pricing and details from the inventory data.
- If an item is not in inventory, let the customer know it's not currently available.`;

    console.log('📝 Updating Vapi assistant system prompt...');

    // Update the Vapi assistant
    const vapiResponse = await fetch(`https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstMessage: firstMessage || "Hello, how are you doing today?",
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "check_inventory",
                description: "Check what items are currently available in the business inventory. Use this whenever someone asks about availability, pricing, what's in stock, or what you sell.",
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "Search term to look up specific items (e.g., 'iPhone', 'pizza', '3 bedroom'). Leave empty to get all available items."
                    },
                    category: {
                      type: "string",
                      description: "Business type category filter: 'gadgets', 'real_estate', or 'restaurant'. Optional.",
                      enum: ["gadgets", "real_estate", "restaurant"]
                    }
                  }
                }
              },
              async: false,
              server: {
                url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/get-inventory`
              }
            }
          ]
        }
      })
    });

    if (!vapiResponse.ok) {
      const errText = await vapiResponse.text();
      console.error('❌ Vapi update error:', errText);
      throw new Error(`Failed to update Vapi assistant: ${errText}`);
    }

    const result = await vapiResponse.json();
    console.log('✅ Vapi assistant system prompt updated:', result.id);

    return new Response(
      JSON.stringify({ success: true, assistantId: result.id }),
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
