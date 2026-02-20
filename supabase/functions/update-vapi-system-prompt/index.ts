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
      inventoryNote = `\n\n=== CURRENT INVENTORY (${inventory.length} items) ===\nBusiness Type: ${businessTypeLabel}\nYou have access to a tool called "get_inventory" to look up real-time inventory. ALWAYS use this tool when someone asks about availability, pricing, what you have, or what's in stock. Never guess — always check.\n`;
    } else {
      inventoryNote = `\n\nBusiness Type: ${businessTypeLabel}\nYou have access to a tool called "get_inventory" to look up real-time inventory. Use it when anyone asks about what's available. Currently the inventory may be empty.\n`;
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
=== HUMAN TRANSFER (Case B — HIGHEST PRIORITY) ===
If the caller uses ANY of these phrases or anything similar, IMMEDIATELY call the transferCall tool WITHOUT saying "just a sec" first:
- "speak to a human", "speak to a person", "talk to someone", "talk to a real person"
- "speak to your manager", "speak to a representative", "speak to an agent"
- "can I speak to someone?", "I want to talk to a person"
- "transfer me", "put me through", "connect me to someone"
- "is there a real person?", "can a human help me?"
- ANY variation requesting a person, human, manager, rep, or real individual

WHEN TRANSFERRING: Say "Sure, connecting you now!" then IMMEDIATELY call transferCall. Do NOT say "just a sec" repeatedly. Do NOT stall. One response, then call the tool.

=== SMART ESCALATION (Case A — Inventory Miss for Relevant Item) ===
Business Type: ${businessTypeLabel}
Use escalate_to_human ONLY when ALL these conditions are met:
1. Caller asked about a specific item NOT found in inventory
2. The item IS relevant to the business type "${businessTypeLabel}"
3. You have NOT already escalated in this call (max once per call)
4. The caller did NOT ask to speak to a human (that uses transferCall, not this)

When escalating:
- Tell the caller: "Let me check with our team on that — give me just a moment."
- Call escalate_to_human with the item name and context
- After the tool responds, relay that message to the caller naturally

When NOT to escalate:
- If item is irrelevant to ${businessTypeLabel}: "I'm sorry, we don't carry that — we're a ${businessTypeLabel} business."
` : `
=== ESCALATION ===
No human support number is configured. If a caller asks for something not in inventory, let them know it's unavailable and suggest checking back later.
If a caller asks to speak to a human, politely explain no one is available right now and offer further AI assistance.
`;

    const systemPrompt = `${personality}

${inventoryNote}

=== MANDATORY INVENTORY INSTRUCTIONS ===
If a caller asks about product availability, price, stock, or category, you MUST call the get_inventory tool before responding.
Never guess prices or availability. When the tool returns results, read the "summary" field to get the inventory info.

CRITICAL PRICE READING RULES — MUST FOLLOW:
- Prices in the summary are already written as spoken words (e.g., "fifty thousand naira"). Read them EXACTLY as written.
- NEVER say currency codes like NGN, USD, GBP — always say the full currency name.
- NEVER read raw numbers like "50000" — say "fifty thousand" instead.
- Example correct response: "The Alienware laptop is priced at fifty thousand naira."
- Example WRONG response: "It costs NGN 50000." ← NEVER do this.

ITEM MATCHING RULES:
- When the summary says ITEM_FOUND: tell the caller about that specific item naturally.
- When the summary says ITEM_NOT_FOUND: the item is NOT in stock. Evaluate relevance to business type and escalate if appropriate.
- If the summary mentions "we do not have that exact item" — the caller asked for something we don't carry. Do NOT pretend a different item is the same.
- Example: Caller asks for HP laptop → tool says ITEM_NOT_FOUND → escalate using escalate_to_human because laptops ARE relevant to a gadgets business.

=== SPEECH RECOGNITION NOTE ===
Callers may mispronounce brand names. When calling get_inventory, always use the most likely correct product name spelling:
- "alien way", "alien ware", "a real way", "alienway" → use "Alienware"
- "eye phone", "i phone" → use "iPhone"
- "sam sung" → use "Samsung"
- "mac book" → use "MacBook"
- "h p", "aitch pee" → use "HP"
If unsure of pronunciation, still call get_inventory with your best guess — it has fuzzy matching built in.

${escalationInstructions}

=== ADDITIONAL INSTRUCTIONS ===
- ALWAYS call get_inventory before answering any question about products, stock, availability, or pricing.
- Never tell a caller an item is unavailable without first calling get_inventory to verify.
- When an item is NOT found and it is relevant to our business type, ALWAYS escalate using escalate_to_human — do NOT just say "sorry we don't have it."
- Provide accurate pricing and details from the inventory tool's response, reading all prices in spoken words.
- Keep responses short and conversational.
${memoryInstructions}`;

    console.log('📝 Updating Vapi assistant system prompt (messages only, preserving toolIds)...');

    // First, fetch the current assistant to preserve toolIds
    const getResponse = await fetch(`https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`, {
      headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` }
    });

    let existingToolIds: string[] = [];
    if (getResponse.ok) {
      const existing = await getResponse.json();
      existingToolIds = existing.model?.toolIds || [];
      console.log('📎 Preserving existing toolIds:', existingToolIds);
    }

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
          toolIds: existingToolIds,
        }
      })
    });

    if (!vapiResponse.ok) {
      const errText = await vapiResponse.text();
      console.error('❌ Vapi update error:', errText);
      throw new Error(`Failed to update Vapi assistant: ${errText}`);
    }

    const result = await vapiResponse.json();
    console.log('✅ Vapi assistant system prompt updated (no inline tools):', result.id);

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
