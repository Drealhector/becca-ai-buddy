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
    const { platform, messages, conversation_id } = await req.json();
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create or update conversation
    const { data: conversation } = await supabase
      .from("conversations")
      .upsert({
        id: conversation_id,
        platform,
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    // Save messages
    let salesFlagged = false;
    for (const message of messages) {
      await supabase.from("messages").insert({
        conversation_id: conversation_id,
        role: message.role,
        content: message.content,
        sender_name: message.sender_name || (message.role === "user" ? "Unknown" : "Becca"),
        timestamp: message.timestamp || new Date().toISOString(),
        platform,
      });

      // Check for sales keywords
      if (message.content.toLowerCase().includes("buy") || 
          message.content.includes("$") ||
          message.content.toLowerCase().includes("purchase")) {
        salesFlagged = true;
      }
    }

    // If sales flagged, create a sales record
    if (salesFlagged) {
      const amount = 0; // Extract amount from message if needed
      await supabase.from("sales").insert({
        conversation_id,
        amount,
        description: "Sale detected from conversation",
        timestamp: new Date().toISOString(),
      });

      // Update wallet
      const { data: wallet } = await supabase
        .from("wallet")
        .select("*")
        .limit(1)
        .single();

      if (wallet) {
        await supabase
          .from("wallet")
          .update({
            total: (wallet.total || 0) + amount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", wallet.id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("N8N webhook error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
