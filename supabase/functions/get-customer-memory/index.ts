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

    // Extract phone_number and toolCallId from Vapi persisted tool call format
    // Vapi sends: { message: { type: "tool-calls", toolCalls: [{ id, function: { name, arguments } }], call: { customer: { number } } } }
    const message = payload.message || payload;
    const toolCalls = message.toolCalls || message.tool_calls || [];

    let phoneNumber = "";
    let toolCallId = "";

    if (toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      toolCallId = toolCall.id || "";
      const args = toolCall.function?.arguments || toolCall.arguments || {};
      const parsed = typeof args === "string" ? JSON.parse(args) : args;
      phoneNumber = parsed.phone_number || "";

      // If phone_number not passed as argument, try to get it from the call object
      if (!phoneNumber) {
        phoneNumber = message.call?.customer?.number || payload.call?.customer?.number || "";
        console.log("📞 Phone number from call object:", phoneNumber);
      }
    } else {
      // Direct call fallback
      phoneNumber = payload.phone_number || message.phone_number || "";
      toolCallId = payload.toolCallId || "direct-call";
    }

    console.log(`📞 Looking up memory for: ${phoneNumber}, toolCallId: ${toolCallId}`);

    if (!phoneNumber) {
      console.warn("⚠️ No phone number provided");
      return new Response(
        JSON.stringify({
          results: [{ toolCallId: toolCallId || "unknown", result: "No phone number provided. Cannot retrieve caller history." }]
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
          results: [{ toolCallId, result: "No prior record. This is a new caller." }]
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
    // Get last 2 summaries for richer context
    const recentSummaries = callHistory.slice(-2).map((h: any) => h.summary).filter(Boolean);
    const lastSummary = recentSummaries.length > 0 ? recentSummaries[recentSummaries.length - 1] : null;

    const result = {
      name: data.name || null,
      conversation_count: data.conversation_count,
      last_summary: lastSummary,
      recent_history: recentSummaries,
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
