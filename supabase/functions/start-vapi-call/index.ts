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
    const VAPI_PUBLIC_KEY = Deno.env.get('VITE_VAPI_PUBLIC_KEY');
    if (!VAPI_PUBLIC_KEY) {
      throw new Error('VITE_VAPI_PUBLIC_KEY is not configured');
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch customization data
    const { data: customization } = await supabase
      .from("customizations")
      .select("*")
      .limit(1)
      .maybeSingle();

    // Fetch assistant ID from connections
    const { data: connection } = await supabase
      .from("connections")
      .select("vapi_assistant_id")
      .limit(1)
      .maybeSingle();

    const assistantId = connection?.vapi_assistant_id || 'default-assistant';

    // Build system prompt with customization
    const systemPrompt = `You are ${customization?.business_name || 'BECCA'}, an AI assistant.

Business Description: ${customization?.business_description || 'A helpful AI assistant'}
Industry: ${customization?.business_industry || 'General'}
Target Audience: ${customization?.target_audience || 'Everyone'}
Key Services: ${customization?.key_services || 'General assistance'}
Business Hours: ${customization?.business_hours || '24/7'}

Personality: ${customization?.assistant_personality || 'Friendly and professional'}
Tone: ${customization?.tone || 'Professional and warm'}

${customization?.special_instructions ? `Special Instructions: ${customization.special_instructions}` : ''}

${customization?.faqs ? `Frequently Asked Questions:\n${JSON.stringify(customization.faqs, null, 2)}` : ''}

Always be helpful, use the tone and personality described above.`;

    // Return configuration for client-side Vapi SDK
    return new Response(JSON.stringify({
      assistantId,
      vapiPublicKey: VAPI_PUBLIC_KEY,
      assistantOverrides: {
        model: {
          messages: [
            {
              role: "system",
              content: systemPrompt
            }
          ]
        },
        firstMessage: customization?.greeting || "Hi! How can I help you today?",
        name: customization?.business_name || "BECCA"
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error starting Vapi call:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
