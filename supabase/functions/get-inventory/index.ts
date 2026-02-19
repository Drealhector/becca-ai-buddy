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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the request body - Vapi sends function call args in message.functionCall.parameters
    let query = "";
    let category = "";
    
    try {
      const body = await req.json();
      console.log("📦 Inventory request body:", JSON.stringify(body));
      
      // Handle Vapi function calling format
      if (body.message?.functionCall?.parameters) {
        query = body.message.functionCall.parameters.query || "";
        category = body.message.functionCall.parameters.category || "";
      } else {
        // Direct call format
        query = body.query || "";
        category = body.category || "";
      }
    } catch {
      // No body is fine - return all inventory
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

    // Filter by search query if provided
    let filtered = items || [];
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter((item: any) =>
        item.name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.colors?.some((c: string) => c.toLowerCase().includes(q)) ||
        JSON.stringify(item.specs || {}).toLowerCase().includes(q)
      );
    }

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

    const resultText = filtered.length > 0
      ? `Here's what's currently available:\n${formatted.join('\n')}`
      : "No items found matching that query. The inventory may be empty or the item is unavailable.";

    // Return in Vapi-compatible format
    return new Response(
      JSON.stringify({
        results: resultText,
        items: filtered,
        count: filtered.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Inventory error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', results: "Sorry, I couldn't check the inventory right now." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
