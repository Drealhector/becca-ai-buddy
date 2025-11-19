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
      systemPrompt = `Generate a directive AI personality prompt using "You are" format. Follow this exact structure with NO introduction text:

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

Use bullet points, numbered lists, and concrete examples. Write directives like "You are", "Use", "Start with", "Keep responses", etc.`;
      userPrompt = `Create an AI personality prompt for: ${input.description}

Use directive format throughout (You are, Use, Keep, etc.). Be specific and actionable.`;
    } else if (type === "search_human") {
      systemPrompt = `You are a comprehensive research assistant with internet access. Your goal is to find detailed information about ANY person with an online presence, not just celebrities.

SEARCH BROADLY across:
- LinkedIn profiles and professional networks
- Company websites and team pages
- Industry publications and interviews
- Social media platforms (Twitter/X, Instagram, YouTube, TikTok)
- Podcast appearances and speaking engagements
- Academic publications and ResearchGate
- GitHub and professional portfolios
- News articles and press releases
- Blog posts and personal websites
- Conference presentations and panels
- Community forums and Reddit discussions
- Product Hunt, Medium, Substack profiles

Look for:
- Professional background, current role, company
- Areas of expertise and specialization
- Communication style (formal, casual, technical, friendly)
- Notable achievements or contributions
- Public personality traits and characteristics
- Speech patterns, catchphrases, or distinctive language
- Values, beliefs, or causes they support
- Industry reputation and how others describe them
- Content they create (writing style, video presence, etc.)
- Any distinctive behavioral traits or mannerisms

Provide comprehensive, factual information in clear bullet points. Include sources of information when relevant.`;
      userPrompt = `Search the internet comprehensively for: ${input.name}${input.context ? `\n\nAdditional context: ${input.context}` : ''}

Cast a wide net - search across professional networks, social media, publications, and any platform where this person has a presence. Find as much detail as possible about who they are and how they communicate.`;
    } else if (type === "create_human_character") {
      systemPrompt = `Generate a directive AI personality prompt that captures this person's essence. Use "You are" format with NO introduction. Follow this structure:

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

Capture their exact speech patterns, mannerisms, catchphrases, and dialect using directive commands.`;
      userPrompt = `Based on: ${input.info}

Create a directive personality prompt capturing their exact essence, speech patterns, and style. Use "You are" format throughout.`;
    } else if (type === "refine") {
      systemPrompt = `Generate a directive AI personality prompt tailored to the specific task and business. Use "You are" format with NO introduction. Follow this structure:

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

CRITICAL: Center EVERYTHING around the task and business context. Make it specific and actionable.`;
      userPrompt = `${input.basePersonality ? `Base style to adapt:\n${input.basePersonality}\n\n` : ''}Task: ${input.task}
Business: ${input.businessInfo}
${input.link ? `Link: ${input.link}\n` : ''}
Create a directive personality prompt centered on this task and business. Use "You are" format with specific, actionable directives.`;
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
