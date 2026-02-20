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
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_WEB_ASSISTANT_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

    if (!VAPI_API_KEY || !VAPI_ASSISTANT_ID) {
      throw new Error('VAPI_API_KEY or VAPI_WEB_ASSISTANT_ID not configured');
    }

    const supabase = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch owner phone to decide if escalation tool is needed
    const { data: custData } = await supabase
      .from('customizations')
      .select('owner_phone')
      .limit(1)
      .maybeSingle();

    const hasOwnerPhone = !!custData?.owner_phone;

    // Step 1: List existing tools to avoid duplicates
    const existingToolsRes = await fetch('https://api.vapi.ai/tool', {
      headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
    });
    const existingTools = await existingToolsRes.json();
    console.log(`📋 Found ${existingTools.length} existing tools`);

    const toolIds: string[] = [];

    // --- get_inventory tool ---
    let inventoryTool = existingTools.find((t: any) => t.function?.name === 'get_inventory');
    if (inventoryTool) {
      console.log(`♻️ get_inventory already exists: ${inventoryTool.id}, updating...`);
      const updateRes = await fetch(`https://api.vapi.ai/tool/${inventoryTool.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          async: false,
          server: {
            url: `${SUPABASE_URL}/functions/v1/get-inventory`,
            timeoutSeconds: 20,
          },
          function: {
            name: "get_inventory",
            description: "Check what items are currently available in the business inventory. Use this whenever someone asks about availability, pricing, what's in stock, or what you sell. Always call this BEFORE answering any product/inventory question.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "What the caller wants (e.g., 'Alienware laptop', 'iPhone 15', 'pizza'). Use the most likely correct spelling even if the caller's pronunciation was unclear."
                },
                category: {
                  type: "string",
                  enum: ["gadgets", "real_estate", "restaurant"],
                  description: "Optional business category filter."
                }
              },
              required: ["query"]
            }
          }
        }),
      });
      const updated = await updateRes.json();
      console.log('✅ get_inventory updated:', updated.id);
      toolIds.push(updated.id);
    } else {
      console.log('🆕 Creating get_inventory tool...');
      const createRes = await fetch('https://api.vapi.ai/tool', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: "function",
          async: false,
          server: {
            url: `${SUPABASE_URL}/functions/v1/get-inventory`,
            timeoutSeconds: 20,
          },
          function: {
            name: "get_inventory",
            description: "Check what items are currently available in the business inventory. Use this whenever someone asks about availability, pricing, what's in stock, or what you sell. Always call this BEFORE answering any product/inventory question.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "What the caller wants (e.g., 'Alienware laptop', 'iPhone 15', 'pizza'). Use the most likely correct spelling even if the caller's pronunciation was unclear."
                },
                category: {
                  type: "string",
                  enum: ["gadgets", "real_estate", "restaurant"],
                  description: "Optional business category filter."
                }
              },
              required: ["query"]
            }
          }
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) {
        console.error('❌ Failed to create get_inventory:', JSON.stringify(created));
        throw new Error(`Failed to create get_inventory tool: ${JSON.stringify(created)}`);
      }
      console.log('✅ get_inventory created:', created.id);
      toolIds.push(created.id);
    }

    // --- escalate_to_human tool ---
    let escalateTool = existingTools.find((t: any) => t.function?.name === 'escalate_to_human');
    if (escalateTool) {
      console.log(`♻️ escalate_to_human already exists: ${escalateTool.id}, updating...`);
      const updateRes = await fetch(`https://api.vapi.ai/tool/${escalateTool.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          async: false,
          server: {
            url: `${SUPABASE_URL}/functions/v1/escalate-to-human`,
            timeoutSeconds: 30,
          },
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
          }
        }),
      });
      const updated = await updateRes.json();
      console.log('✅ escalate_to_human updated:', updated.id);
      toolIds.push(updated.id);
    } else if (hasOwnerPhone) {
      console.log('🆕 Creating escalate_to_human tool...');
      const createRes = await fetch('https://api.vapi.ai/tool', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: "function",
          async: false,
          server: {
            url: `${SUPABASE_URL}/functions/v1/escalate-to-human`,
            timeoutSeconds: 30,
          },
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
          }
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) {
        console.error('❌ Failed to create escalate_to_human:', JSON.stringify(created));
        throw new Error(`Failed to create escalate_to_human tool: ${JSON.stringify(created)}`);
      }
      console.log('✅ escalate_to_human created:', created.id);
      toolIds.push(created.id);
    } else {
      console.log('⏭️ Skipping escalate_to_human — no owner phone configured');
    }

    // --- get_customer_memory tool ---
    let memoryTool = existingTools.find((t: any) => t.function?.name === 'get_customer_memory');
    if (memoryTool) {
      toolIds.push(memoryTool.id);
      console.log(`✅ get_customer_memory exists: ${memoryTool.id}`);
    } else {
      console.log('🆕 Creating get_customer_memory tool...');
      const createRes = await fetch('https://api.vapi.ai/tool', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: "function",
          async: false,
          server: {
            url: `${SUPABASE_URL}/functions/v1/get-customer-memory`,
            timeoutSeconds: 20,
          },
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
          }
        }),
      });
      const created = await createRes.json();
      if (createRes.ok) {
        console.log('✅ get_customer_memory created:', created.id);
        toolIds.push(created.id);
      } else {
        console.error('❌ Failed to create get_customer_memory:', JSON.stringify(created));
      }
    }

    // --- save_customer_name tool ---
    let saveTool = existingTools.find((t: any) => t.function?.name === 'save_customer_name');
    if (saveTool) {
      toolIds.push(saveTool.id);
      console.log(`✅ save_customer_name exists: ${saveTool.id}`);
    } else {
      console.log('🆕 Creating save_customer_name tool...');
      const createRes = await fetch('https://api.vapi.ai/tool', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: "function",
          async: false,
          server: {
            url: `${SUPABASE_URL}/functions/v1/save-customer-name`,
            timeoutSeconds: 20,
          },
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
          }
        }),
      });
      const created = await createRes.json();
      if (createRes.ok) {
        console.log('✅ save_customer_name created:', created.id);
        toolIds.push(created.id);
      } else {
        console.error('❌ Failed to create save_customer_name:', JSON.stringify(created));
      }
    }

    // --- transferCall tool (Vapi native transfer type) ---
    // This handles "speak to a human / manager / person / representative" requests
    let transferTool = existingTools.find((t: any) => t.type === "transferCall" || t.function?.name === "transferCall");
    if (transferTool) {
      console.log(`♻️ transferCall tool already exists: ${transferTool.id}, updating...`);
      // Fetch owner phone for the transfer destination
      const { data: transferCustData } = await supabase
        .from('customizations')
        .select('owner_phone')
        .limit(1)
        .maybeSingle();

      const ownerPhone = transferCustData?.owner_phone;
      if (ownerPhone) {
        const updateRes = await fetch(`https://api.vapi.ai/tool/${transferTool.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            destinations: [
              {
                type: "number",
                number: ownerPhone,
                message: "Connecting you to a team member now. One moment please.",
                description: "Human support team"
              }
            ],
            function: {
              name: "transferCall",
              description: "Transfer the caller to a human team member. Use this immediately whenever the caller asks to speak to a person, human, manager, representative, agent, or anyone real — regardless of how they phrase it.",
              parameters: { type: "object", properties: {} }
            }
          }),
        });
        const updated = await updateRes.json();
        if (updateRes.ok) {
          console.log('✅ transferCall updated:', updated.id);
          toolIds.push(updated.id);
        } else {
          console.error('❌ Failed to update transferCall:', JSON.stringify(updated));
        }
      } else {
        console.log('⏭️ Skipping transferCall update — no owner phone configured');
        toolIds.push(transferTool.id);
      }
    } else if (hasOwnerPhone) {
      console.log('🆕 Creating transferCall tool...');
      const { data: transferCustData } = await supabase
        .from('customizations')
        .select('owner_phone')
        .limit(1)
        .maybeSingle();

      const ownerPhone = transferCustData?.owner_phone;
      if (ownerPhone) {
        const createRes = await fetch('https://api.vapi.ai/tool', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: "transferCall",
            destinations: [
              {
                type: "number",
                number: ownerPhone,
                message: "Connecting you to a team member now. One moment please.",
                description: "Human support team"
              }
            ],
            function: {
              name: "transferCall",
              description: "Transfer the caller to a human team member. Use this immediately whenever the caller asks to speak to a person, human, manager, representative, agent, or anyone real — regardless of how they phrase it.",
              parameters: { type: "object", properties: {} }
            }
          }),
        });
        const created = await createRes.json();
        if (createRes.ok) {
          console.log('✅ transferCall created:', created.id);
          toolIds.push(created.id);
        } else {
          console.error('❌ Failed to create transferCall:', JSON.stringify(created));
        }
      } else {
        console.log('⏭️ Skipping transferCall creation — no owner phone configured');
      }
    } else {
      console.log('⏭️ Skipping transferCall — no owner phone configured');
    }

    // Step 2: Attach all tools via toolIds to assistant (NO model.tools)
    console.log(`🔗 Attaching ${toolIds.length} tools via toolIds:`, toolIds);

    // First get current assistant to preserve existing config
    const getAssistantRes = await fetch(`https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`, {
      headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
    });
    const currentAssistant = await getAssistantRes.json();

    // Build PATCH payload: set toolIds, remove model.tools completely
    const patchPayload: any = {
      model: {
        ...(currentAssistant.model || {}),
        toolIds: toolIds,
      },
    };
    // Explicitly remove inline tools
    delete patchPayload.model.tools;

    const patchRes = await fetch(`https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patchPayload),
    });

    const patchResult = await patchRes.json();
    if (!patchRes.ok) {
      console.error('❌ Failed to patch assistant:', JSON.stringify(patchResult));
      throw new Error(`Failed to attach tools: ${JSON.stringify(patchResult)}`);
    }

    console.log('✅ Assistant patched with toolIds. Inline tools removed.');
    console.log('Tool IDs attached:', toolIds);

    return new Response(
      JSON.stringify({
        success: true,
        toolIds,
        assistantId: VAPI_ASSISTANT_ID,
        tools_attached: toolIds.length,
        message: "All tools created as persisted tools and attached via toolIds. No inline tools."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Setup error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
