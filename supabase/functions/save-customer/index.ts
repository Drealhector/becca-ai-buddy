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
    let name = "";
    let summary = "";
    let toolCallId = "";

    const body = await req.json();
    console.log("📦 Save customer request:", JSON.stringify(body));

    const message = body.message || body;
    const toolCalls = message.toolCalls || message.tool_calls || [];

    if (toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      toolCallId = toolCall.id || "";
      const args = toolCall.function?.arguments || toolCall.arguments || {};
      const parsed = typeof args === "string" ? JSON.parse(args) : args;
      phoneNumber = parsed.phone_number || "";
      name = parsed.name || "";
      summary = parsed.summary || "";
    } else {
      phoneNumber = body.phone_number || "";
      name = body.name || "";
      summary = body.summary || "";
      toolCallId = body.toolCallId || "direct";
    }

    console.log(`💾 Saving customer: phone="${phoneNumber}", name="${name}", summary="${summary}"`);

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({
          results: [{ toolCallId: toolCallId || "direct", result: "Error: no phone number provided" }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const now = new Date().toISOString();

    // Check if caller exists
    let { data: existing } = await supabase
      .from('callers')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    // Try alternative format if not found
    if (!existing) {
      const withoutPlus = cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone;
      const withPlus = cleanPhone.startsWith('+') ? cleanPhone : '+' + cleanPhone;

      const { data: altExisting } = await supabase
        .from('callers')
        .select('*')
        .or(`phone.eq.${withoutPlus},phone.eq.${withPlus}`)
        .maybeSingle();

      existing = altExisting;
    }

    if (existing) {
      // Update existing caller
      const updates: any = {
        call_count: (existing.call_count || 0) + 1,
        last_call_at: now,
        updated_at: now,
      };

      // Update name only if provided and not already set
      if (name && (!existing.name || existing.name === '')) {
        updates.name = name;
      } else if (name && existing.name && name !== existing.name) {
        // Name changed — update it (caller corrected their name)
        updates.name = name;
      }

      // Append summary to memory
      if (summary) {
        const existingMemory = existing.memory_summary || '';
        const datestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const newEntry = `[${datestamp}] ${summary}`;
        // Keep last 5 summaries to avoid bloat
        const memories = existingMemory ? existingMemory.split('\n').filter((m: string) => m.trim()) : [];
        memories.push(newEntry);
        const trimmed = memories.slice(-5);
        updates.memory_summary = trimmed.join('\n');
      }

      const { error } = await supabase
        .from('callers')
        .update(updates)
        .eq('phone', existing.phone);

      if (error) throw error;
      console.log(`✅ Updated existing caller: ${existing.phone}, name: ${updates.name || existing.name}`);
    } else {
      // Insert new caller
      const newCaller: any = {
        phone: cleanPhone,
        call_count: 1,
        last_call_at: now,
        updated_at: now,
      };

      if (name) newCaller.name = name;

      if (summary) {
        const datestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        newCaller.memory_summary = `[${datestamp}] ${summary}`;
      }

      const { error } = await supabase
        .from('callers')
        .insert(newCaller);

      if (error) throw error;
      console.log(`✅ Created new caller: ${cleanPhone}, name: ${name || 'unknown'}`);
    }

    return new Response(
      JSON.stringify({
        results: [{ toolCallId: toolCallId || "direct", result: "Customer information saved successfully" }]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Save customer error:', error);
    return new Response(
      JSON.stringify({
        results: [{ toolCallId: "error", result: "Failed to save customer information" }]
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
