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

    // If searching for a human, do multiple targeted searches for personality
    if (type === "search_human") {
      console.log(`Performing personality-focused web searches for: ${input.name}`);
      
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      try {
        const allResults: any[] = [];
        
        // Search 1: Interview and talk content
        console.log("Search 1: Interviews and talks");
        const { data: interviewData } = await supabase.functions.invoke('web-search', {
          body: { 
            query: `${input.name} interview talks speaking style quotes`,
            numResults: 5
          }
        });
        if (interviewData?.results) allResults.push(...interviewData.results);

        // Search 2: Blog posts and written content
        console.log("Search 2: Blog posts and articles");
        const { data: blogData } = await supabase.functions.invoke('web-search', {
          body: { 
            query: `${input.name} blog posts articles writing style personality`,
            numResults: 5
          }
        });
        if (blogData?.results) allResults.push(...blogData.results);

        // Search 3: Video content and YouTube
        console.log("Search 3: Video content");
        const { data: videoData } = await supabase.functions.invoke('web-search', {
          body: { 
            query: `${input.name} youtube video podcast communication style`,
            numResults: 5
          }
        });
        if (videoData?.results) allResults.push(...videoData.results);

        // Search 4: Social media presence
        console.log("Search 4: Social media");
        const { data: socialData } = await supabase.functions.invoke('web-search', {
          body: { 
            query: `${input.name} twitter linkedin instagram social media personality traits`,
            numResults: 5
          }
        });
        if (socialData?.results) allResults.push(...socialData.results);

        // Search 5: General personality and characteristics
        console.log("Search 5: Personality traits");
        const { data: personalityData } = await supabase.functions.invoke('web-search', {
          body: { 
            query: `${input.name} personality characteristics how they talk mannerisms ${input.context || ''}`.trim(),
            numResults: 5
          }
        });
        if (personalityData?.results) allResults.push(...personalityData.results);

        if (allResults.length > 0) {
          searchResults = allResults.map((result: any, index: number) => 
            `Result ${index + 1}:\nTitle: ${result.title}\nContent: ${result.content}\nURL: ${result.url}\n`
          ).join('\n---\n');
          console.log(`Found total of ${allResults.length} personality-focused search results`);
        } else {
          console.warn("No personality data found in searches");
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
        systemPrompt = `You are a personality analyst specializing in extracting authentic communication patterns. Based on the web search results from interviews, blog posts, videos, and social media, create a DEEP personality profile.

**PRIMARY FOCUS - Conversational Personality (NOT Professional Jargon):**

1. **NATURAL SPEAKING STYLE** (70% of analysis):
   - How they actually talk in casual conversations, not business speak
   - Personal catchphrases and expressions they use repeatedly (quote them exactly)
   - Filler words, interjections, conversational tics (e.g., "you know", "right?", "basically", "actually")
   - Sentence structure: Do they use short punchy sentences? Long flowing ones? Questions?
   - Humor style: Sarcastic? Witty? Dad jokes? Self-deprecating?
   - Emotional expression: How do they show excitement, frustration, empathy?

2. **FAVORITE PERSONAL WORDS & PHRASES** (NOT work vocabulary):
   - Words/phrases they use in everyday conversation (not technical terms)
   - Their unique way of expressing common emotions
   - Signature greetings or sign-offs
   - Recurring metaphors or analogies from their personal life

3. **PERSONALITY TRAITS**:
   - Confidence level and how it shows in communication
   - Energy level (calm/energetic/intense/laid-back)
   - Empathy and emotional intelligence markers
   - Attitude toward people (warm/professional/direct/playful)

4. **COMMUNICATION PATTERNS**:
   - How they start conversations (formal greeting vs casual)
   - How they engage (ask questions? tell stories? give advice?)
   - How they handle disagreement or criticism
   - How they end conversations

5. **Background Context** (20% of analysis):
   - Brief professional background (only for context)
   - Values and beliefs that shape their communication

**CRITICAL**: Extract NATURAL conversational personality, not professional vocabulary or industry jargon. Focus on how they'd talk to a friend, not a colleague.

Provide specific quotes and examples from the search results for every trait you identify.`;
        
        userPrompt = `Based on these web search results from interviews, blogs, videos, and social media about ${input.name}${input.context ? ` (${input.context})` : ''}, create a comprehensive PERSONALITY profile:

${searchResults}

Focus on extracting their NATURAL conversational style and personality:
- How do they actually talk in casual settings?
- What personal phrases/words do they use repeatedly? (Quote them)
- What's their humor style and emotional expression?
- How do they start/engage/end conversations?
- What makes their communication style unique?

Ignore professional jargon and work vocabulary. Focus on their authentic personality that would show in ANY conversation, regardless of business context.`;
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
