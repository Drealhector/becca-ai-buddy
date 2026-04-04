import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * AI TOOLS — Convex actions replacing Supabase edge functions
 * Each calls OpenAI/external APIs and returns results
 */

// Generate AI character personality
export const createCharacter = action({
  args: {
    action_type: v.string(), // "generate_new" | "refine"
    description: v.optional(v.string()),
    personality: v.optional(v.string()),
    business_context: v.optional(v.string()),
    refinement: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("OPENAI_API_KEY not set");

    let prompt = "";
    if (args.action_type === "generate_new") {
      prompt = `Create a detailed AI assistant personality based on this description: "${args.description}".
Include: name, personality traits, communication style, tone, and how they should interact with customers.
${args.business_context ? `Business context: ${args.business_context}` : ""}
Write it as a system prompt that an AI assistant would use.`;
    } else if (args.action_type === "refine") {
      prompt = `Refine this AI personality: "${args.personality}"
Based on this feedback: "${args.refinement}"
${args.business_context ? `Business context: ${args.business_context}` : ""}
Return the improved personality prompt.`;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    return { personality: data.choices?.[0]?.message?.content || "" };
  },
});

// Analyze conversations or transcripts
export const analyzeData = action({
  args: {
    messages: v.string(), // stringified message data
    question: v.string(),
    conversationHistory: v.optional(v.array(v.object({
      role: v.string(),
      content: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("OPENAI_API_KEY not set");

    const systemPrompt = `You are an AI analytics assistant. You analyze customer conversations and call transcripts to provide business insights.
Given the following data, answer the user's question with specific insights, patterns, and actionable recommendations.
Be concise and structured. Use bullet points.

DATA:
${args.messages}`;

    const messages: any[] = [{ role: "system", content: systemPrompt }];
    if (args.conversationHistory) {
      messages.push(...args.conversationHistory);
    }
    messages.push({ role: "user", content: args.question });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    return { analysis: data.choices?.[0]?.message?.content || "No analysis available." };
  },
});
