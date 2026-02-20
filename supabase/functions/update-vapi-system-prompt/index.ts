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

    // Determine business type from inventory
    const businessTypes = [...new Set((inventory || []).map((i: any) => i.business_type))];
    const businessTypeLabel = businessTypes.length === 1 ? businessTypes[0] : businessTypes.join(', ') || 'general';

    // Fetch owner phone for escalation
    const { data: custData } = await supabase
      .from('customizations')
      .select('owner_phone')
      .limit(1)
      .maybeSingle();

    const hasOwnerPhone = !!custData?.owner_phone;

    let inventoryNote = "";
    if (inventory && inventory.length > 0) {
      inventoryNote = `\n\n=== CURRENT INVENTORY (${inventory.length} items) ===\nBusiness Type: ${businessTypeLabel}\nYou have access to a tool called "check_inventory" to look up real-time inventory. ALWAYS use this tool when someone asks about availability, pricing, what you have, or what's in stock. Never guess — always check.\n`;
    } else {
      inventoryNote = `\n\nBusiness Type: ${businessTypeLabel}\nYou have access to a tool called "check_inventory" to look up real-time inventory. Use it when anyone asks about what's available. Currently the inventory may be empty.\n`;
    }

    const memoryInstructions = `

=== CUSTOMER MEMORY ENGINE ===
At the START of every call, you MUST call the get_customer_memory tool with the caller's phone number.

Based on the result:
- If "No prior record": This is a new caller. Treat them as a first-time caller.
- If memory exists:
  - If days_since_last_call is 0: Say something like "Good to hear from you again."
  - If days_since_last_call is 1: Say something like "We spoke just yesterday."
  - If days_since_last_call is 2-6: Say something like "We spoke a few days ago."
  - If days_since_last_call is 7+: Say something like "It's been a little while."
  - If name is not null, use their name naturally in conversation.
  - If name is null, at some natural point during the conversation (NOT at the very beginning), casually ask "By the way, may I know your name?" — ask this ONLY ONCE. If they provide a name, IMMEDIATELY call save_customer_name. If they refuse, do NOT ask again.
  - If last_summary exists, use it to build natural context. For example: "Last time we chatted about [topic]..."

STRICT RULES:
- NEVER mention exact dates or timestamps.
- NEVER say "I am accessing a database" or "checking records."
- NEVER mention "customer memory" or "memory system."
- Always sound natural and conversational.
- Use the memory to be helpful, not creepy.`;

    const escalationInstructions = hasOwnerPhone ? `
=== SMART ESCALATION (Case A — Inventory Miss, Relevant Category) ===
Business Type: ${businessTypeLabel}
You have access to a tool called "escalate_to_human". Use it ONLY when ALL of these conditions are met:
1. The caller asked for a specific item that is NOT in the inventory (check_inventory returned no results)
2. The requested item is RELEVANT to the business type "${businessTypeLabel}" (e.g., asking for an iPhone at a gadgets store = relevant; asking for an iPhone at a restaurant = NOT relevant)
3. You have not already escalated for this same item in this conversation
4. Never escalate more than once per call

When escalating:
- Tell the caller: "Let me check with the team on that for you."
- Call the escalate_to_human tool with the item name and any context
- After calling the tool, tell the caller you've notified the team and they'll look into it

When NOT to escalate (item is irrelevant to business type):
- Simply tell the caller: "I'm sorry, we don't carry that type of item. We're a ${businessTypeLabel} business."
- Be natural and helpful about it

=== HUMAN TRANSFER (Case B — Caller Requests a Human) ===
If the caller explicitly asks to speak with a human, manager, representative, or real person,
use the transferCall tool IMMEDIATELY.
Do NOT use escalate_to_human for this case — transferCall hands the call over directly.
Say something like: "Sure, let me connect you to someone right away."
` : `
=== ESCALATION ===
No human support number is configured. If a caller asks for something not in inventory, let them know it's currently unavailable and suggest they check back later.
If a caller asks to speak to a human, apologize and let them know no one is available right now.
`;

    const systemPrompt = `${personality}

${inventoryNote}

=== MANDATORY INVENTORY INSTRUCTIONS ===
If a caller asks about product availability, price, stock, or category,
you MUST call the check_inventory tool before responding.
Never guess prices or availability.
If no result is returned, evaluate whether the item is relevant to the business type before deciding to escalate.
Keep responses short and conversational.

${escalationInstructions}

=== ADDITIONAL INSTRUCTIONS ===
- When someone asks "what do you have?", "what's available?", "do you have X?", or anything about products/items/inventory, ALWAYS call the check_inventory tool first before answering.
- Provide accurate pricing and details from the inventory data.
- If an item is not in inventory, evaluate relevance to business type before responding.
${memoryInstructions}`;

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
            },
            {
              type: "function",
              function: {
                name: "get_customer_memory",
                description: "Retrieve memory for a returning caller using their phone number. Call this at the START of every call to check if the caller has called before. Returns their name, conversation count, last call summary, and days since last call.",
                parameters: {
                  type: "object",
                  properties: {
                    phone_number: {
                      type: "string",
                      description: "The caller's phone number in E.164 format (e.g., +1234567890)"
                    }
                  },
                  required: ["phone_number"]
                }
              },
              async: false,
              server: {
                url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/get-customer-memory`
              }
            },
            {
              type: "function",
              function: {
                name: "save_customer_name",
                description: "Save a customer's name after they provide it during conversation. Only call this once when the customer tells you their name.",
                parameters: {
                  type: "object",
                  properties: {
                    phone_number: {
                      type: "string",
                      description: "The caller's phone number in E.164 format"
                    },
                    name: {
                      type: "string",
                      description: "The customer's name as they provided it"
                    }
                  },
                  required: ["phone_number", "name"]
                }
              },
              async: false,
              server: {
                url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/save-customer-name`
              }
            },
            ...(hasOwnerPhone ? [
              {
                type: "function",
                function: {
                  name: "escalate_to_human",
                  description: "Call the business owner/manager to ask about an item that a customer is requesting but is NOT in the current inventory. ONLY use this when the requested item is relevant to the business type. Do NOT use for items irrelevant to the business. Do NOT use when a caller asks to speak to a human — use transferCall instead.",
                  parameters: {
                    type: "object",
                    properties: {
                      item_requested: {
                        type: "string",
                        description: "The specific item or product the customer is asking about"
                      },
                      caller_context: {
                        type: "string",
                        description: "Any additional context about what the caller needs (e.g., color, size, urgency)"
                      }
                    },
                    required: ["item_requested"]
                  }
                },
                async: false,
                server: {
                  url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/escalate-to-human`
                }
              },
              {
                type: "transferCall",
                destinations: [],
                function: {
                  name: "transferCall",
                  description: "Transfer the call directly to a human representative. Use this ONLY when the caller explicitly asks to speak with a human, manager, or representative. Do NOT use for inventory inquiries — use escalate_to_human instead.",
                  parameters: {
                    type: "object",
                    properties: {}
                  }
                },
                server: {
                  url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/vapi-call-webhook`
                }
              }
            ] : [])
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
