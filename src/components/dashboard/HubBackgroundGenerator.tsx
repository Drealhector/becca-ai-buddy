import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Wand2,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const HubBackgroundGenerator = () => {
  const [uploading, setUploading] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
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

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `hub-bg-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // Use the same image for all 3 device sizes when uploading manually
      const { data: custData } = await supabase.from("customizations").select("id").single();
      if (!custData?.id) throw new Error("No customizations found");

      const { error: updateError } = await supabase
        .from("customizations")
        .update({
          hub_bg_desktop_url: publicUrl,
          hub_bg_tablet_url: publicUrl,
          hub_bg_phone_url: publicUrl,
        } as any)
        .eq("id", custData.id);

      if (updateError) throw updateError;

      setBackgrounds({ desktop: publicUrl, tablet: publicUrl, phone: publicUrl });
      toast.success("Hub background uploaded!");
    } catch (error) {
      console.error("Error uploading background:", error);
      toast.error("Failed to upload background");
    } finally {
      setUploading(false);
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
      setShowAIDialog(false);
      toast.success("Hub backgrounds generated for all 3 device sizes!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to generate backgrounds");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Card className="p-6 shadow-elegant hover:shadow-hover transition-all">
        <div className="flex items-center gap-2 mb-6">
          <ImageIcon className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Hub Background</h3>
        </div>

        <div className="space-y-3">
          <Label>Hub Background (for Public Hub page)</Label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
              id="hub-bg-upload"
            />
            <label htmlFor="hub-bg-upload">
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                className="gap-2 cursor-pointer"
                asChild
              >
                <span>
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? "Uploading..." : "Upload Image"}
                </span>
              </Button>
            </label>
            {backgrounds.desktop && (
              <img
                src={backgrounds.desktop}
                alt="Hub Background"
                className="w-16 h-16 object-cover rounded-lg border"
              />
            )}
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              setStep("input");
              setShowAIDialog(true);
            }}
          >
            <Sparkles className="w-4 h-4" />
            Generate with AI
          </Button>
        </div>

        {/* Current backgrounds preview */}
        {(backgrounds.desktop || backgrounds.tablet || backgrounds.phone) && (
          <div className="mt-6">
            <Label className="mb-2 block">Current Backgrounds</Label>
            <div className="grid grid-cols-3 gap-3">
              {backgrounds.desktop && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Monitor className="w-3 h-3" /> Desktop
                  </div>
                  <img
                    src={backgrounds.desktop}
                    alt="Desktop BG"
                    className="w-full aspect-[3/2] object-cover rounded-lg border"
                  />
                </div>
              )}
              {backgrounds.tablet && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Tablet className="w-3 h-3" /> Tablet
                  </div>
                  <img
                    src={backgrounds.tablet}
                    alt="Tablet BG"
                    className="w-full aspect-square object-cover rounded-lg border"
                  />
                </div>
              )}
              {backgrounds.phone && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Smartphone className="w-3 h-3" /> Phone
                  </div>
                  <img
                    src={backgrounds.phone}
                    alt="Phone BG"
                    className="w-full aspect-[2/3] object-cover rounded-lg border"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* AI Generate Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate Hub Background with AI
            </DialogTitle>
            <DialogDescription>
              AI will generate 3 images tailored for Desktop, Tablet & Phone ratios.
            </DialogDescription>
          </DialogHeader>

          {generating ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="font-medium">Generating 3 backgrounds...</p>
              <p className="text-sm text-muted-foreground">
                Desktop, Tablet & Phone — this may take a minute
              </p>
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
                <Button
                  onClick={() => handleGenerate()}
                  disabled={!prompt.trim()}
                  className="flex-1 gap-2"
                >
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
                <Button variant="outline" onClick={() => setStep("input")}>
                  Back
                </Button>
                <Button
                  onClick={handleGeneratePrompt}
                  disabled={generatingPrompt || !businessInfo.trim()}
                  className="flex-1 gap-2"
                >
                  {generatingPrompt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  {generatingPrompt ? "Creating Prompt..." : "Create Prompt"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Generated Prompt</Label>
              <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                {generatedPrompt}
              </div>
              <Button onClick={() => handleGenerate(generatedPrompt)} className="w-full gap-2">
                <Sparkles className="w-4 h-4" /> Approve & Generate (3 sizes)
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPrompt(generatedPrompt);
                    setStep("input");
                  }}
                  className="flex-1"
                >
                  Refine
                </Button>
                <Button variant="outline" onClick={() => setStep("business-info")} className="flex-1">
                  Add Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HubBackgroundGenerator;
