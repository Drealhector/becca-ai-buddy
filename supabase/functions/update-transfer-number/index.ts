import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRANSFER_TOOL_ID = "76f61ace-fb6d-4323-a226-7ffa61969008";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedNumber = phoneNumber.trim();
    console.log("📞 Updating Vapi transferCall tool destination to:", trimmedNumber);

    const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY");
    if (!VAPI_API_KEY) {
      throw new Error("VAPI_API_KEY not configured");
    }

    // Update the Vapi transferCall tool's destination number
    const response = await fetch(`https://api.vapi.ai/tool/${TRANSFER_TOOL_ID}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        destinations: [
          {
            type: "number",
            number: trimmedNumber,
            message: "Connecting you to our manager now. One moment please.",
          },
        ],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Vapi tool update failed:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: "Failed to update transfer destination", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Vapi transferCall tool updated successfully");

    return new Response(
      JSON.stringify({ success: true }),
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
