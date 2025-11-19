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
      systemPrompt = `You are an expert AI personality architect. Create a COMPREHENSIVE, PRODUCTION-READY personality guide following this exact structure:

# Identity & Purpose
# Voice & Persona
## Personality
## Speech Characteristics
# Conversation Flow
## Introduction
## Engagement
## Problem Solving
## Resolution
## Closing
# Response Guidelines
# Scenario Handling
# Knowledge Base
# Limitations

Make every section detailed, specific, and directly usable. Include concrete examples.`;
      userPrompt = `Create a comprehensive AI personality based on this description: ${input.description}

Generate a COMPLETE personality template that includes:
- Clear identity and purpose
- Detailed personality traits and speech patterns
- Full conversation flow from greeting to closing
- Specific response guidelines with examples
- Scenario handling approaches
- Knowledge base of what they know
- Clear limitations

Make it production-ready and immediately usable.`;
    } else if (type === "search_human") {
      systemPrompt = "You are a web research assistant. Search for comprehensive information about the person including their profession, notable achievements, personality traits, communication style, speech patterns, tone of voice, catchphrases, language quirks (like pidgin English, slang, specific dialects), mannerisms, and how they typically express themselves.";
      userPrompt = `Search for detailed information about: ${input.name}${input.context ? `. Additional context: ${input.context}` : ''}. Provide a comprehensive summary including: who they are, their background, how they speak (language patterns, tone, catchphrases, dialect, slang), their communication style, personality traits, and any distinctive mannerisms.`;
    } else if (type === "create_human_character") {
      systemPrompt = `You are an expert at creating authentic AI personalities based on real people. Create a COMPREHENSIVE personality guide following this structure:

# Identity & Purpose
# Voice & Persona
## Personality
## Speech Characteristics
# Conversation Flow
## Introduction
## Engagement
## Problem Solving
## Resolution
## Closing
# Response Guidelines
# Scenario Handling
# Knowledge Base
# Limitations

Capture their EXACT essence - speech patterns, mannerisms, tone, catchphrases, dialect, everything. Write as if this IS the person.`;
      userPrompt = `Based on this information: ${input.info}

Create a COMPREHENSIVE personality guide that captures this person's exact essence including:
- Their identity, background, and purpose
- Precise personality traits and demeanor
- EXACT speech patterns (catchphrases, dialect, slang, tone, rhythm)
- Complete conversation flow from greeting to closing
- Detailed response guidelines with examples
- Scenario handling approaches matching their style
- Their knowledge base and expertise
- Clear limitations

Make it authentic and production-ready. Use first-person perspective throughout.`;
    } else if (type === "refine") {
      systemPrompt = `You are a business-focused AI personality specialist. Create a COMPREHENSIVE, PRODUCTION-READY personality guide following this structure:

# Identity & Purpose
# Voice & Persona
## Personality
## Speech Characteristics
# Conversation Flow
## Introduction
## Engagement
## Problem Solving
## Resolution
## Closing
# Response Guidelines
# Scenario Handling (specific to the business context)
# Knowledge Base (specific to the business)
# Limitations

CRITICAL: The ENTIRE personality must be centered around the specific TASK and BUSINESS CONTEXT provided. Every section should be tailored to this exact use case. Make it practical, actionable, and ready to deploy.`;
      userPrompt = `Create a comprehensive, business-ready AI personality:

${input.basePersonality ? `Base Character Reference (adapt this style):\n${input.basePersonality}\n\n` : ''}SPECIFIC TASK: ${input.task}

BUSINESS CONTEXT: ${input.businessInfo}
${input.link ? `REFERENCE LINK: ${input.link}\n` : ''}
Generate a COMPLETE personality template specifically designed for this task and business including:
- Identity and purpose focused on the task
- Personality and speech characteristics that fit the business
- Complete conversation flow optimized for the business context
- Response guidelines with business-specific examples
- Scenario handling for situations in THIS business
- Knowledge base specific to THIS business/industry
- Clear limitations relevant to the role

Make every detail specific to the task and business. This should be immediately deployable.`;
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
