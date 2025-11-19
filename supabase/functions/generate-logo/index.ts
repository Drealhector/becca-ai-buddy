import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, action, businessInfo } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle prompt generation action
    if (action === 'generate_prompt') {
      console.log("Generating prompt from business info:", businessInfo);
      
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY is not configured');
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: `Based on this business information, create a detailed prompt for generating a circular logo. The prompt should describe the visual style, colors, symbols, and overall aesthetic that would represent this business well.

Business Information:
${businessInfo}

Generate a concise but detailed logo generation prompt (2-3 sentences). Focus on visual elements, style, and colors that would work well for a circular logo avatar.`
          }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error(`Failed to generate prompt: ${response.status}`);
      }

      const data = await response.json();
      const generatedPrompt = data.choices?.[0]?.message?.content;

      if (!generatedPrompt) {
        throw new Error("No prompt generated");
      }

      console.log("Generated prompt:", generatedPrompt);

      return new Response(JSON.stringify({ prompt: generatedPrompt }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle logo generation action
    if (!prompt) {
      throw new Error("Prompt is required for logo generation");
    }

    const logoPrompt = `Create a professional, modern circular logo. ${prompt}. The logo should be simple, clean, on a white or transparent background, suitable for web use as an avatar. Circular format, centered design.`;

    console.log("Generating logo with OpenAI, prompt:", logoPrompt);

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: logoPrompt,
        n: 1,
        size: "1024x1024",
        quality: "high",
        output_format: "png",
        background: "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const imageDataUrl = data.data?.[0]?.b64_json;

    if (!imageDataUrl) {
      throw new Error("No image generated");
    }

    console.log("Logo generated successfully with OpenAI");

    return new Response(JSON.stringify({ imageDataUrl: `data:image/png;base64,${imageDataUrl}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-logo function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
