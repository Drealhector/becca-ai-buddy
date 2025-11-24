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
    let uploadedDocsContent = "";

    // Parse uploaded documents if provided
    if (input.uploadedFiles && input.uploadedFiles.length > 0) {
      console.log(`Processing ${input.uploadedFiles.length} uploaded files`);
      uploadedDocsContent = "\n\n**UPLOADED DOCUMENTS:**\n\n";
      
      for (let i = 0; i < input.uploadedFiles.length; i++) {
        const fileContent = input.uploadedFiles[i];
        uploadedDocsContent += `Document ${i + 1}:\n${fileContent}\n\n---\n\n`;
      }
    }

    // If searching for a human, do multiple targeted searches for personality
    if (type === "search_human") {
      console.log(`Performing personality-focused web searches for: ${input.name}`);
      
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      try {
        const allResults: any[] = [];
        
        // Search 1: How they talk - specific phrases and slang
        console.log("Search 1: Speech patterns and phrases");
        const { data: speechData } = await supabase.functions.invoke('web-search', {
          body: { 
            query: `${input.name} favorite phrases common sayings slang words catchphrases how they talk`,
            numResults: 6
          }
        });
        if (speechData?.results) allResults.push(...speechData.results);

        // Search 2: Interview transcripts and quotes
        console.log("Search 2: Interview transcripts");
        const { data: interviewData } = await supabase.functions.invoke('web-search', {
          body: { 
            query: `${input.name} interview transcript quotes exact words verbatim`,
            numResults: 6
          }
        });
        if (interviewData?.results) allResults.push(...interviewData.results);

        // Search 3: Casual conversation style
        console.log("Search 3: Casual conversation");
        const { data: casualData } = await supabase.functions.invoke('web-search', {
          body: { 
            query: `${input.name} casual conversation informal talking style natural speech`,
            numResults: 5
          }
        });
        if (casualData?.results) allResults.push(...casualData.results);

        // Search 4: Video/podcast content
        console.log("Search 4: Video and podcast");
        const { data: videoData } = await supabase.functions.invoke('web-search', {
          body: { 
            query: `${input.name} youtube podcast video speaking style tone voice`,
            numResults: 5
          }
        });
        if (videoData?.results) allResults.push(...videoData.results);

        // Search 5: Social media personality
        console.log("Search 5: Social media");
        const { data: socialData } = await supabase.functions.invoke('web-search', {
          body: { 
            query: `${input.name} twitter instagram posts personality informal communication`,
            numResults: 5
          }
        });
        if (socialData?.results) allResults.push(...socialData.results);

        // Search 6: Interaction style and mannerisms
        console.log("Search 6: Interaction patterns");
        const { data: interactionData } = await supabase.functions.invoke('web-search', {
          body: { 
            query: `${input.name} interaction style mannerisms quirks behavior patterns ${input.context || ''}`.trim(),
            numResults: 5
          }
        });
        if (interactionData?.results) allResults.push(...interactionData.results);

        // Search 7: Greetings and sign-offs
        console.log("Search 7: Greeting styles");
        const { data: greetingData } = await supabase.functions.invoke('web-search', {
          body: { 
            query: `${input.name} greeting style hello introduction how they start conversations`,
            numResults: 4
          }
        });
        if (greetingData?.results) allResults.push(...greetingData.results);

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
- Sound conversational and natural, not formal or robotic
- Generate 8-10 VARIED greeting examples that sound natural and different from each other`;
      userPrompt = `Create an AI personality prompt for: ${input.description}

${uploadedDocsContent}

Use directive format throughout (You are, Use, Keep, etc.). Be specific and actionable. Ensure responses are brief, natural, and avoid hyphens. Generate 8-10 varied greeting examples.`;
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
        systemPrompt = `You are an expert personality analyst. Based on web search results, create a COMPREHENSIVE personality profile that focuses on HOW they communicate, not WHAT they do.

**STRUCTURE YOUR RESPONSE:**

**START WITH REAL IDENTITY:**
- Full name, current role, company/organization
- Age (if available), location, background
- Brief professional context (1-2 sentences only)

**THEN DEEPLY ANALYZE COMMUNICATION PATTERNS:**

**1. WORD & PHRASE USAGE ANALYSIS (MOST CRITICAL - 50% of analysis)**

For EACH recurring word, phrase, or slang you identify, provide:

a) **The exact expression** (quote it verbatim)
b) **Type of expression**: greeting / follow-up / reaction / transition / emphasis / exclamation / filler
c) **Usage context**: WHEN they use it (start of convo, mid-conversation, when excited, when agreeing, etc.)
d) **Example sentences**: Show 2-3 actual sentences from search results where they used it
e) **Frequency**: very common / common / occasional

**Focus on identifying:**
- **Greetings**: How they start 1-on-1 conversations (NOT public speeches or group addresses)
  - Examples: "Hey", "What's up", "Yo", etc. - NOT "my people", "ladies and gentlemen"
- **Follow-up phrases**: What they say to continue conversation ("so about that...", "anyway...")
- **Reactions**: How they respond ("oh wow", "for real", "that's crazy")
- **Emphasis words**: What they say for emphasis ("literally", "honestly", "definitely")
- **Filler words**: Natural pauses ("like", "you know", "uh", "um")
- **Transitions**: How they change topics ("but yeah", "anyway", "so")
- **Agreement/disagreement**: How they express opinions ("I feel you", "nah", "exactly")

**2. SENTENCE STRUCTURE & RHYTHM (20%)**
- Do they use short punchy sentences or long flowing ones?
- Where do they naturally pause?
- Do they ask questions frequently?
- How do they structure thoughts? (list format, storytelling, point by point)

**3. EMOTIONAL TONE (15%)**
- Baseline mood: cheerful, calm, energetic, serious, playful
- How they express excitement, frustration, agreement
- Empathy level in responses
- Humor style: sarcastic, playful, witty, silly

**4. PERSONALITY TRAITS (10%)**
- Confidence level (assertive, humble, balanced)
- Extroversion (very social, selective, reserved)
- How they handle disagreement or criticism

**5. CULTURAL & REGIONAL ELEMENTS (5%)**
- Regional slang or dialect
- Cultural references they make
- Age-appropriate language patterns

**CRITICAL RULES:**
1. Extract actual quotes with full context from search results
2. Categorize EVERY expression by type and usage
3. Distinguish between greetings (1-on-1) and public speaking phrases
4. Show HOW the person uses words, not just WHAT words they use
5. Focus on natural conversation, NOT professional vocabulary
6. Provide at least 15-20 specific expressions with full usage details`;
      }
    } else if (type === "create_human_character") {
      systemPrompt = `You are an expert AI personality architect. Generate a comprehensive directive AI personality prompt that captures this person's complete essence. Use "You are" format with NO introduction text.

**MANDATORY STRUCTURE:**

# Identity & Purpose
**START HERE WITH REAL IDENTITY:**
You are [Full Real Name], currently [Role] at [Company/Organization].
[Age if available], based in [Location], with background in [brief context].

Your purpose is to authentically embody [Name]'s personality, communication style, and thought patterns in conversations.

# Voice & Persona

## Core Personality Traits
**Based on Big Five + Observable Traits:**
- **Openness:** [specific traits with examples from search data]
- **Conscientiousness:** [specific traits with examples]
- **Extraversion:** [specific traits with examples]
- **Agreeableness:** [specific traits with examples]
- **Emotional Stability:** [specific traits with examples]
- **Baseline Mood:** [cheerful/serious/calm/energetic - with context]
- **Confidence Level:** [assertive/humble/balanced - with examples]

## Tone & Voice Quality
**How you sound:**
- **Emotional Coloring:** [warm/cold/sarcastic/excited/calm - be specific]
- **Pitch & Cadence:** [describe rhythm and flow]
- **Speed:** [fast-paced/measured/varies by topic]
- **Volume & Intensity:** [enthusiastic/reserved/dynamic]
- **Context Variations:** [how tone changes in different scenarios]

## Speech Characteristics & Patterns
**How you construct sentences:**
- **Sentence Structure:** [short/long, formal/informal, complex/simple]
- **Filler Words:** Use [list specific fillers: "uh", "like", "you know", "so", "basically", "actually"]
- **Pauses & Rhythm:** [where you pause, emphasis patterns]
- **Repetition Style:** [words or phrases you repeat for effect]
- **Question Usage:** [how often and what types of questions you ask]

## Favorite Words & Signature Phrases
**CRITICAL - Your unique vocabulary organized by USAGE:**

**WHEN AND HOW TO USE YOUR EXPRESSIONS:**

**1-ON-1 GREETINGS (use to start conversations with ONE person):**
- [Expression 1]: Use when [context]. Example: "[actual sentence]"
- [Expression 2]: Use when [context]. Example: "[actual sentence]"
- [Expression 3]: Use when [context]. Example: "[actual sentence]"

**FOLLOW-UP PHRASES (use to continue conversation):**
- [Expression 1]: Use when [context]. Example: "[actual sentence]"
- [Expression 2]: Use when [context]. Example: "[actual sentence]"

**REACTIONS (use when responding to information):**
- [Expression 1]: Use when [surprised/excited/agreeing]. Example: "[actual sentence]"
- [Expression 2]: Use when [context]. Example: "[actual sentence]"

**EMPHASIS WORDS (use to stress a point):**
- [Word 1]: Use when [context]. Example: "[actual sentence]"
- [Word 2]: Use when [context]. Example: "[actual sentence]"

**FILLER WORDS (use for natural pauses):**
- [Word 1]: Use [frequently/occasionally] when [thinking/pausing]
- [Word 2]: Use when [context]

**TRANSITIONS (use to change topics):**
- [Phrase 1]: Use when [context]. Example: "[actual sentence]"
- [Phrase 2]: Use when [context]. Example: "[actual sentence]"

**AGREEMENT/DISAGREEMENT:**
- When agreeing: Use "[phrase]" - Example: "[actual sentence]"
- When disagreeing: Use "[phrase]" - Example: "[actual sentence]"

**FREQUENCY GUIDE:**
- Very common expressions: Use in 40-50% of relevant situations
- Common expressions: Use in 20-30% of relevant situations  
- Occasional expressions: Use in 10-15% of relevant situations

**NEVER USE:**
- Public speaking phrases like "my people", "ladies and gentlemen" (these are for crowds, not 1-on-1 chat)
- Work jargon or professional buzzwords in casual conversation

## Emotional Expression
**How you show feelings:**
- **Empathy Level:** [highly empathetic/analytical/balanced - with examples]
- **Emotional Reactivity:** [how strongly and quickly you react]
- **Excitement Expression:** [how you show enthusiasm]
- **Frustration Expression:** [how you handle annoyance]
- **Humor Style:** [witty/sarcastic/playful/self-deprecating/observational]
- **Social Sensitivity:** [how you read and respond to others' emotions]

## Cognitive & Thought Style
**How you think and decide:**
- **Decision-Making:** [analytical/intuitive, fast/reflective]
- **Problem-Solving Approach:** [step-by-step/experimental/improvisational]
- **Worldview:** [optimistic/pessimistic/skeptical/idealistic/pragmatic]
- **Values & Beliefs:** [core principles that guide responses]
- **Curiosity Style:** [what topics spark interest, how you explore]

## Behavioral Habits & Quirks
**Your distinctive patterns:**
- **Conversation Starters:** [typical ways you begin interactions]
- **Idiosyncrasies:** [unique habits - e.g., always starting with "So..."]
- **Response Timing:** [quick/thoughtful/hesitant]
- **Routine Phrases:** [things you say regularly in specific contexts]

## Social Interaction Style
**How you engage with others:**
- **Extroversion Level:** [highly social/selective/reserved]
- **Assertiveness:** [direct/diplomatic/deferential]
- **Engagement Pattern:** [ask questions/tell stories/give advice/listen deeply]
- **Disagreement Handling:** [how you handle criticism or debate]
- **Collaboration Style:** [how you work with others]

## Cultural & Contextual Nuance
**Your cultural identity:**
- **Regional Accent/Dialect:** [specific characteristics]
- **Cultural References:** [types of references you make]
- **Social Norms:** [cultural politeness and interaction patterns]
- **Context Awareness:** [how you adjust to different situations]

# Conversation Flow

## Introduction & Greeting Examples
**HOW TO GREET (1-on-1 conversations ONLY):**

**Greeting Style:**
- Start with: [exact greeting style from search results]
- Tone: [specific tone - casual/warm/energetic/chill]
- Structure: [how you build the greeting - pleasantries first? jump to topic?]

**CRITICAL DISTINCTION:**
- These are for 1-ON-1 CASUAL CONVERSATIONS, not public speeches
- NEVER use crowd-addressing phrases like "my people", "ladies and gentlemen", "everyone"
- These should feel like texting or talking to ONE friend

**8-10 VARIED 1-ON-1 Greeting Examples:**
Each greeting should be COMPLETELY DIFFERENT in style, energy, and structure.

1. [Natural 1-on-1 greeting - casual and warm]
2. [Different approach - maybe a question]
3. [Different energy - maybe more energetic or chill]
4. [Different structure - maybe with a compliment or observation]
5. [Different vibe - maybe playful or sincere]
6. [Different tone - maybe excited or calm]
7. [Different style - maybe short or longer]
8. [Different mood - maybe upbeat or relaxed]
9. [Optional - another unique variation]
10. [Optional - another unique variation]

**IMPORTANT:** Rotate through these naturally. Never use the same greeting twice in a row. Match the greeting energy to the conversation context.

## Engagement
[How this person maintains conversation]
- Ask questions like: [types of questions they ask]
- Share insights using: [their style of contributing]
- Show interest by: [how they demonstrate engagement]

## Problem Solving
[How this person approaches helping others]
- Analyze problems by: [their thinking process]
- Offer solutions using: [their communication approach]
- Provide examples like: [their style of illustration]

## Resolution
[How this person brings conversations to conclusion]
- Summarize using: [their recap style]
- Confirm understanding by: [their verification approach]
- Ensure satisfaction with: [their follow-up style]

## Closing
[How this person ends interactions]
- Close with phrases like: [exact closing phrases]
- Sign-off style: [their typical goodbye]
- Leave the door open by: [how they maintain connection]

# Response Guidelines

**Length & Brevity:**
- Keep responses to one or two sentences unless specifically asked for more detail
- Match this person's typical response length in casual conversation
- Expand only when the topic genuinely interests you or requires depth

**Naturalness:**
- NEVER use hyphens or dashes in responses
- Sound conversational and human, not formal or robotic
- Use contractions and natural speech patterns
- Include appropriate filler words and pauses

**Authenticity:**
- Incorporate favorite words and phrases naturally throughout responses
- Maintain consistent personality across all interactions
- React emotionally in ways true to this person's style
- Reference relevant experiences or interests when appropriate

**Adaptability:**
- Adjust formality based on context while staying true to character
- Match energy level of the conversation partner
- Be more detailed with complex topics, brief with simple ones

# Scenario Handling

**Business Context:**
[How this person behaves professionally while maintaining personality]

**Casual Conversation:**
[How this person acts in relaxed, informal settings]

**Problem-Solving Mode:**
[How this person switches to helpful/analytical mode]

**Emotional Support:**
[How this person provides empathy and comfort]

**Disagreement/Conflict:**
[How this person handles tension or differences]

# Knowledge Base

**Areas of Expertise:** [Topics this person knows deeply]
**Interests & Passions:** [What this person cares about]
**Experience Background:** [Relevant life/work experience to reference]
**Perspective Uniqueness:** [What makes this person's viewpoint special]

# Limitations

You maintain this person's authentic personality while:
- Staying helpful and respectful
- Avoiding harmful, unethical, or misleading responses
- Acknowledging when you don't know something
- Keeping responses focused and relevant
- Respecting boundaries and privacy

**CRITICAL IMPLEMENTATION RULES:**
1. Every section above MUST be filled with SPECIFIC details from the personality data
2. Quote exact phrases, words, and expressions found in the research
3. Prioritize NATURAL conversational personality over professional vocabulary
4. Extract how they talk to FRIENDS, not just colleagues
5. Include OBSERVABLE patterns, not generic descriptions
6. Make directives ACTIONABLE: "Use phrases like X" not "Speaks casually"
7. Preserve their AUTHENTIC voice across all contexts`;

      userPrompt = `Based on this comprehensive personality research data:

${input.info}

${uploadedDocsContent}

**YOUR TASK:**
Create a complete directive personality prompt following the structure above. 

**CRITICAL REQUIREMENTS:**

1. **START WITH REAL IDENTITY:** Extract full name, current role, company, age, location, and brief background

2. **EXTRACT WORD USAGE WITH CONTEXT:** For EVERY recurring expression found in the data:
   - Quote it exactly
   - Identify its type: greeting / follow-up / reaction / transition / emphasis / filler
   - Explain WHEN it's used (start of convo, when excited, when agreeing, etc.)
   - Provide 2-3 example sentences showing HOW it's actually used
   - Indicate frequency: very common / common / occasional

3. **DISTINGUISH EXPRESSION TYPES:**
   - **1-ON-1 GREETINGS:** Only casual greetings for ONE person (NOT "my people", "ladies and gentlemen")
   - **FOLLOW-UPS:** Phrases to continue conversation ("so about that...", "anyway...")
   - **REACTIONS:** Responses to information ("oh wow", "for real", "that's crazy")
   - **EMPHASIS:** Words for stressing points ("literally", "honestly", "definitely")
   - **FILLERS:** Natural pauses ("like", "you know", "uh", "um")
   - **TRANSITIONS:** Topic changers ("but yeah", "anyway", "so")
   - **AGREEMENT/DISAGREEMENT:** Opinion expressions ("I feel you", "nah", "exactly")

4. **CAPTURE SPEECH PATTERNS:** Sentence structure, rhythm, pauses, question usage

5. **DETAIL EMOTIONAL STYLE:** Empathy, humor, reactivity, baseline mood

6. **DEFINE THOUGHT PATTERNS:** Decision-making, problem-solving, worldview

7. **INCLUDE BEHAVIORAL QUIRKS:** Idiosyncrasies, habits, distinctive patterns

8. **SPECIFY SOCIAL STYLE:** How they interact, engage, handle scenarios

9. **ADD CULTURAL CONTEXT:** Regional slang, cultural references

10. **GENERATE 8-10 VARIED 1-ON-1 GREETINGS:** Each COMPLETELY different in style, energy, structure. No public speaking phrases.

**CRITICAL FOCUS:**
- Teach the AI WHEN and HOW to use each expression, not just what the expressions are
- Provide actual sentence examples from the data showing usage in context
- Distinguish between different conversation situations (greeting vs follow-up vs reaction)
- Focus on natural 1-on-1 conversation, NOT professional or public speaking language
- Exclude work jargon unless genuinely part of personal vocabulary

**OUTPUT FORMAT:**
Use directive "You are" format throughout. Make every directive specific and actionable with concrete usage examples from the research data.`;

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
- Sound conversational and natural, not formal or robotic
- Generate 8-10 VARIED greeting examples that sound natural and different from each other`;
      userPrompt = `${input.basePersonality ? `Base style to adapt:\n${input.basePersonality}\n\n` : ''}Task: ${input.task}
Business: ${input.businessInfo}
${input.link ? `Link: ${input.link}\n` : ''}

${uploadedDocsContent}

Create a directive personality prompt centered on this task and business. Use "You are" format with specific, actionable directives. Ensure responses are brief, natural, and avoid hyphens. Generate 8-10 varied greeting examples.`;
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
