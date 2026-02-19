import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, Sparkles, RefreshCw } from "lucide-react";
import { AICharacterCreatorDialog } from "./AICharacterCreatorDialog";

export const AIPersonalitySection = () => {
  const [personality, setPersonality] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
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

  const syncToVapi = async (personalityText: string) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-vapi-system-prompt", {
        body: { personality: personalityText }
      });
      if (error) throw error;
      console.log("✅ Vapi assistant synced:", data);
      return true;
    } catch (err) {
      console.error("Error syncing to Vapi:", err);
      return false;
    } finally {
      setSyncing(false);
    }
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

      // Generate greeting based on personality
      try {
        await supabase.functions.invoke("generate-greeting", {
          body: { personality }
        });
      } catch (greetingError) {
        console.error("Error generating greeting:", greetingError);
      }

      // Sync personality to Vapi assistant (system prompt + inventory tool)
      const vapiSynced = await syncToVapi(personality);

      // Update the Call Hector assistant with new personality
      try {
        await supabase.functions.invoke("update-call-hector-assistant");
      } catch (assistantError) {
        console.error("Error updating Call Hector assistant:", assistantError);
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
        vapiSynced
          ? "AI personality updated & synced to your voice agent!"
          : "AI personality saved (Vapi sync failed — try manual sync)"
      );
    } catch (error) {
      console.error("Error saving personality:", error);
      toast.error("Failed to save AI personality");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!personality.trim()) {
      toast.error("No personality to sync");
      return;
    }
    const ok = await syncToVapi(personality);
    if (ok) {
      toast.success("Synced to Vapi assistant successfully!");
    } else {
      toast.error("Failed to sync to Vapi assistant");
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">AI Personality</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-2">
        Define how your AI assistant behaves across all platforms.
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Saving will automatically sync this personality to your Vapi voice agent, including inventory-checking instructions.
      </p>
      <Textarea
        value={personality}
        onChange={(e) => setPersonality(e.target.value)}
        placeholder="e.g., You are a helpful and friendly AI assistant. Be warm, engaging, and professional in all your responses."
        className="min-h-[120px] mb-4"
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={loading || syncing}>
          {loading ? "Saving..." : "Save Personality"}
        </Button>
        <Button
          variant="outline"
          onClick={handleManualSync}
          disabled={syncing || loading}
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync to Vapi"}
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
