import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Sparkles, Image as ImageIcon, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const LogoCustomization = () => {
  const [logoUrl, setLogoUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [logoDescription, setLogoDescription] = useState("");
  const [useAutoGenerate, setUseAutoGenerate] = useState(false);

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    try {
      const { data } = await supabase
        .from("customizations")
        .select("logo_url")
        .limit(1)
        .single();
      setLogoUrl(data?.logo_url || "");
    } catch (error) {
      console.error("Error fetching logo:", error);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("customizations")
        .update({ logo_url: publicUrl })
        .eq("id", (await supabase.from("customizations").select("id").single()).data?.id);

      if (updateError) throw updateError;

      setLogoUrl(publicUrl);
      toast.success("Logo uploaded!");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateLogo = async () => {
    setGenerating(true);
    try {
      let prompt = "";
      
      if (useAutoGenerate) {
        // Fetch business details for auto-generation
        const { data: customization } = await supabase
          .from("customizations")
          .select("business_name, business_description, business_industry")
          .single();
        
        prompt = `Create a professional, modern logo for ${customization?.business_name || 'a business'}. ${customization?.business_description ? 'Business description: ' + customization.business_description : ''}. The logo should be clean, memorable, and suitable for digital use.`;
      } else {
        prompt = logoDescription;
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
      
      await handleFileUpload(file);
      setShowGenerateDialog(false);
      setLogoDescription("");
      setUseAutoGenerate(false);
      toast.success("Logo generated and uploaded!");
    } catch (error) {
      console.error("Error generating logo:", error);
      toast.error("Failed to generate logo");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Card className="p-6 shadow-elegant hover:shadow-hover transition-all">
        <div className="flex items-center gap-2 mb-6">
          <ImageIcon className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Hub Logo</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Hub Logo (for Public Hub page)</Label>
            <div className="mt-2 flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
                id="hub-logo-upload"
              />
              <label htmlFor="hub-logo-upload">
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
                    {uploading ? "Uploading..." : "Upload Logo"}
                  </span>
                </Button>
              </label>
              {logoUrl && (
                <img src={logoUrl} alt="Hub Logo" className="w-16 h-16 object-cover rounded-lg border" />
              )}
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setShowGenerateDialog(true)}
          >
            <Sparkles className="w-4 h-4" />
            Generate with AI
          </Button>
        </div>
      </Card>

      {/* Generate AI Logo Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Logo with AI</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Choose Generation Method</Label>
              <div className="space-y-2">
                <Button
                  variant={!useAutoGenerate ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setUseAutoGenerate(false)}
                >
                  Describe Your Logo
                </Button>
                <Button
                  variant={useAutoGenerate ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setUseAutoGenerate(true)}
                >
                  Let AI Create Based on Your Business
                </Button>
              </div>
            </div>

            {!useAutoGenerate && (
              <div className="space-y-2">
                <Label htmlFor="logoDescription">Describe Your Logo</Label>
                <Textarea
                  id="logoDescription"
                  placeholder="E.g., A modern geometric logo with blue and white colors, incorporating technology elements..."
                  value={logoDescription}
                  onChange={(e) => setLogoDescription(e.target.value)}
                  rows={4}
                />
              </div>
            )}

            {useAutoGenerate && (
              <p className="text-sm text-muted-foreground">
                AI will generate a logo based on your business name and description from your profile.
              </p>
            )}

            <Button
              onClick={handleGenerateLogo}
              disabled={generating || (!useAutoGenerate && !logoDescription.trim())}
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
    </>
  );
};

export default LogoCustomization;