import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain } from "lucide-react";

export const AIPersonalitySection = () => {
  const [personality, setPersonality] = useState("");
  const [loading, setLoading] = useState(false);

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

      toast.success("AI personality updated successfully!");
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
      <p className="text-sm text-muted-foreground mb-4">
        Define how your AI assistant behaves across all platforms
      </p>
      <Textarea
        value={personality}
        onChange={(e) => setPersonality(e.target.value)}
        placeholder="e.g., You are a helpful and friendly AI assistant. Be warm, engaging, and professional in all your responses."
        className="min-h-[120px] mb-4"
      />
      <Button onClick={handleSave} disabled={loading}>
        {loading ? "Saving..." : "Save Personality"}
      </Button>
    </Card>
  );
};
