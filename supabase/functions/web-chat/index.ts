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
    const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_WEB_ASSISTANT_ID');
    const VAPI_PRIVATE_KEY = Deno.env.get('VAPI_WEB_PRIVATE_KEY');
    
    if (!VAPI_ASSISTANT_ID || !VAPI_PRIVATE_KEY) {
      throw new Error('VAPI credentials not configured');
    }

    console.log('Using Vapi assistant:', VAPI_ASSISTANT_ID);

    // Get customization data for first message
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: customData } = await supabase
      .from('customizations')
      .select('*')
      .limit(1)
      .maybeSingle();

    // Build context from customization with strong conversational instructions
    const contextPrompt = `CRITICAL INSTRUCTIONS:
- Speak naturally like a real person in casual conversation
- NEVER sound like marketing copy or formal descriptions  
- NEVER use phrases like "specializing in" or "quite an impressive setup"
- Just chat like you're talking to a friend
- Keep it brief and natural, 1-2 sentences unless asked for more
- Never use hyphens (-), use periods or commas instead

You are ${customData?.assistant_personality ? customData.assistant_personality : 'a friendly assistant'} for ${customData?.business_name || 'this business'}.

${customData?.business_description ? `About the business: ${customData.business_description}` : ''}
${customData?.key_services ? `Services offered: ${customData.key_services}` : ''}
${customData?.tone ? `General tone: ${customData.tone}` : ''}`;

    console.log('Context:', contextPrompt);

    // Create a Vapi call for text-only chat
    const vapiResponse = await fetch('https://api.vapi.ai/call/web', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: VAPI_ASSISTANT_ID,
        assistant: {
          model: {
            messages: [
              { role: 'system', content: contextPrompt },
              ...messages
            ]
          }
        }
      }),
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error('Vapi error:', vapiResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'Vapi error', details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const vapiData = await vapiResponse.json();
    console.log('Vapi response:', vapiData);

    // Return the response in SSE format
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const message = vapiData.message || vapiData.response || 'Hello! How can I help you?';
        const sseData = `data: ${JSON.stringify({
          choices: [{
            delta: { content: message }
          }]
        })}\n\n`;
        controller.enqueue(encoder.encode(sseData));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    return new Response(stream, {
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
