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
    const url = new URL(req.url);
    const platform = url.searchParams.get("platform");

    console.log("🔍 Checking toggle for platform:", platform);

    if (!platform) {
      console.log("❌ No platform parameter provided");
      return new Response(JSON.stringify({ error: "Platform parameter required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: toggles, error: toggleError } = await supabase
      .from("toggles")
      .select("*")
      .limit(1)
      .single();

    if (toggleError) {
      console.error("❌ Error fetching toggles:", toggleError);
      throw toggleError;
    }

    console.log("📊 Toggle data:", toggles);

    const fieldMap: Record<string, string> = {
      whatsapp: "whatsapp_on",
      instagram: "instagram_on",
      facebook: "facebook_on",
      telegram: "telegram_on",
    };

    const field = fieldMap[platform.toLowerCase()];
    console.log("🗺️ Mapped field:", field);
    console.log("🎚️ Individual toggle value:", toggles?.[field]);
    console.log("🎛️ Master switch value:", toggles?.master_switch);
    
    const isOn = toggles?.[field] && toggles?.master_switch;
    console.log("✅ Final result - isOn:", isOn);

    return new Response(JSON.stringify({ on: isOn || false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Check toggle error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
