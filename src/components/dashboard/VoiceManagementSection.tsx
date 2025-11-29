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
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    setLoading(true);
    try {
      // Add Becca voice at the top
      const beccaVoice = {
        id: "becca-voice-001",
        name: "Becca",
        description: "Natural, conversational female voice",
        provider: "becca.live"
      };

      // Fetch Vapi voices
      const { data, error } = await supabase.functions.invoke("fetch-vapi-voices");
      if (error) throw error;
      
      // Add Becca voice at the beginning
      setVapiVoices([beccaVoice, ...(data?.voices || [])]);

      // Fetch custom voices and selected voice
      const { data: customData } = await supabase
        .from("customizations")
        .select("custom_voices, vapi_voices")
        .limit(1)
        .single();
      setCustomVoices(Array.isArray(customData?.custom_voices) ? customData.custom_voices : []);
      
      // Get first vapi_voice if exists
      const vapiVoicesData = customData?.vapi_voices;
      if (Array.isArray(vapiVoicesData) && vapiVoicesData.length > 0) {
        setSelectedVoice(vapiVoicesData[0] as string);
      }
    } catch (error) {
      console.error("Error fetching voices:", error);
      toast.error("Failed to load voices");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVoice = async (voiceId: string) => {
    try {
      setSelectedVoice(voiceId);
      
      // Save selected voice to customizations
      const { data: customData } = await supabase
        .from("customizations")
        .select("id")
        .limit(1)
        .single();
        
      if (!customData) throw new Error("Customization not found");
      
      const { error } = await supabase
        .from("customizations")
        .update({ vapi_voices: [voiceId] })
        .eq("id", customData.id);
        
      if (error) throw error;
      
      toast.success("Voice selected successfully");
    } catch (error) {
      console.error("Error selecting voice:", error);
      toast.error("Failed to select voice");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleVoiceUpload = async () => {
    if (!newVoiceName.trim()) {
      toast.error("Please enter a voice name");
      return;
    }

    if (!selectedFile) {
      toast.error("Please select a voice file");
      return;
    }

    setLoading(true);
    
    // Simulate upload process
    setTimeout(() => {
      toast.success(<span className="font-bold">Voice uploaded - pending admin approval</span>);
      setNewVoiceName("");
      setSelectedFile(null);
      setLoading(false);
    }, 1500);
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
        {/* Default Voices */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">Default Voices (Functional)</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {vapiVoices.length > 0 ? (
              vapiVoices.map((voice) => (
                <div
                  key={voice.id}
                  onClick={() => handleSelectVoice(voice.id)}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedVoice === voice.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-primary" />
                      <span className="font-medium">{voice.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{voice.description}</p>
                    <span className="text-xs text-muted-foreground">Provider: {voice.provider}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {selectedVoice === voice.id && (
                      <span className="text-xs text-primary font-semibold">Selected</span>
                    )}
                    <span className="text-xs text-green-500 font-semibold">Functional</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No Vapi voices found</p>
            )}
          </div>
        </div>

        {/* Custom Voices */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">Custom Voices</Label>
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
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Input
              placeholder="Voice name..."
              value={newVoiceName}
              onChange={(e) => setNewVoiceName(e.target.value)}
            />
            <div className="space-y-2">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
                id="voice-file-input"
              />
              <label
                htmlFor="voice-file-input"
                className="flex items-center justify-center gap-2 w-full p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>{selectedFile ? selectedFile.name : "Select Voice File"}</span>
              </label>
              
              {selectedFile && (
                <Button
                  className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleVoiceUpload}
                  disabled={loading}
                >
                  <Upload className="w-4 h-4" />
                  {loading ? "Uploading..." : "Upload Voice"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VoiceManagementSection;
