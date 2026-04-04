import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Brain, Sparkles } from "lucide-react";
import { AICharacterCreatorDialog } from "./AICharacterCreatorDialog";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getAuthHeaders } from "@/lib/auth-fetch";

export const AIPersonalitySection = () => {
  const [personality, setPersonality] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreatorDialog, setShowCreatorDialog] = useState(false);

  const botPersonality = useQuery(api.botPersonality.get);
  const updatePersonality = useMutation(api.botPersonality.update);
  const createPersonality = useMutation(api.botPersonality.create);
  const customizations = useQuery(api.customizations.get, {});
  const updateCustomizations = useMutation(api.customizations.update);

  useEffect(() => {
    if (botPersonality?.personality_text) {
      setPersonality(botPersonality.personality_text);
    }
  }, [botPersonality]);

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
      // Save to Convex
      if (botPersonality?._id) {
        await updatePersonality({ id: botPersonality._id, personality_text: personality });
      } else {
        await createPersonality({ personality_text: personality });
      }

      // Generate a simple first message from the personality
      const firstMessage = generateFirstMessage(personality);

      // Save the greeting to customizations via Convex
      try {
        if (customizations?._id) {
          await updateCustomizations({ id: customizations._id, greeting: firstMessage });
        }
      } catch (greetingErr) {
        console.error("Error saving greeting:", greetingErr);
      }

      // Sync personality to Telnyx AI assistant via Convex endpoint
      let synced = false;
      try {
        const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL;
        const syncRes = await fetch(`${CONVEX_SITE_URL}/telnyx/sync-personality`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        });
        const syncData = await syncRes.json();
        if (syncData.success) {
          synced = true;
        }
      } catch (syncErr) {
        console.error("Error syncing to Telnyx:", syncErr);
      }

      toast.success(
        synced
          ? "AI personality updated & synced to Telnyx!"
          : "AI personality saved (Telnyx sync failed — try again)"
      );
    } catch (error) {
      console.error("Error saving personality:", error);
      toast.error("Failed to save AI personality");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 h-full flex flex-col">
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