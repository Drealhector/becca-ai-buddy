import { mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Generate upload URL for Convex file storage
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get public URL for a stored file
export const getFileUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

// Generate logo via AI and return the image URL
export const generateLogo = action({
  args: {
    prompt: v.string(),
    action_type: v.optional(v.string()),
    business_name: v.optional(v.string()),
    industry: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("OPENAI_API_KEY not set");

    if (args.action_type === "generate_prompt") {
      // Generate a logo prompt from business info
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: `Create a concise image generation prompt for a professional logo for "${args.business_name || "a business"}" in the ${args.industry || "general"} industry. The prompt should describe a clean, modern logo design. Keep it under 100 words.`,
          }],
          max_tokens: 200,
        }),
      });
      const data = await response.json();
      return { prompt: data.choices?.[0]?.message?.content || args.prompt };
    }

    // Generate the image
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: args.prompt,
        n: 1,
        size: "1024x1024",
        response_format: "url",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Image generation failed: ${err}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) throw new Error("No image generated");

    return { image_url: imageUrl };
  },
});

// Generate hub background
export const generateBackground = action({
  args: {
    prompt: v.string(),
    size: v.optional(v.string()),
  },
  handler: async (ctx, { prompt, size }) => {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("OPENAI_API_KEY not set");

    const imageSize = size === "phone" ? "1024x1792" : size === "tablet" ? "1024x1024" : "1792x1024";

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `Professional, modern background image: ${prompt}. Clean, subtle, suitable as a website background. No text.`,
        n: 1,
        size: imageSize,
        response_format: "url",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Background generation failed: ${err}`);
    }

    const data = await response.json();
    return { image_url: data.data?.[0]?.url || "" };
  },
});
