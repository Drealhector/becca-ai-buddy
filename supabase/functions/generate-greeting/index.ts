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
    const { personality } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Generating greeting for personality:', personality);

    // Call Lovable AI to generate a greeting
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: `You are a greeting message generator. Based on the personality description provided, create a short, friendly greeting message (1-2 sentences max) that matches the tone and personality.

**CRITICAL RULES:**
1. This is for VOICE/CHAT communication, NOT video calls
2. **NEVER use visual references**: NO "see", "look", "watch", "you look [adjective]", "good to see you", "nice to see you"
3. **NEVER use vague contextual phrases**: NO "about that thing", "what's the latest", "how's that going", "you mentioned", "so about that" - this is a FIRST greeting with NO prior context
4. Use casual, warm greetings appropriate for starting a fresh conversation
5. You can comment on VOICE, ENERGY, or VIBE but NEVER appearance
6. Keep it natural and conversational
7. Do not include any introductions like "Here's a greeting" - just output the greeting itself

**GOOD EXAMPLES:**
- "Hey there, how's it going?"
- "What's up? Good to hear from you."
- "Yo! How are you doing today?"

**BAD EXAMPLES (NEVER USE):**
- "Good to see you today!" (visual reference)
- "You look great!" (visual reference)  
- "So about that thing, what's the latest?" (vague context - no prior conversation)
- "How's that project going?" (assumes prior knowledge)`
          },
          { 
            role: 'user', 
            content: `Generate a greeting message for an AI assistant with this personality: ${personality}

Remember: NO visual words (see/look), NO vague context phrases (about that/what's the latest). This is a FIRST greeting for VOICE/CHAT.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const greeting = data.choices?.[0]?.message?.content?.trim() || "Hi! How can I help you today?";
    
    console.log('Generated greeting:', greeting);

    // Update the customizations table with the new greeting
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: updateError } = await supabase
      .from("customizations")
      .update({ greeting: greeting })
      .eq('id', (await supabase.from('customizations').select('id').limit(1).single()).data?.id);

    if (updateError) {
      console.error('Error updating greeting:', updateError);
      throw updateError;
    }

    console.log('Greeting saved to database');
    
    return new Response(
      JSON.stringify({ greeting }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in generate-greeting:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
