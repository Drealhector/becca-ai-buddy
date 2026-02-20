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
    console.log("📞 get-customer-memory request:", JSON.stringify(payload));

    // Extract phone_number and toolCallId from Vapi function call format
    const message = payload.message || payload;
    const toolCalls = message.toolCalls || message.tool_calls || [];
    
    let phoneNumber = "";
    let toolCallId = "";

    if (toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      toolCallId = toolCall.id || "";
      const args = toolCall.function?.arguments || toolCall.arguments || {};
      phoneNumber = typeof args === "string" ? JSON.parse(args).phone_number : args.phone_number;
    } else {
      // Direct call fallback
      phoneNumber = payload.phone_number;
      toolCallId = payload.toolCallId || "direct-call";
    }

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({
          results: [{ toolCallId, result: "No phone number provided" }]
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabase
      .from("customer_memory")
      .select("*")
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    if (error) {
      console.error("❌ DB error:", error);
      throw error;
    }

    if (!data) {
      console.log("ℹ️ No prior record for:", phoneNumber);
      return new Response(
        JSON.stringify({
          results: [{ toolCallId, result: "No prior record" }]
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate days since last call
    const lastContact = new Date(data.last_contacted_at);
    const now = new Date();
    const diffMs = now.getTime() - lastContact.getTime();
    const daysSinceLastCall = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Get last summary from call_history
    const callHistory = data.call_history as any[] || [];
    const lastSummary = callHistory.length > 0
      ? callHistory[callHistory.length - 1].summary
      : null;

    const result = {
      name: data.name,
      conversation_count: data.conversation_count,
      last_summary: lastSummary,
      days_since_last_call: daysSinceLastCall,
    };

    console.log("✅ Returning memory:", JSON.stringify(result));

    return new Response(
      JSON.stringify({
        results: [{ toolCallId, result }]
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
