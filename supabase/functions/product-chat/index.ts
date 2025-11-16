import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, productId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Fetching product data for:", productId);

    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError) {
      console.error("Product fetch error:", productError);
      throw productError;
    }

    // Fetch product media
    const { data: mediaData } = await supabase
      .from("product_media")
      .select("*")
      .eq("product_id", productId);

    console.log("Product data:", product);
    console.log("Media data:", mediaData);

    // Build system prompt with product context
    let systemPrompt = `You are an expert sales assistant for ${product.name}.

PRODUCT DETAILS:
- Name: ${product.name}
- Description: ${product.description || "No description available"}
- Price: ${product.price ? `${product.currency || "USD"} ${product.price}` : "Contact for pricing"}
- Category: ${product.category || "Uncategorized"}
${product.features?.length ? `- Features: ${product.features.join(", ")}` : ""}
${product.stock !== null ? `- Stock: ${product.stock > 0 ? "In stock" : "Out of stock"}` : ""}

${product.sales_instructions ? `SALES INSTRUCTIONS:\n${product.sales_instructions}\n` : ""}

AVAILABLE MEDIA:`;

    if (mediaData && mediaData.length > 0) {
      systemPrompt += `\nYou have access to the following product media:\n`;
      mediaData.forEach((media: any) => {
        systemPrompt += `- ${media.label}: ${media.description || "No description"}\n`;
      });
      systemPrompt += `\nWhen customers ask to see specific views or details, describe what the media shows and offer to show it to them. For example: "I can show you the back view of ${product.name}! Would you like to see it?"\n`;
    } else {
      systemPrompt += ` None available yet.`;
    }

    systemPrompt += `\n\nYour goal is to help customers learn about ${product.name}, answer their questions, and guide them toward making a purchase. Be enthusiastic, knowledgeable, and helpful. Follow the sales instructions carefully.`;

    console.log("Calling Lovable AI with system prompt");

    // Add function calling to enable image display
    const tools = mediaData && mediaData.length > 0 ? [
      {
        type: "function",
        function: {
          name: "show_product_image",
          description: "Display a product image to the customer. Use this when customer asks to see photos or specific views.",
          parameters: {
            type: "object",
            properties: {
              label: {
                type: "string",
                description: "The label of the image to show (e.g., 'front view', 'back view', 'detail shot')"
              }
            },
            required: ["label"]
          }
        }
      }
    ] : [];

    // Call Lovable AI
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
          ...messages,
        ],
        tools: tools.length > 0 ? tools : undefined,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
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
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Product chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
