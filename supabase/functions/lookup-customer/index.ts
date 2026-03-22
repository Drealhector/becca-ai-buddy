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

    // Parse VAPI tool call format
    let phoneNumber = "";
    let toolCallId = "";

    const body = await req.json();
    console.log("📦 Lookup customer request:", JSON.stringify(body));

    const message = body.message || body;
    const toolCalls = message.toolCalls || message.tool_calls || [];

    if (toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      toolCallId = toolCall.id || "";
      const args = toolCall.function?.arguments || toolCall.arguments || {};
      const parsed = typeof args === "string" ? JSON.parse(args) : args;
      phoneNumber = parsed.phone_number || "";
    } else {
      phoneNumber = body.phone_number || "";
      toolCallId = body.toolCallId || "direct";
    }

    console.log(`🔍 Looking up customer: phone="${phoneNumber}"`);

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({
          results: [{ toolCallId: toolCallId || "direct", result: { found: false, reason: "No phone number provided" } }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean phone number — remove spaces, dashes, keep +
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Try exact match first, then without + prefix
    let { data: caller } = await supabase
      .from('callers')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    // If not found, try alternative formats
    if (!caller) {
      const withoutPlus = cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone;
      const withPlus = cleanPhone.startsWith('+') ? cleanPhone : '+' + cleanPhone;

      const { data: altCaller } = await supabase
        .from('callers')
        .select('*')
        .or(`phone.eq.${withoutPlus},phone.eq.${withPlus}`)
        .maybeSingle();

      caller = altCaller;
    }

    let resultPayload: any;

    if (caller) {
      console.log(`✅ Returning customer found: ${caller.name || 'unnamed'}, calls: ${caller.call_count}`);
      resultPayload = {
        found: true,
        name: caller.name || null,
        call_count: caller.call_count || 1,
        last_call_at: caller.last_call_at || null,
        memory_summary: caller.memory_summary || null,
      };
    } else {
      console.log(`ℹ️ New customer: ${cleanPhone}`);
      resultPayload = { found: false };
    }

    return new Response(
      JSON.stringify({
        results: [{ toolCallId: toolCallId || "direct", result: resultPayload }]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Lookup customer error:', error);
    return new Response(
      JSON.stringify({
        results: [{ toolCallId: "error", result: { found: false, error: "lookup failed" } }]
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
