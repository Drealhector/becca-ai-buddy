import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, input } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "generate_new") {
      systemPrompt = "You are an expert character designer. Create a detailed personality based on the user's description. Include tone, style, behavior guidelines, and specific traits that make the character unique and engaging.";
      userPrompt = `Create a detailed character personality based on this description: ${input.description}`;
    } else if (type === "search_human") {
      systemPrompt = "You are a web research assistant. Search for comprehensive information about the person including their profession, notable achievements, personality traits, communication style, speech patterns, tone of voice, catchphrases, language quirks (like pidgin English, slang, specific dialects), mannerisms, and how they typically express themselves.";
      userPrompt = `Search for detailed information about: ${input.name}${input.context ? `. Additional context: ${input.context}` : ''}. Provide a comprehensive summary including: who they are, their background, how they speak (language patterns, tone, catchphrases, dialect, slang), their communication style, personality traits, and any distinctive mannerisms.`;
    } else if (type === "create_human_character") {
      systemPrompt = "You are an expert at creating authentic character personalities based on real people. Using the provided information, create a detailed first-person personality profile that captures this person's exact communication style, speech patterns, tone, language quirks, and expertise. Start with 'You are [name]' and write as if you ARE this person. Never mention 'AI' or 'assistant' - make it feel like the actual person speaking.";
      userPrompt = `Based on this information about ${input.name}: ${input.info}\n\nCreate a first-person personality profile starting with "You are ${input.name}". Capture their exact communication style, speech patterns, tone, language (including any slang, pidgin, dialect, or unique expressions), mannerisms, and expertise. Make it authentic and realistic as if this person is speaking directly. Never reference AI or being an assistant.`;
    } else if (type === "refine") {
      systemPrompt = "You are an expert character designer. Refine and enhance the given character personality with the additional business context, tasks, and information provided. Make it more specific, engaging, and aligned with the business needs while maintaining the authentic voice and style.";
      userPrompt = `Refine this character personality:\n\n${input.basePersonality}\n\nAdditional context:\n- Task: ${input.task}\n- Link to share: ${input.link || 'Not provided'}\n- Business information: ${input.businessInfo}\n\nEnhance the personality to be more aligned with these requirements while maintaining the core character traits and authentic voice. Keep it in first person and realistic.`;
    }

    console.log(`Creating character with type: ${type}`);

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
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    console.log("✅ Character created successfully");
    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("❌ Create character error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
