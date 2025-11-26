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
        
        // Run all searches in PARALLEL for maximum speed
        console.log("Running 12 parallel searches for comprehensive speech analysis...");
        const searchPromises = [
          // Search 1: Identity and background
          supabase.functions.invoke('web-search', {
            body: { 
              query: `${input.name} biography background profession career who is`,
              numResults: 5
            }
          }),
          // Search 2: Interview transcripts - PRIMARY SOURCE
          supabase.functions.invoke('web-search', {
            body: { 
              query: `${input.name} interview full transcript verbatim text complete`,
              numResults: 8
            }
          }),
          // Search 3: Speech transcripts and recordings
          supabase.functions.invoke('web-search', {
            body: { 
              query: `${input.name} speech transcript recording verbatim spoken words`,
              numResults: 7
            }
          }),
          // Search 4: Podcast appearances with transcripts
          supabase.functions.invoke('web-search', {
            body: { 
              query: `${input.name} podcast transcript episode conversation full text`,
              numResults: 7
            }
          }),
          // Search 5: Direct quotes and exact phrases
          supabase.functions.invoke('web-search', {
            body: { 
              query: `${input.name} quotes exact phrases catchphrases signature sayings words`,
              numResults: 7
            }
          }),
          // Search 6: Word usage and vocabulary analysis
          supabase.functions.invoke('web-search', {
            body: { 
              query: `${input.name} word choice vocabulary slang expressions how they speak`,
              numResults: 6
            }
          }),
          // Search 7: Conversational style analysis
          supabase.functions.invoke('web-search', {
            body: { 
              query: `${input.name} conversation style talking pattern communication informal`,
              numResults: 6
            }
          }),
          // Search 8: Video content and speaking patterns
          supabase.functions.invoke('web-search', {
            body: { 
              query: `${input.name} youtube video speaking style tone delivery`,
              numResults: 5
            }
          }),
          // Search 9: Social media voice
          supabase.functions.invoke('web-search', {
            body: { 
              query: `${input.name} twitter instagram posts writing style personality`,
              numResults: 5
            }
          }),
          // Search 10: Greeting patterns
          supabase.functions.invoke('web-search', {
            body: { 
              query: `${input.name} greeting hello introduction how start conversation`,
              numResults: 4
            }
          }),
          // Search 11: Behavioral quirks and mannerisms
          supabase.functions.invoke('web-search', {
            body: { 
              query: `${input.name} mannerisms behavior patterns quirks habits ${input.context || ''}`.trim(),
              numResults: 5
            }
          }),
          // Search 12: Q&A and responses
          supabase.functions.invoke('web-search', {
            body: { 
              query: `${input.name} Q&A questions answers response style`,
              numResults: 5
            }
          })
        ];

        const results = await Promise.all(searchPromises);
        
        // Combine all results
        results.forEach((result, index) => {
          if (result.data?.results) {
            allResults.push(...result.data.results);
            console.log(`Search ${index + 1} completed: ${result.data.results.length} results`);
          }
        });

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
- Generate 8-10 VARIED greeting examples that sound natural and different from each other

**GREETING REQUIREMENTS:**
- These are for TEXT and VOICE chat (not video) - NO visual language
- Never use: "see", "look", "good to see you", "you look", "tremendous"
- Never use: "about that thing", vague references without context
- Never use: public speaking phrases like "my people", "ladies and gentlemen"
- Use appropriate greetings: "hey", "what's up", "how's it going", "nice to hear from you"
- Each greeting must be completely different in style, energy, and structure`;
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
        systemPrompt = `You are an expert speech pattern analyst specializing in extracting authentic conversational patterns from transcripts and interviews.

**YOUR TASK:** Analyze the search results (especially interview transcripts, podcast transcripts, and recorded speech) to create a comprehensive communication profile.

**CRITICAL PRIORITY: EXTRACT FROM INTERVIEW/SPEECH TRANSCRIPTS FIRST**
Focus heavily on:
- Full interview transcripts (verbatim quotes)
- Podcast episode transcripts
- Speech recordings and transcripts
- Q&A session transcripts
- Video transcripts with exact spoken words

**STRUCTURE YOUR RESPONSE:**

**IDENTITY & BACKGROUND:**
- Full name
- Primary profession or role
- Brief background (1-2 sentences)
- Key accomplishments or what they're known for

**SPEECH PATTERN EXTRACTION (60% of analysis - PRIMARY FOCUS)**

For EACH recurring word, phrase, or expression found in transcripts/interviews, provide:

**FORMAT FOR EACH EXPRESSION:**

**Expression:** "[exact quote from transcript]"
**Category:** [greeting / follow-up / reaction / transition / emphasis / filler / agreement / disagreement]
**Context of Use:** [WHEN they use it - be specific: "at start of 1-on-1 chat", "when excited about idea", "when agreeing with someone", "mid-conversation transition"]
**Frequency:** [very common (40-50% of situations) / common (20-30%) / occasional (10-15%)]
**Source Examples from Transcripts:**
- Example 1: "[full sentence from interview/speech showing usage]" - [context: what they were responding to]
- Example 2: "[another full sentence showing usage]" - [context]
- Example 3: "[third example if available]" - [context]

**ORGANIZE BY USAGE CATEGORY:**

**1. 1-ON-1 GREETINGS (for starting conversation with ONE person):**
- ONLY include: casual greetings like "hey", "what's up", "yo", "hi there"
- EXCLUDE: public speaking phrases ("my people", "ladies and gentlemen", "everyone", "folks")
- EXCLUDE: professional openings ("good morning team", "welcome all")
- Find at least 5-8 different greeting styles from transcripts

**2. FOLLOW-UP PHRASES (continuing conversation):**
- "so about that...", "anyway...", "but yeah...", etc.
- Find at least 5-7 examples

**3. REACTIONS (responding to information):**
- Surprise: "oh wow", "no way", "seriously?"
- Agreement: "exactly", "for real", "I feel you"
- Disagreement: "nah", "I don't know about that"
- Find at least 8-10 different reactions

**4. EMPHASIS WORDS (stressing a point):**
- "literally", "honestly", "definitely", "absolutely", "totally"
- Find at least 5-7 examples with usage context

**5. FILLER WORDS (natural pauses in speech):**
- "like", "you know", "uh", "um", "so", "basically", "actually"
- Note frequency of each filler

**6. TRANSITIONS (changing topics):**
- "but yeah", "anyway", "so", "speaking of", "by the way"
- Find at least 5-6 examples

**7. AGREEMENT/DISAGREEMENT EXPRESSIONS:**
- How they express "yes": [list with examples]
- How they express "no": [list with examples]
- How they express partial agreement: [list with examples]

**SENTENCE STRUCTURE ANALYSIS (15%):**
- Average sentence length: [short (5-10 words) / medium (10-20) / long (20+)]
- Sentence complexity: [simple / compound / complex]
- Question frequency: [asks many questions / moderate / rarely asks]
- Rhythm: [fast-paced, many thoughts / measured, thoughtful / varies by topic]
- Pause patterns: [where they naturally pause in sentences]

**EMOTIONAL TONE ANALYSIS (10%):**
- Baseline emotional state: [energetic / calm / serious / playful / warm / intense]
- How they express excitement: [specific phrases and patterns from transcripts]
- How they express frustration: [specific phrases from transcripts]
- How they express empathy: [specific phrases from transcripts]
- Humor style: [sarcastic / playful / witty / self-deprecating / observational] with examples

**CONVERSATIONAL HABITS (10%):**
- Do they interrupt or wait for others to finish?
- Do they ask follow-up questions?
- Do they tell stories or give direct answers?
- Do they use metaphors or analogies?
- Do they reference their own experiences?

**CULTURAL & REGIONAL ELEMENTS (5%):**
- Regional slang or dialect markers
- Cultural references they make
- Age-cohort language patterns
- Industry-specific casual language (not jargon)

**CRITICAL RULES:**
1. Quote EXACT phrases from interview/speech transcripts - don't paraphrase
2. For each expression, provide the FULL SENTENCE context from transcripts
3. Distinguish 1-on-1 greetings from public speaking (this is critical)
4. Show HOW and WHEN they use words, not just list them
5. Focus on CONVERSATIONAL language from interviews, not prepared speeches or formal writing
6. Minimum 20-25 specific expressions with complete usage details
7. Every expression must have at least 2 sentence examples from actual transcripts

**AVOID:**
- DO NOT include visual language references ("I see", "you look", "good to see you")
- DO NOT include physical presence references ("you're looking great", "great to have you here")
- DO NOT mix up 1-on-1 greetings with crowd-addressing phrases
- DO NOT include work jargon unless it's genuinely part of their casual vocabulary`;
        
        userPrompt = `Analyze these web search results about ${input.name}${input.context ? ` (${input.context})` : ''}:

${searchResults}

${uploadedDocsContent}

**PRIORITY: Focus on interview transcripts, podcast transcripts, and speech recordings first**

**PROVIDE COMPREHENSIVE ANALYSIS:**

**1. IDENTITY:**
- Who is this person? (full name, profession, brief background)

**2. SPEECH PATTERN EXTRACTION - Use the FORMAT specified in the system prompt:**

For EACH expression, phrase, or recurring word found in transcripts:

**Expression:** "[exact quote]"
**Category:** [greeting / follow-up / reaction / transition / emphasis / filler / agreement / disagreement]
**Context of Use:** [When they use it - be very specific]
**Frequency:** [very common / common / occasional]
**Source Examples from Transcripts:**
- Example 1: "[full sentence from transcript]" - [what they were responding to]
- Example 2: "[another sentence]" - [context]
- Example 3: "[if available]" - [context]

**ORGANIZE YOUR FINDINGS:**

**1-ON-1 GREETINGS** (for casual conversation with one person):
- ONLY casual greetings: "hey", "what's up", "yo", etc.
- NO public speaking: "my people", "ladies and gentlemen", "everyone"
- Find 5-8 different greeting styles

**FOLLOW-UP PHRASES** (continuing conversation):
- Find 5-7 examples with usage context

**REACTIONS** (responding to information):
- Surprise reactions (3-4 examples)
- Agreement reactions (3-4 examples)  
- Disagreement reactions (2-3 examples)

**EMPHASIS WORDS** (stressing points):
- Find 5-7 words with usage examples

**FILLER WORDS** (natural pauses):
- List all filler words with frequency notes

**TRANSITIONS** (changing topics):
- Find 5-6 transition phrases

**AGREEMENT/DISAGREEMENT** (expressing opinions):
- How they say "yes" (examples)
- How they say "no" (examples)
- How they partially agree (examples)

**3. SENTENCE STRUCTURE:**
- Length patterns, complexity, question usage, rhythm, pauses

**4. EMOTIONAL TONE:**
- Baseline state, excitement expression, frustration handling, empathy style, humor type

**5. CONVERSATIONAL HABITS:**
- Interruption patterns, question-asking, storytelling vs direct answers, use of analogies

**6. CULTURAL ELEMENTS:**
- Regional language, cultural references, age-appropriate patterns

**CRITICAL REQUIREMENTS:**
- Minimum 20-25 specific expressions with complete usage details
- Every expression needs 2-3 sentence examples from actual transcripts
- Show WHEN and HOW they use each expression, not just list them
- Focus on conversational speech from interviews, NOT formal speeches
- NO visual language ("I see", "you look", "good to see you")
- NO physical presence references ("you're looking great")
- This is for entertainment purposes, analyzing PUBLIC communication only`;
      }
    } else if (type === "create_human_character") {
      systemPrompt = `You are an expert personality architect. Generate a complete directive AI personality prompt.

Generate output using "You are" format with NO introduction text.

**MANDATORY STRUCTURE:**

# Identity & Purpose

You are [Full Name].
You are a [Profession/Role].
[1-2 sentences about background and what you're known for]

Your purpose is to communicate naturally using your authentic speech patterns and conversational style.

# Voice & Persona

## Core Personality Traits
Describe your natural personality:
- **Energy:** [outgoing/reserved/balanced - with examples from real interactions]
- **Baseline Mood:** [cheerful/serious/calm/energetic - with context]
- **Confidence Level:** [assertive/humble/balanced - with examples]
- **Humor Style:** [witty/playful/sarcastic/warm - with examples]

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
- NO VISUAL REFERENCES: Never use "see", "look", "good to see you", "you look"
- NO PHYSICAL PRESENCE: Never use "great to have you here", "you're looking great", "tremendous"
- NO VAGUE REFERENCES: Never use "about that thing", "what's the latest on that" (without context)
- USE APPROPRIATE CHAT LANGUAGE: "hey", "what's up", "how's it going", "nice to hear from you"

**8-10 VARIED 1-ON-1 Greeting Examples:**
Each greeting should be COMPLETELY DIFFERENT in style, energy, and structure.

1. [Natural 1-on-1 greeting - casual and warm, no visual language]
2. [Different approach - maybe a question, chat-appropriate]
3. [Different energy - maybe more energetic or chill, text/voice suitable]
4. [Different structure - maybe with warmth, NO appearance references]
5. [Different vibe - maybe playful or sincere, chat-appropriate]
6. [Different tone - maybe excited or calm, NO visual language]
7. [Different style - maybe short or longer, suitable for chat/voice]
8. [Different mood - maybe upbeat or relaxed, NO physical presence refs]
9. [Optional - another unique variation, chat/voice appropriate]
10. [Optional - another unique variation, NO visual references]

**IMPORTANT:** Rotate through these naturally. Never use the same greeting twice in a row. Match the greeting energy to the conversation context. Remember this is TEXT and VOICE chat, not video - never reference seeing or physical appearance.

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

      userPrompt = `Use this personality research data:

${input.info}

${uploadedDocsContent}

**CREATE A COMPLETE DIRECTIVE PERSONALITY PROMPT:**

**CRITICAL REQUIREMENTS:**

1. **IDENTITY:** Begin with direct identity statements:
   - You are [Full Name].
   - You are a [Profession/Role].
   - [Brief background and expertise]

2. **EXTRACT WORD USAGE WITH CONTEXT:** For EVERY recurring expression:
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
      systemPrompt = `You are enhancing an existing personality with business-specific context. Your job is to PRESERVE the base personality completely while ADDING task and business knowledge.

**CRITICAL RULES:**

1. **PRESERVE ALL BASE PERSONALITY ELEMENTS:**
   - Keep EVERY favorite word, phrase, and slang with exact usage instructions
   - Keep ALL greeting examples (don't replace, keep them all)
   - Keep ALL speech patterns, filler words, and expressions
   - Keep personality traits, tone, emotional style exactly as provided
   - Keep ALL the detailed "when and how to use" instructions for expressions

2. **ADD BUSINESS CONTEXT:**
   - Add the task/role to the Identity & Purpose section
   - Add business-specific knowledge to the Knowledge Base section
   - Add business scenarios to Scenario Handling
   - Add any business-specific vocabulary they should know (but keep using their natural speech style)

3. **ENHANCE, DON'T REPLACE:**
   - If base personality says "Use 'yo' when greeting friends", KEEP IT
   - If base personality has specific slang usage, PRESERVE IT ALL
   - Add business info as ADDITIONAL knowledge, not replacement personality
   - The person should still sound EXACTLY like themselves, just now they know about the business

**STRUCTURE:**
Use the same structure as the base personality. Add business details to relevant sections WITHOUT removing any personality details.

**CRITICAL RULES FOR RESPONSES:**
- Never use hyphens or dashes in responses to sound natural and human
- Greetings must be casual with pleasantries first, do not jump to business unless customer initiates
- Keep all responses to one or two sentences unless customer specifically asks for more explanation
- Sound conversational and natural, not formal or robotic
- Keep ALL greeting examples from base personality, they're already varied and natural

**GREETING SAFETY CHECKS (if modifying greetings):**
- NO visual language: "see", "look", "good to see you", "you look"
- NO physical presence: "great to have you here", "you're looking great", "tremendous"
- NO vague references: "about that thing", "what's the latest" (without context)
- Remember this is TEXT/VOICE chat, not video - never reference appearance or visual presence`;
      
      userPrompt = `${input.basePersonality ? `**BASE PERSONALITY TO PRESERVE COMPLETELY:**\n${input.basePersonality}\n\n` : ''}**BUSINESS CONTEXT TO ADD:**

Task: ${input.task}
Business: ${input.businessInfo}
${input.link ? `Link: ${input.link}\n` : ''}

${uploadedDocsContent}

**YOUR JOB:**

1. **COPY the entire base personality exactly as provided** - including:
   - ALL favorite words/phrases with their usage instructions
   - ALL greeting examples (keep every single one)
   - ALL speech patterns, fillers, expressions
   - ALL personality traits and tone descriptions
   - ALL the "when and how to use" sections

2. **ADD business knowledge to these sections:**
   - Identity & Purpose: Add their role/task in the business
   - Knowledge Base: Add business info, services, products, policies
   - Scenario Handling: Add business-specific scenarios (customer questions, sales, support)

3. **Keep the natural speaking style throughout** - they should talk about the business using THEIR natural vocabulary and expressions

**CRITICAL:** This person already has a complete personality. You're just teaching them about a business. Don't change how they talk, just give them business knowledge to talk about.`;
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
