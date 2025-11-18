import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Get customization data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: customData, error: customError } = await supabase
      .from('customizations')
      .select('*')
      .limit(1)
      .maybeSingle();

    console.log('Customization data:', customData);
    console.log('Customization error:', customError);

    // Build system prompt from customization
    const systemPrompt = `You are Becca, an AI assistant for ${customData?.business_name || 'this business'}.

${customData?.business_description ? `About the business: ${customData.business_description}` : ''}
${customData?.business_industry ? `Industry: ${customData.business_industry}` : ''}
${customData?.target_audience ? `Target Audience: ${customData.target_audience}` : ''}
${customData?.key_services ? `Services: ${customData.key_services}` : ''}
${customData?.business_hours ? `Hours: ${customData.business_hours}` : ''}

PERSONALITY AND TONE:
${customData?.assistant_personality || 'Be professional and helpful.'}

${customData?.tone ? `Always maintain a ${customData.tone} tone in your responses.` : 'Maintain a friendly and professional tone.'}

RESPONSE STYLE:
- Keep responses concise: 1-2 sentences unless the user specifically asks for more detail or explanation
- Be conversational and natural, not chunky or robotic
- Only provide detailed explanations when the user explicitly requests them (e.g., "explain more", "tell me more", "give me details")
- Get straight to the point without unnecessary elaboration

${customData?.special_instructions ? `Special Instructions: ${customData.special_instructions}` : ''}

${customData?.faqs ? `Frequently Asked Questions:\n${JSON.stringify(customData.faqs, null, 2)}` : ''}

Remember: Embody the personality specified above in every response and keep it brief unless asked for more.

    console.log('System prompt:', systemPrompt);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
