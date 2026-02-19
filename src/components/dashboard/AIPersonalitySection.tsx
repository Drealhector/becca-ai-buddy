import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, Sparkles } from "lucide-react";
import { AICharacterCreatorDialog } from "./AICharacterCreatorDialog";

export const AIPersonalitySection = () => {
  const [personality, setPersonality] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreatorDialog, setShowCreatorDialog] = useState(false);

  useEffect(() => {
    fetchPersonality();
  }, []);

  const fetchPersonality = async () => {
    try {
      const { data, error } = await supabase
        .from("bot_personality")
        .select("personality_text")
        .order("id", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        setPersonality(data.personality_text);
      }
    } catch (error) {
      console.error("Error fetching personality:", error);
      toast.error("Failed to load AI personality");
    }
  };

  // Extract assistant name from personality text
  const extractName = (text: string): string => {
    const nameMatch = text.match(/You are ([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*)/);
    return nameMatch ? nameMatch[1].split('\n')[0].trim().replace(/[.,]$/, '') : "BECCA";
  };

  // Extract business name from personality text
  const extractBusinessName = (text: string): string => {
    const bizMatch = text.match(/(?:from|for|at|of|built|founded|runs?|manages?|owns?)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*)/i);
    return bizMatch ? bizMatch[1].trim().replace(/[.,]$/, '') : "";
  };

  const generateFirstMessage = (text: string): string => {
    const name = extractName(text);
    const business = extractBusinessName(text);
    if (business) {
      return `Hello, this is ${name} from ${business}, how are you doing today?`;
    }
    return `Hello, this is ${name}, how are you doing today?`;
  };

  const handleSave = async () => {
    if (!personality.trim()) {
      toast.error("Personality cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("bot_personality")
        .insert({ personality_text: personality });

      if (error) throw error;

      // Generate a simple first message from the personality
      const firstMessage = generateFirstMessage(personality);

      // Save the greeting to customizations
      try {
        const { data: existing } = await supabase
          .from("customizations")
          .select("id")
          .limit(1)
          .single();

        if (existing) {
          await supabase
            .from("customizations")
            .update({ greeting: firstMessage })
            .eq("id", existing.id);
        }
      } catch (greetingErr) {
        console.error("Error saving greeting:", greetingErr);
      }

      // Auto-sync personality to AI Brain system prompt (includes firstMessage)
      let synced = false;
      try {
        const { data, error: syncError } = await supabase.functions.invoke("update-vapi-system-prompt", {
          body: { personality, firstMessage }
        });
        if (syncError) throw syncError;
        console.log("✅ AI Brain synced:", data);
        synced = true;
      } catch (syncErr) {
        console.error("Error syncing AI Brain:", syncErr);
      }

      // Update the Call Hector assistant with new personality
      try {
        await supabase.functions.invoke("update-call-hector-assistant");
      } catch (assistantError) {
        console.error("Error updating assistant:", assistantError);
      }

      // Sync personality to Telnyx
      try {
        await supabase.functions.invoke("telnyx-update-personality", {
          body: { personality }
        });
      } catch (telnyxErr) {
        console.warn("Telnyx personality sync error:", telnyxErr);
      }

      toast.success(
        synced
          ? "AI personality updated & synced to your AI Brain!"
          : "AI personality saved (sync failed — please try again)"
      );
    } catch (error) {
      console.error("Error saving personality:", error);
      toast.error("Failed to save AI personality");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">AI Personality</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-2">
        Define how your AI Brain behaves across all platforms.
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Saving will automatically sync this personality to your AI Brain, including inventory-checking instructions.
      </p>
      <Textarea
        value={personality}
        onChange={(e) => setPersonality(e.target.value)}
        placeholder="e.g., You are a helpful and friendly AI Brain. Be warm, engaging, and professional in all your responses."
        className="min-h-[120px] mb-4"
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving & Syncing..." : "Save Personality"}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setShowCreatorDialog(true)}
        >
          <Sparkles className="h-4 w-4" />
          Create Character
        </Button>
      </div>

      <AICharacterCreatorDialog
        open={showCreatorDialog}
        onOpenChange={setShowCreatorDialog}
        onCopyToPersonality={setPersonality}
      />
    </Card>
  );
};