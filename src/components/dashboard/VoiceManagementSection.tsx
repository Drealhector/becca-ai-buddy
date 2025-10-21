import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mic, Upload, RefreshCw, Volume2 } from "lucide-react";

const VoiceManagementSection = () => {
  const [vapiVoices, setVapiVoices] = useState<any[]>([]);
  const [customVoices, setCustomVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newVoiceName, setNewVoiceName] = useState("");

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    setLoading(true);
    try {
      // Fetch Vapi voices
      const { data, error } = await supabase.functions.invoke("fetch-vapi-voices");
      if (error) throw error;
      setVapiVoices(data?.voices || []);

      // Fetch custom voices
      const { data: customData } = await supabase
        .from("customizations")
        .select("custom_voices")
        .single();
      setCustomVoices(Array.isArray(customData?.custom_voices) ? customData.custom_voices : []);
    } catch (error) {
      console.error("Error fetching voices:", error);
      toast.error("Failed to load voices");
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceUpload = async (file: File) => {
    if (!newVoiceName.trim()) {
      toast.error("Please enter a voice name");
      return;
    }

    // Just add to UI - non-functional
    const newVoice = {
      id: Date.now().toString(),
      name: newVoiceName,
      type: "custom",
      functional: false,
    };

    const updated = [...customVoices, newVoice];
    setCustomVoices(updated);

    try {
      const { error } = await supabase
        .from("customizations")
        .update({ custom_voices: updated })
        .eq("id", (await supabase.from("customizations").select("id").single()).data?.id);

      if (error) throw error;
      toast.success("Voice added to library (preview only)");
      setNewVoiceName("");
    } catch (error) {
      console.error("Error saving voice:", error);
      toast.error("Failed to save voice");
    }
  };

  return (
    <Card className="p-6 shadow-elegant hover:shadow-hover transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Voice Management</h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchVoices}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-6">
        {/* Vapi Voices */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">Vapi Voices (Functional)</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {vapiVoices.length > 0 ? (
              vapiVoices.map((voice) => (
                <div
                  key={voice.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-primary" />
                    <span className="font-medium">{voice.name}</span>
                  </div>
                  <span className="text-xs text-green-500 font-semibold">Functional</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No Vapi voices found</p>
            )}
          </div>
        </div>

        {/* Custom Voices */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">Custom Voices (Preview Only)</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
            {customVoices.map((voice) => (
              <div
                key={voice.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{voice.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">Preview</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Input
              placeholder="Voice name..."
              value={newVoiceName}
              onChange={(e) => setNewVoiceName(e.target.value)}
            />
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "audio/*";
                input.onchange = (e: any) => handleVoiceUpload(e.target.files[0]);
                input.click();
              }}
            >
              <Upload className="w-4 h-4" />
              Upload Voice (Preview Only)
            </Button>
            <p className="text-xs text-muted-foreground">
              Custom voices are for preview only. Vapi voices are fully functional.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VoiceManagementSection;
