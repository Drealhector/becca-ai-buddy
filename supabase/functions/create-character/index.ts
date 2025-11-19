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
    const { type, input } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";
    let searchResults = "";

    // If searching for a human, do actual web search first
    if (type === "search_human") {
      console.log(`Performing web search for: ${input.name}`);
      
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      try {
        // Simple search first - just the name
        const { data: searchData, error: searchError } = await supabase.functions.invoke('web-search', {
          body: { 
            query: `${input.name} ${input.context || ''}`.trim(),
            numResults: 10
          }
        });

        if (searchError) {
          console.error("Web search error:", searchError);
        } else if (searchData?.results && searchData.results.length > 0) {
          searchResults = searchData.results.map((result: any, index: number) => 
            `Result ${index + 1}:\nTitle: ${result.title}\nContent: ${result.content}\nURL: ${result.url}\n`
          ).join('\n---\n');
          console.log(`Found ${searchData.results.length} search results`);
        } else {
          console.warn("No search results found, trying broader search...");
          
          // Try a second search with just the first part of the name
          const simpleName = input.name.split(' ')[0];
          const { data: retryData } = await supabase.functions.invoke('web-search', {
            body: { 
              query: simpleName,
              numResults: 10
            }
          });
          
          if (retryData?.results && retryData.results.length > 0) {
            searchResults = retryData.results.map((result: any, index: number) => 
              `Result ${index + 1}:\nTitle: ${result.title}\nContent: ${result.content}\nURL: ${result.url}\n`
            ).join('\n---\n');
            console.log(`Retry found ${retryData.results.length} search results`);
          }
        }
      } catch (searchErr) {
        console.error("Failed to perform web search:", searchErr);
      }
    }

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

Use bullet points, numbered lists, and concrete examples. Write directives like "You are", "Use", "Start with", "Keep responses", etc.

CRITICAL RULES:
- Never use hyphens or dashes in responses to sound natural and human
- Greetings must be casual with pleasantries first, do not jump to business unless customer initiates
- Keep all responses to one or two sentences unless customer specifically asks for more explanation
- Sound conversational and natural, not formal or robotic`;
      userPrompt = `Create an AI personality prompt for: ${input.description}

Use directive format throughout (You are, Use, Keep, etc.). Be specific and actionable. Ensure responses are brief, natural, and avoid hyphens.`;
    } else if (type === "search_human") {
      if (!searchResults || searchResults.trim().length === 0) {
        // Fallback to AI's built-in knowledge if no web results
        systemPrompt = `You are a research analyst. Try to recall any information you know about this person from your training data.

If you have information about them, provide details on:
- Professional background, current role, company
- Areas of expertise and specialization
- Communication style (formal, casual, technical, friendly)
- Notable achievements or contributions
- Public personality traits and characteristics
- Speech patterns, catchphrases, or distinctive language

If you don't have reliable information about this specific person, say: "I couldn't find detailed information about this person. They may have limited online presence or use different names/handles online."`;
        
        userPrompt = `Do you have any information about ${input.name}${input.context ? ` (${input.context})` : ''}? Provide whatever details you can recall, or indicate if you don't have reliable information about them.`;
      } else {
        systemPrompt = `You are a research analyst. Based on the web search results provided, extract and organize detailed information about this person.

Focus on:
- Professional background, current role, company
- Areas of expertise and specialization
- **Tone & Communication Style**: Analyze their exact tone (formal/casual/technical/friendly/professional/conversational/humorous). Provide specific examples of how they speak or write.
- **Favorite Words & Phrases**: Identify recurring words, catchphrases, signature expressions, and language patterns they frequently use. Quote specific examples.
- **Speech Patterns**: Document sentence structure preferences, use of questions, rhetorical devices, and distinctive linguistic habits.
- **Personality Traits**: Deep dive into personality characteristics, emotional expression, attitude, confidence level, empathy, humor style.
- Notable achievements or contributions
- Values, beliefs, or causes they support
- Industry reputation and how others describe them
- Content they create (writing style, video presence, etc.)
- Any distinctive behavioral traits or mannerisms
- How they start/end conversations or interactions

Provide comprehensive, factual information in clear bullet points with specific examples and quotes wherever possible. Only include information that is directly supported by the search results.`;
        
        userPrompt = `Based on these web search results about ${input.name}${input.context ? ` (${input.context})` : ''}, provide a detailed profile:

${searchResults}

Extract and organize all relevant information about who they are and how they communicate. Be thorough and specific.`;
      }
    } else if (type === "create_human_character") {
      systemPrompt = `Generate a directive AI personality prompt that captures this person's essence. Use "You are" format with NO introduction. Follow this structure:

# Identity & Purpose
# Voice & Persona
## Personality
## Tone & Communication Style
## Speech Characteristics
## Favorite Words & Phrases
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

**CRITICAL**: Deep-dive into their EXACT communication style:
- Document their precise TONE (formal/casual/technical/friendly/humorous/etc.) with specific examples
- List their FAVORITE WORDS, catchphrases, signature expressions, and recurring language patterns
- Capture their SPEECH PATTERNS: sentence structure, question usage, rhetorical style
- Detail PERSONALITY traits: confidence level, emotional expression, humor style, empathy
- Include their distinctive mannerisms, conversation starters, and closing phrases

Use directive commands like "You are", "Use phrases like", "Start conversations with", "Your tone is".

CRITICAL RULES:
- Never use hyphens or dashes in responses to sound natural and human
- Greetings must be casual with pleasantries first, do not jump to business unless customer initiates
- Keep all responses to one or two sentences unless customer specifically asks for more explanation
- Sound conversational and natural, matching this person's authentic style
- Incorporate their exact favorite words and phrases throughout responses`;
      userPrompt = `Based on: ${input.info}

Create a directive personality prompt capturing their exact essence, speech patterns, and style. Use "You are" format throughout. Ensure responses are brief, natural, and avoid hyphens.`;
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

CRITICAL: Center EVERYTHING around the task and business context. Make it specific and actionable.

CRITICAL RULES:
- Never use hyphens or dashes in responses to sound natural and human
- Greetings must be casual with pleasantries first, do not jump to business unless customer initiates
- Keep all responses to one or two sentences unless customer specifically asks for more explanation
- Sound conversational and natural, not formal or robotic`;
      userPrompt = `${input.basePersonality ? `Base style to adapt:\n${input.basePersonality}\n\n` : ''}Task: ${input.task}
Business: ${input.businessInfo}
${input.link ? `Link: ${input.link}\n` : ''}
Create a directive personality prompt centered on this task and business. Use "You are" format with specific, actionable directives. Ensure responses are brief, natural, and avoid hyphens.`;
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
