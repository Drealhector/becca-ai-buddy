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
        systemPrompt = `You are an expert personality analyst. Based on web search results from interviews, blogs, videos, and social media, create a COMPREHENSIVE personality profile.

**STRUCTURE YOUR RESPONSE:**

**START WITH REAL IDENTITY:**
- Full name, current role, company/organization
- Age (if available), location, background
- Brief professional context (1-2 sentences only)

**THEN ANALYZE THESE DIMENSIONS IN DETAIL:**

**1. COMMUNICATION STYLE (40% of analysis)**
   a) **Tone & Voice Quality:**
      - Emotional coloring: warm, cold, sarcastic, excited, calm
      - Pitch, cadence, speed patterns
      - Volume and intensity variations
   
   b) **Speech Patterns & Rhythm:**
      - Sentence construction: short vs long, formal vs informal
      - Pauses, filler words ("uh", "you know", "like", "so", "basically", "actually")
      - Stutters, smooth flow, or emphasis patterns
      - Use of repetition for effect
   
   c) **Favorite Words & Signature Phrases (CRITICAL):**
      - Personal expressions they use repeatedly (QUOTE THEM EXACTLY)
      - Cultural/regional slang or dialect
      - Signature greetings or sign-offs
      - Recurring metaphors or analogies
      - **EXCLUDE work jargon** - focus on conversational vocabulary
   
   d) **Word Choice & Vocabulary:**
      - Complexity level: casual, technical, poetic
      - Preference for certain synonyms
      - Cultural or regional language nuances

**2. EMOTIONAL EXPRESSION (15% of analysis)**
   - Baseline mood/affect: cheerful, serious, calm, anxious, energetic
   - Emotional reactivity: how strongly they react
   - Empathy & social sensitivity: how they respond to others' emotions
   - How they express excitement, frustration, joy, concern

**3. COGNITIVE & THOUGHT STYLE (10% of analysis)**
   - Decision-making patterns: analytical vs intuitive, fast vs reflective
   - Problem-solving approach: step-by-step, experimental, improvisational
   - Worldview: optimistic, pessimistic, skeptical, idealistic
   - Values and beliefs influencing responses

**4. HABITS & BEHAVIORAL PATTERNS (10% of analysis)**
   - Routine behaviors in communication
   - Idiosyncrasies/quirks (e.g., always starting with "So...")
   - Response timing: quick, thoughtful, hesitant
   - Unique ways of expressing or reacting

**5. SOCIAL STYLE & INTERACTION (10% of analysis)**
   - Extroversion/introversion in conversations
   - Assertiveness and confidence level
   - Humor style: witty, sarcastic, playful, self-deprecating
   - How they engage: ask questions, tell stories, give advice
   - How they handle disagreement or criticism

**6. PERSONALITY TRAITS (10% of analysis)**
   - Openness: curious, imaginative, creative
   - Conscientiousness: organized, dependable
   - Extraversion: sociable, energetic, assertive
   - Agreeableness: friendly, cooperative, empathetic
   - Emotional stability: calm vs reactive

**7. CULTURAL & CONTEXTUAL NUANCE (5% of analysis)**
   - Regional accent, dialect, or slang
   - Cultural references and social norms
   - Context-appropriate humor or politeness

**CRITICAL RULES:**
- Extract quotes and specific examples for EVERY trait
- Focus on NATURAL conversational personality, NOT professional vocabulary
- Emphasize how they talk to friends, not colleagues
- Capture their authentic voice across all contexts (personal, casual, informal)
- Identify patterns across multiple sources (interviews, videos, social media)`;
        
        userPrompt = `Based on these web search results from interviews, blogs, videos, and social media about ${input.name}${input.context ? ` (${input.context})` : ''}, create a comprehensive PERSONALITY profile:

${searchResults}

**START YOUR RESPONSE WITH:**
1. Person's full real name, current role, company
2. Age (if available), location, background
3. Brief professional context (1-2 sentences maximum)

**THEN PROVIDE DETAILED ANALYSIS OF:**
- Communication style: tone, speech patterns, favorite words/phrases (quote them exactly)
- Emotional expression: baseline mood, reactivity, empathy
- Cognitive & thought style: decision-making, problem-solving, worldview
- Habits & behavioral patterns: quirks, timing, unique expressions
- Social style: extroversion, assertiveness, humor, engagement patterns
- Personality traits: openness, conscientiousness, emotional stability
- Cultural nuances: regional language, slang, references

**CRITICAL:**
- Quote exact phrases and words they use repeatedly
- Focus on NATURAL conversational personality, NOT work vocabulary
- Capture how they talk in casual settings, not business contexts
- Extract authentic personality applicable to ANY conversation scenario`;
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
