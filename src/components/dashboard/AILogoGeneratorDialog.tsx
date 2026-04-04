import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/auth-fetch";
import { Sparkles, Loader2, Wand2, RefreshCw, Plus } from "lucide-react";

interface AILogoGeneratorDialogProps {
  onLogoGenerated: () => void;
}

type WorkflowStep = 'input' | 'business-info' | 'review-prompt' | 'generating';

export const AILogoGeneratorDialog = ({ onLogoGenerated }: AILogoGeneratorDialogProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WorkflowStep>('input');
  const [description, setDescription] = useState("");
  const [businessInfo, setBusinessInfo] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const resetDialog = () => {
    setStep('input');
    setDescription("");
    setBusinessInfo("");
    setGeneratedPrompt("");
    setLoading(false);
  };

  const handleLetAIDecide = () => {
    setStep('business-info');
  };

  const handleGeneratePrompt = async () => {
    if (!businessInfo.trim()) {
      toast.error("Please tell us about your business");
      return;
    }

    setLoading(true);
    try {
      const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL;
      const res = await fetch(`${CONVEX_SITE_URL}/generate-logo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ action: "generate_prompt", businessInfo }),
      });
      const data = await res.json();
      if (!data?.prompt) throw new Error("No prompt generated");

      setGeneratedPrompt(data.prompt);
      setStep('review-prompt');
    } catch (error) {
      console.error("Error generating prompt:", error);
      toast.error("Failed to generate prompt");
    } finally {
      setLoading(false);
    }
  };

  const handleRefinePrompt = () => {
    setDescription(generatedPrompt);
    setStep('input');
  };

  const handleAddMoreDetails = () => {
    setStep('business-info');
  };

  const handleGenerateLogo = async (finalPrompt?: string) => {
    const promptToUse = finalPrompt || description;
    
    if (!promptToUse.trim()) {
      toast.error("Please describe your logo or use AI mode");
      return;
    }

    setStep('generating');
    setLoading(true);
    
    try {
      const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL;
      const res = await fetch(`${CONVEX_SITE_URL}/generate-logo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ prompt: promptToUse }),
      });
      const data = await res.json();
      if (!data?.image_url) throw new Error("No image generated");

      // The image URL from OpenAI is temporary — store it directly in customizations
      // In production, download and re-upload to Convex storage
      const publicUrl = data.image_url;

      // Update customizations with the logo URL
      const customRes = await fetch(`${CONVEX_SITE_URL}/update-logo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ logo_url: publicUrl }),
      });

      toast.success("Logo generated!");
      setOpen(false);
      resetDialog();
      onLogoGenerated();
    } catch (error) {
      console.error("Error generating logo:", error);
      toast.error("Failed to generate logo");
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePrompt = () => {
    handleGenerateLogo(generatedPrompt);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Sparkles className="w-4 h-4" />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Logo with AI</DialogTitle>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Describe your logo</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe how you want your logo to look... (e.g., 'A minimalist tech logo with blue and white colors, featuring a circuit board pattern')"
                className="min-h-[120px]"
                disabled={loading}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleLetAIDecide}
                disabled={loading}
                className="flex-1 gap-2"
              >
                <Wand2 className="w-4 h-4" />
                Let AI Decide
              </Button>
              <Button 
                onClick={() => handleGenerateLogo()}
                disabled={loading || !description.trim()}
                className="flex-1 gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Logo
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'business-info' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tell us about your business</Label>
              <Textarea
                value={businessInfo}
                onChange={(e) => setBusinessInfo(e.target.value)}
                placeholder="Describe your business, what you do, your values, target audience, preferred colors, style preferences, etc..."
                className="min-h-[200px]"
                disabled={loading}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('input')}
                disabled={loading}
              >
                Back
              </Button>
              <Button 
                onClick={handleGeneratePrompt}
                disabled={loading || !businessInfo.trim()}
                className="flex-1 gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Prompt...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Create Prompt
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'review-prompt' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Generated Prompt</Label>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{generatedPrompt}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Review the generated prompt. You can refine it, add more details, or approve it to generate your logo.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleApprovePrompt}
                disabled={loading}
                className="w-full gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Logo...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Approve & Generate Logo
                  </>
                )}
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRefinePrompt}
                  disabled={loading}
                  className="flex-1 gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refine Prompt
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAddMoreDetails}
                  disabled={loading}
                  className="flex-1 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add More Details
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'generating' && (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Generating your logo...</p>
            <p className="text-sm text-muted-foreground">This may take a moment</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
