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

=== CALLER CONTEXT ===
The system AUTOMATICALLY injects caller context into your prompt at the start of each call via a server-side hook.

When you see a "CALLER CONTEXT" section in your prompt:
- It contains the caller's history, name, and last conversation summary
- Use this information IMMEDIATELY in your FIRST greeting
- If they are a returning caller, acknowledge it naturally
- If their name is known, USE IT
- If their name is unknown, ask casually ONCE later in the conversation

STRICT RULES:
- You ALREADY HAVE the caller's phone number. NEVER ask "What is your phone number?"
- NEVER mention databases, records, memory systems, or "looking them up"
- Sound natural, as if you genuinely remember them
- Use the memory to be warm and helpful, not creepy or robotic`;

    const escalationInstructions = hasOwnerPhone ? `
=== HUMAN TRANSFER — HIGHEST PRIORITY ===
If the caller uses ANY phrase requesting a human (e.g. "speak to a person", "talk to someone", "manager", "representative", "real person", "transfer me", "connect me"), IMMEDIATELY say something brief like "Sure, let me connect you to the manager!" and call transferCall. Do NOT stall or say "just a sec" repeatedly. ALWAYS say "the manager" or "our manager" so the caller knows WHO they're being transferred to.

=== ITEM NOT FOUND — RELEVANT ITEM (TRANSFER TO MANAGER) ===
Business Type: ${businessTypeLabel}
When a caller asks about a specific item that you cannot confirm is available but IS relevant to the business type "${businessTypeLabel}":
1. Respond naturally and in-character. Express uncertainty and let them know you'll connect them to the manager. Examples (vary naturally):
   - "Hmm, I'm not entirely sure about that one. Let me connect you to the manager, they'll know for sure."
   - "That's a great question! I'd rather not guess, let me put you through to our manager real quick."
   - "I'm not sure if we currently have that. Let me transfer you to the manager so they can help you out."
2. ALWAYS mention "the manager" or "our manager" so the caller knows WHO they're being transferred to.
3. Do NOT use a fixed script. Vary your wording based on your personality and the flow of conversation.
4. Then IMMEDIATELY call transferCall to connect the caller to the manager.
5. Do NOT say "we don't have it" definitively. Frame it as uncertainty and offer the transfer.

=== ITEM NOT FOUND — IRRELEVANT ITEM (DECLINE) ===
If the caller asks about an item that is NOT relevant to the "${businessTypeLabel}" business type:
- Politely decline: "I'm sorry, that's not something we carry, we're a ${businessTypeLabel} business."
- Do NOT transfer the call for irrelevant items.
- Offer to help with something else.
` : `
=== ESCALATION ===
No human support number is configured. If a caller asks for something you're unsure about, let them know you're not sure and suggest checking back later.
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
- When the summary says ITEM_NOT_FOUND: the item is NOT in stock. Check if the item is relevant to the business type "${businessTypeLabel}".
  - If RELEVANT: express uncertainty naturally, then call transferCall to connect the caller to our manager.
  - If NOT RELEVANT: politely decline and explain your business type.

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
- When an item is NOT found and it IS relevant to our business type, express uncertainty and use transferCall to connect the caller to our manager — do NOT just say "sorry we don't have it."
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
