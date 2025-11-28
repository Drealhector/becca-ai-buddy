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
    const { messages, question, conversationHistory = [] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format messages for AI analysis
    const formattedMessages = messages
      .map((msg: any) => {
        const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : "Unknown time";
        const sender = msg.sender_name || msg.role || "Unknown";
        const platform = msg.platform || msg.conversation_platform || "Unknown";
        return `[${timestamp}] [${platform}] ${sender}: ${msg.content}`;
      })
      .join("\n");

    const systemPrompt = `You are an AI assistant analyzing customer conversations from multiple platforms (WhatsApp, Instagram, Facebook, Telegram, Web Chat, Phone Calls).

You are having a conversational interaction with the user. They may ask follow-up questions, request clarifications, or dig deeper into previous analyses.

When responding to follow-up questions:
- Reference previous answers when relevant
- Build upon earlier analysis
- Provide additional details or different perspectives
- Stay focused on the conversation data provided

CRITICAL: You MUST return a structured JSON response with the following format:
{
  "summary": "A clear, conversational response to the user's question (2-4 sentences)",
  "conversationCount": number,
  "topics": [
    {
      "name": "Topic name",
      "count": number of conversations mentioning this,
      "mentions": [
        {
          "timestamp": "ISO timestamp",
          "platform": "platform name",
          "snippet": "brief quote or context",
          "sender": "sender name"
        }
      ]
    }
  ],
  "insights": ["insight 1", "insight 2"]
}

For follow-up questions, you can provide a summary without topics if the question doesn't require topic breakdown.

Conversation data format:
[Timestamp] [Platform] Sender: Message content`;

    // Build conversation messages including history
    const aiMessages = [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: `Here are the conversations to analyze:\n\n${formattedMessages}\n\nI will ask you questions about this data. Please analyze and respond in the specified JSON format.` 
      },
    ];

    // Add conversation history
    conversationHistory.forEach((entry: any) => {
      aiMessages.push({ role: "user", content: entry.question });
      aiMessages.push({ role: "assistant", content: JSON.stringify(entry.answer) });
    });

    // Add current question
    aiMessages.push({ 
      role: "user", 
      content: question 
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        response_format: { type: "json_object" }
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
    const content = data.choices?.[0]?.message?.content || "{}";
    
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      analysis = {
        summary: content,
        conversationCount: messages.length,
        topics: [],
        insights: []
      };
    }

    return new Response(
      JSON.stringify({ analysis }),
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
