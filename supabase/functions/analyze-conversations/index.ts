import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversations, question } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!conversations || conversations.length === 0) {
      return new Response(
        JSON.stringify({ error: "No conversations provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format conversations for AI analysis
    let formattedData = "";
    conversations.forEach((conv: any) => {
      const platform = conv.platform || "Unknown";
      const startTime = conv.start_time ? new Date(conv.start_time).toLocaleString() : "Unknown";
      formattedData += `\n\n[Conversation on ${platform} at ${startTime}]\n`;
      
      if (conv.messages && conv.messages.length > 0) {
        conv.messages.forEach((msg: any) => {
          const sender = msg.sender_name || msg.role || "User";
          const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : "";
          formattedData += `[${timestamp}] ${sender}: ${msg.content}\n`;
        });
      }
    });

    const systemPrompt = `You are a helpful AI assistant analyzing customer conversations. 
When answering questions, be conversational and friendly.
Focus on providing clear, actionable insights.
If the user asks a follow-up question, build on the previous context.`;

    const userPrompt = question || "Please provide an overall summary of these conversations";
    const fullPrompt = `${userPrompt}\n\nHere's the conversation data:\n${formattedData}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: fullPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "I couldn't analyze the conversations.";

    return new Response(
      JSON.stringify({ summary: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-conversations:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
