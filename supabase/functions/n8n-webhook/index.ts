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
    const { platform, messages, conversation_id, sender_name, timestamp } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Received webhook data:", { platform, conversation_id, sender_name, timestamp, messages });

    // Helpers
    const isValidUUID = (id: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return typeof id === 'string' && uuidRegex.test(id);
    };

    const toISOTime = (ts: string | number | undefined): string => {
      try {
        if (ts === undefined || ts === null) return new Date().toISOString();
        if (typeof ts === 'number') {
          const d = ts > 1e12 ? new Date(ts) : new Date(ts * 1000);
          return d.toISOString();
        }
        const s = String(ts).trim();
        if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000).toISOString();
        if (/^\d{13}$/.test(s)) return new Date(Number(s)).toISOString();
        // If it's already ISO or another parseable format
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d.toISOString();
        return new Date().toISOString();
      } catch {
        return new Date().toISOString();
      }
    };

    // Deterministic UUID v5-like from platform + external id using SHA-1
    const toDeterministicUUID = async (input: string): Promise<string> => {
      const data = new TextEncoder().encode(input);
      const hashBuf = await crypto.subtle.digest('SHA-1', data); // 20 bytes
      const bytes = new Uint8Array(hashBuf).slice(0, 16); // take first 16 bytes
      // Set version (5)
      bytes[6] = (bytes[6] & 0x0f) | 0x50;
      // Set variant (RFC 4122)
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
      return `${hex.substring(0,8)}-${hex.substring(8,12)}-${hex.substring(12,16)}-${hex.substring(16,20)}-${hex.substring(20,32)}`;
    };

    const resolvedConversationId = isValidUUID(conversation_id)
      ? conversation_id
      : await toDeterministicUUID(`${platform || 'unknown'}:${conversation_id}`);

    console.log("Resolved conversation_id:", { original: conversation_id, resolved: resolvedConversationId });

    // Ensure conversation exists (insert if missing)
    const { data: existingConversation, error: fetchConvError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", resolvedConversationId)
      .maybeSingle();

    if (fetchConvError) {
      console.error("Error fetching conversation:", fetchConvError);
    }

    if (!existingConversation) {
      const { error: insertConvError } = await supabase
        .from("conversations")
        .insert({ id: resolvedConversationId, platform, start_time: new Date().toISOString() });
      if (insertConvError) {
        console.error("Error inserting conversation:", insertConvError);
      } else {
        console.log("Conversation inserted:", resolvedConversationId);
      }
    } else {
      console.log("Conversation exists:", resolvedConversationId);
    }

    console.log("Conversation created/updated:", resolvedConversationId);
    // Save messages
    let salesFlagged = false;
    for (const message of messages) {
      // Normalize role to match app expectations
      const rawRole = (message.role || '').toLowerCase();
      const role = rawRole === 'assistant' || rawRole === 'bot' ? 'ai' : rawRole || 'user';

      // Use message-level sender_name/timestamp if provided, otherwise use top-level
      const messageSenderName = message.sender_name || sender_name || (role === 'user' ? 'Customer' : 'Becca');
      const messageTimestampISO = toISOTime(message.timestamp ?? timestamp);

      const insertResult = await supabase.from("messages").insert({
        conversation_id: resolvedConversationId,
        role,
        content: message.content,
        sender_name: messageSenderName,
        timestamp: messageTimestampISO,
        platform,
      });

      console.log("Message inserted:", insertResult);

      // Check for sales keywords
      const content = (message.content || '').toLowerCase();
      if (content.includes("buy") || content.includes("purchase") || (message.content || '').includes("$")) {
        salesFlagged = true;
      }
    }

    // If sales flagged, create a sales record
    if (salesFlagged) {
      const amount = 0; // Extract amount from message if needed
      await supabase.from("sales").insert({
        conversation_id: resolvedConversationId,
        amount,
        description: "Sale detected from conversation",
        timestamp: new Date().toISOString(),
      });

      // Update wallet
      const { data: wallet } = await supabase
        .from("wallet")
        .select("*")
        .limit(1)
        .single();

      if (wallet) {
        await supabase
          .from("wallet")
          .update({
            total: (wallet.total || 0) + amount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", wallet.id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("N8N webhook error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
