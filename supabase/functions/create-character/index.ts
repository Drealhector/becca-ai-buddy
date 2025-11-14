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
      systemPrompt = "You are an expert character designer. Create a complete, structured personality guide that can be used directly. Format it with clear sections: ## Identity & Purpose, ## Voice & Persona (with subsections for Personality and Speech Characteristics), ## Response Guidelines, and any other relevant sections for the character type.";
      userPrompt = `Create a complete personality guide based on this description: ${input.description}

Format the personality with these sections:
## Identity & Purpose
(Define who they are and their main purpose)

## Voice & Persona
### Personality
(Key personality traits and demeanor)

### Speech Characteristics
(How they speak, language style, tone)

## Response Guidelines
(How they should respond in different situations)

Make it detailed, authentic, and ready to use. Start with "You are [name]" in the Identity section.`;
    } else if (type === "search_human") {
      systemPrompt = "You are a web research assistant. Search for comprehensive information about the person including their profession, notable achievements, personality traits, communication style, speech patterns, tone of voice, catchphrases, language quirks (like pidgin English, slang, specific dialects), mannerisms, and how they typically express themselves.";
      userPrompt = `Search for detailed information about: ${input.name}${input.context ? `. Additional context: ${input.context}` : ''}. Provide a comprehensive summary including: who they are, their background, how they speak (language patterns, tone, catchphrases, dialect, slang), their communication style, personality traits, and any distinctive mannerisms.`;
    } else if (type === "create_human_character") {
      systemPrompt = "You are an expert at creating authentic character personalities based on real people. Create a complete, structured personality guide formatted with clear sections that captures this person's exact essence. Never mention 'AI' or 'assistant' - write as if this IS the person.";
      userPrompt = `Based on this information about ${input.name}: ${input.info}

Create a complete personality guide with these sections:

## Identity & Purpose
Start with "You are ${input.name}" and describe their identity, background, and what they're known for.

## Voice & Persona
### Personality
Describe their key personality traits, demeanor, and how they carry themselves.

### Speech Characteristics
Detail their EXACT speech patterns including:
- Specific words/phrases they use frequently
- Their tone and style (formal/casual, serious/humorous)
- Any slang, pidgin, dialect, or unique expressions they use
- Rhythm and pacing of their speech
- Catchphrases or signature expressions

## Response Guidelines
Provide guidelines on how they respond in conversations, including:
- How they greet people
- How they explain things
- How they express opinions
- How they handle disagreements
- Typical conversational patterns

## Knowledge Base
List their areas of expertise and what they're known for.

Make it authentic, detailed, and capture their true essence. Use first-person perspective throughout.`;
    } else if (type === "refine") {
      systemPrompt = "You are an expert character designer. Take the existing personality and refine it with the business context provided. Maintain all the authentic voice, speech patterns, and personality traits while adding the specific business application details.";
      userPrompt = `Refine this personality for business use:

${input.basePersonality}

Business Context:
- Task: ${input.task}
- Link to share: ${input.link || 'Not provided'}
- Business information: ${input.businessInfo}

Enhance the personality by:
1. Keeping ALL existing sections and authentic voice
2. Adding specific business application details
3. Including how they handle the specific task mentioned
4. Maintaining their speech patterns and personality traits
5. Adding any business-specific response guidelines

Keep the same format with ## sections and make it ready to use.`;
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
