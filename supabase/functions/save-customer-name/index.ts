import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("📞 save-customer-name request:", JSON.stringify(payload));

    // Extract from Vapi function call format
    const message = payload.message || payload;
    const toolCalls = message.toolCalls || message.tool_calls || [];

    let phoneNumber = "";
    let name = "";
    let toolCallId = "";

    if (toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      toolCallId = toolCall.id || "";
      const args = toolCall.function?.arguments || toolCall.arguments || {};
      const parsed = typeof args === "string" ? JSON.parse(args) : args;
      phoneNumber = parsed.phone_number;
      name = parsed.name;
    } else {
      phoneNumber = payload.phone_number;
      name = payload.name;
      toolCallId = payload.toolCallId || "direct-call";
    }

    if (!phoneNumber || !name) {
      return new Response(
        JSON.stringify({
          results: [{ toolCallId, result: "Missing phone_number or name" }]
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if record exists
    const { data: existing } = await supabase
      .from("customer_memory")
      .select("phone_number")
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    if (existing) {
      // Update name only
      const { error } = await supabase
        .from("customer_memory")
        .update({ name })
        .eq("phone_number", phoneNumber);

      if (error) throw error;
    } else {
      // Create new record with name
      const { error } = await supabase
        .from("customer_memory")
        .insert({
          phone_number: phoneNumber,
          name,
          conversation_count: 0,
          call_history: [],
        });

      if (error) throw error;
    }

    console.log("✅ Name saved for:", phoneNumber, "→", name);

    return new Response(
      JSON.stringify({
        results: [{ toolCallId, result: "Name saved successfully" }]
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
