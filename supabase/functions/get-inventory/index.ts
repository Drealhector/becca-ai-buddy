import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Common speech-to-text misinterpretations and their corrections
const FUZZY_MAP: Record<string, string[]> = {
  'alienware': ['alien way', 'alien ware', 'alien wear', 'alienwear', 'alien where', 'ailien ware', 'alien weir', 'alienway', 'alian ware'],
  'iphone': ['i phone', 'eye phone', 'iphones', 'i phones'],
  'macbook': ['mac book', 'mackbook', 'mac boo'],
  'samsung': ['sam sung', 'samsang', 'samson'],
  'playstation': ['play station', 'plays tation', 'play stations'],
  'nintendo': ['nin tendo', 'nintendos'],
  'xbox': ['x box', 'ex box', 'x-box'],
  'airpods': ['air pods', 'air pod', 'airpod', 'air buds'],
  'dell': ['del', 'delle'],
  'lenovo': ['le novo', 'lennovo'],
  'asus': ['a sus', 'ay sus'],
  'huawei': ['hua wei', 'hwa way', 'wah way', 'who ah way'],
  'pixel': ['pix el', 'pixle'],
};

function correctQuery(query: string): string {
  const lower = query.toLowerCase().trim();
  for (const [correct, misspellings] of Object.entries(FUZZY_MAP)) {
    for (const variant of misspellings) {
      if (lower.includes(variant)) {
        return lower.replace(variant, correct);
      }
    }
  }
  return lower;
}

// Levenshtein distance for additional fuzzy matching
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request — handle Vapi persisted tool call format AND direct calls
    let query = "";
    let category = "";
    let toolCallId = "";

    try {
      const body = await req.json();
      console.log("📦 Inventory request body:", JSON.stringify(body));

      // Vapi persisted tool format: body.message.toolCalls[0]
      const message = body.message || body;
      const toolCalls = message.toolCalls || message.tool_calls || [];

      if (toolCalls.length > 0) {
        const toolCall = toolCalls[0];
        toolCallId = toolCall.id || "";
        const args = toolCall.function?.arguments || toolCall.arguments || {};
        const parsed = typeof args === "string" ? JSON.parse(args) : args;
        query = parsed.query || "";
        category = parsed.category || "";
        console.log(`🔧 Vapi tool call: id=${toolCallId}, query="${query}", category="${category}"`);
      } else if (body.message?.functionCall?.parameters) {
        // Legacy inline tool format
        query = body.message.functionCall.parameters.query || "";
        category = body.message.functionCall.parameters.category || "";
      } else {
        // Direct call
        query = body.query || "";
        category = body.category || "";
        toolCallId = body.toolCallId || "direct";
      }
    } catch {
      // No body is fine — return all inventory
    }

    // Apply speech-to-text correction
    const originalQuery = query;
    query = correctQuery(query);
    if (query !== originalQuery.toLowerCase().trim()) {
      console.log(`🔄 Corrected query: "${originalQuery}" → "${query}"`);
    }

    console.log(`🔍 Searching inventory: query="${query}", category="${category}"`);

    let dbQuery = supabase
      .from('inventory')
      .select('*')
      .eq('is_available', true)
      .order('name');

    if (category) {
      dbQuery = dbQuery.eq('business_type', category);
    }

    const { data: items, error } = await dbQuery;
    if (error) throw error;

    // Filter by search query with fuzzy matching
    let filtered = items || [];
    if (query) {
      const q = query.toLowerCase();

      // First try exact substring match
      let matched = filtered.filter((item: any) =>
        item.name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.colors?.some((c: string) => c.toLowerCase().includes(q)) ||
        JSON.stringify(item.specs || {}).toLowerCase().includes(q)
      );

      // If no exact match, try fuzzy (Levenshtein) on item names
      if (matched.length === 0) {
        const qWords = q.split(/\s+/);
        matched = filtered.filter((item: any) => {
          const nameWords = (item.name || '').toLowerCase().split(/\s+/);
          return qWords.some(qw =>
            nameWords.some((nw: string) => {
              const dist = levenshtein(qw, nw);
              return dist <= Math.max(1, Math.floor(nw.length * 0.3));
            })
          );
        });
        if (matched.length > 0) {
          console.log(`🔄 Fuzzy match found ${matched.length} items for "${q}"`);
        }
      }

      filtered = matched;
    }

    // Determine business type
    const businessTypes = [...new Set((items || []).map((i: any) => i.business_type))];
    const businessTypeLabel = businessTypes.length === 1 ? businessTypes[0] : businessTypes.join(', ') || 'general';

    // Fetch owner phone for escalation context
    const { data: custData } = await supabase
      .from('customizations')
      .select('owner_phone')
      .limit(1)
      .maybeSingle();

    const hasOwnerPhone = !!custData?.owner_phone;
    const itemFound = filtered.length > 0;

    // Format response for the AI to read naturally
    const formatted = filtered.map((item: any) => {
      let info = `- ${item.name}`;
      if (item.price != null) info += ` | Price: ${item.currency || 'USD'} ${item.price}`;
      if (item.quantity > 1) info += ` | Qty: ${item.quantity}`;
      if (item.colors?.length > 0) info += ` | Colors: ${item.colors.join(', ')}`;
      if (item.location) info += ` | Location: ${item.location}`;
      if (item.description) info += ` | ${item.description}`;
      if (item.specs && Object.keys(item.specs).length > 0) {
        info += ` | Specs: ${Object.entries(item.specs).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
      }
      return info;
    });

    const resultText = itemFound
      ? `Here's what's currently available:\n${formatted.join('\n')}`
      : `ITEM_NOT_FOUND: No items found matching "${originalQuery || 'that query'}". The business type is "${businessTypeLabel}". ${hasOwnerPhone ? 'Escalation is available — use escalate_to_human if the item is relevant to this business type.' : 'No escalation number configured.'}`;

    console.log(`✅ Inventory result: found=${itemFound}, items=${filtered.length}`);

    // Return Vapi persisted tool format — results array with toolCallId
    const resultPayload = {
      item_found: itemFound,
      items: filtered,
      count: filtered.length,
      business_type: businessTypeLabel,
      owner_phone: custData?.owner_phone || null,
      escalation_allowed: hasOwnerPhone && !itemFound,
      summary: resultText,
    };

    if (toolCallId) {
      // Vapi persisted tool response format
      return new Response(
        JSON.stringify({
          results: [{ toolCallId, result: resultPayload }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback for direct/legacy calls
    return new Response(
      JSON.stringify({
        results: resultText,
        item_found: itemFound,
        items: filtered,
        count: filtered.length,
        business_type: businessTypeLabel,
        owner_phone: custData?.owner_phone || null,
        escalation_allowed: hasOwnerPhone && !itemFound,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Inventory error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        results: "Sorry, I couldn't check the inventory right now.",
        item_found: false,
        items: [],
        count: 0,
        business_type: "unknown",
        owner_phone: null,
        escalation_allowed: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
