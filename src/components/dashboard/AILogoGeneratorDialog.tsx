import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, Wand2 } from "lucide-react";

interface AILogoGeneratorDialogProps {
  onLogoGenerated: () => void;
}

export const AILogoGeneratorDialog = ({ onLogoGenerated }: AILogoGeneratorDialogProps) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [useAuto, setUseAuto] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const prompt = useAuto
        ? "Create a professional, modern business logo that represents innovation and trust"
        : description;

      if (!useAuto && !prompt.trim()) {
        toast.error("Please describe your logo");
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-logo", {
        body: { prompt }
      });

      if (error) throw error;
      if (!data?.imageDataUrl) throw new Error("No image generated");

      // Convert base64 to blob and upload
      const base64Response = await fetch(data.imageDataUrl);
      const blob = await base64Response.blob();
      const file = new File([blob], "generated-logo.png", { type: "image/png" });
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("customizations")
        .update({ logo_url: publicUrl })
        .eq("id", (await supabase.from("customizations").select("id").single()).data?.id);

      if (updateError) throw updateError;

      toast.success("Logo generated and uploaded!");
      setOpen(false);
      setDescription("");
      setUseAuto(false);
      onLogoGenerated();
    } catch (error) {
      console.error("Error generating logo:", error);
      toast.error("Failed to generate logo");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Sparkles className="w-4 h-4" />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Logo with AI</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Describe your logo</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe how you want your logo to look..."
              className="min-h-[100px]"
              disabled={useAuto || generating}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseAuto(!useAuto)}
              disabled={generating}
              className="flex-1"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {useAuto ? "Using Auto Mode" : "Let AI Decide"}
            </Button>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={generating || (!useAuto && !description.trim())}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Logo
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
