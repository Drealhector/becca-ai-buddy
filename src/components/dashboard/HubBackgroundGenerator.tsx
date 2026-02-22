import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Image as ImageIcon, Sparkles, Loader2, Wand2, Monitor, Tablet, Smartphone } from "lucide-react";

const HubBackgroundGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [businessInfo, setBusinessInfo] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [step, setStep] = useState<"input" | "business-info" | "review">("input");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [backgrounds, setBackgrounds] = useState<{
    desktop?: string;
    tablet?: string;
    phone?: string;
  }>({});

  useEffect(() => {
    fetchBackgrounds();
  }, []);

  const fetchBackgrounds = async () => {
    try {
      const { data } = await supabase
        .from("customizations")
        .select("hub_bg_desktop_url, hub_bg_tablet_url, hub_bg_phone_url")
        .limit(1)
        .single();
      if (data) {
        setBackgrounds({
          desktop: (data as any).hub_bg_desktop_url || undefined,
          tablet: (data as any).hub_bg_tablet_url || undefined,
          phone: (data as any).hub_bg_phone_url || undefined,
        });
      }
    } catch (error) {
      console.error("Error fetching backgrounds:", error);
    }
  };

  const handleLetAIDecide = () => setStep("business-info");

  const handleGeneratePrompt = async () => {
    if (!businessInfo.trim()) {
      toast.error("Please describe your business");
      return;
    }
    setGeneratingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-logo", {
        body: { action: "generate_bg_prompt", businessInfo },
      });
      if (error) throw error;
      if (!data?.prompt) throw new Error("No prompt generated");
      setGeneratedPrompt(data.prompt);
      setStep("review");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to generate prompt");
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const handleGenerate = async (finalPrompt?: string) => {
    const p = finalPrompt || prompt;
    if (!p.trim()) {
      toast.error("Please describe the background you want");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-logo", {
        body: { action: "generate_hub_background", prompt: p },
      });
      if (error) throw error;
      if (!data?.success) throw new Error("Generation failed");
      
      setBackgrounds(data.urls);
      setStep("input");
      setPrompt("");
      setBusinessInfo("");
      setGeneratedPrompt("");
      toast.success("Hub backgrounds generated for all 3 device sizes!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to generate backgrounds");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="p-6 shadow-elegant hover:shadow-hover transition-all">
      <div className="flex items-center gap-2 mb-6">
        <ImageIcon className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Hub Background</h3>
      </div>

      {/* Current backgrounds preview */}
      {(backgrounds.desktop || backgrounds.tablet || backgrounds.phone) && (
        <div className="mb-6">
          <Label className="mb-2 block">Current Backgrounds</Label>
          <div className="grid grid-cols-3 gap-3">
            {backgrounds.desktop && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Monitor className="w-3 h-3" /> Desktop
                </div>
                <img src={backgrounds.desktop} alt="Desktop BG" className="w-full aspect-[3/2] object-cover rounded-lg border" />
              </div>
            )}
            {backgrounds.tablet && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Tablet className="w-3 h-3" /> Tablet
                </div>
                <img src={backgrounds.tablet} alt="Tablet BG" className="w-full aspect-square object-cover rounded-lg border" />
              </div>
            )}
            {backgrounds.phone && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Smartphone className="w-3 h-3" /> Phone
                </div>
                <img src={backgrounds.phone} alt="Phone BG" className="w-full aspect-[2/3] object-cover rounded-lg border" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generation UI */}
      {generating ? (
        <div className="py-8 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="font-medium">Generating 3 backgrounds...</p>
          <p className="text-sm text-muted-foreground">Desktop, Tablet & Phone — this may take a minute</p>
        </div>
      ) : step === "input" ? (
        <div className="space-y-3">
          <Label>Describe the background you want</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. A dark futuristic cityscape with neon accents and subtle tech patterns..."
            className="min-h-[100px]"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleLetAIDecide} className="flex-1 gap-2">
              <Wand2 className="w-4 h-4" /> Let AI Decide
            </Button>
            <Button onClick={() => handleGenerate()} disabled={!prompt.trim()} className="flex-1 gap-2">
              <Sparkles className="w-4 h-4" /> Generate (3 sizes)
            </Button>
          </div>
        </div>
      ) : step === "business-info" ? (
        <div className="space-y-3">
          <Label>Tell us about your business</Label>
          <Textarea
            value={businessInfo}
            onChange={(e) => setBusinessInfo(e.target.value)}
            placeholder="Describe your business, style, colors, vibe..."
            className="min-h-[120px]"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("input")}>Back</Button>
            <Button onClick={handleGeneratePrompt} disabled={generatingPrompt || !businessInfo.trim()} className="flex-1 gap-2">
              {generatingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {generatingPrompt ? "Creating Prompt..." : "Create Prompt"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Label>Generated Prompt</Label>
          <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">{generatedPrompt}</div>
          <Button onClick={() => handleGenerate(generatedPrompt)} className="w-full gap-2">
            <Sparkles className="w-4 h-4" /> Approve & Generate (3 sizes)
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setPrompt(generatedPrompt); setStep("input"); }} className="flex-1">
              Refine
            </Button>
            <Button variant="outline" onClick={() => setStep("business-info")} className="flex-1">
              Add Details
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default HubBackgroundGenerator;
