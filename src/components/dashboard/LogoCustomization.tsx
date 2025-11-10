import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Sparkles, Image as ImageIcon, Loader2 } from "lucide-react";

const LogoCustomization = () => {
  const [logoUrl, setLogoUrl] = useState("");
  const [chatLogoUrl, setChatLogoUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState<"hub" | "chat" | null>(null);

  useEffect(() => {
    fetchLogos();
  }, []);

  const fetchLogos = async () => {
    try {
      const { data } = await supabase
        .from("customizations")
        .select("logo_url, chat_logo_url")
        .limit(1)
        .single();
      setLogoUrl(data?.logo_url || "");
      setChatLogoUrl(data?.chat_logo_url || "");
    } catch (error) {
      console.error("Error fetching logos:", error);
    }
  };

  const handleFileUpload = async (file: File, type: "hub" | "chat") => {
    setUploading(type);
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

      const updateField = type === "hub" ? "logo_url" : "chat_logo_url";
      const { error: updateError } = await supabase
        .from("customizations")
        .update({ [updateField]: publicUrl })
        .eq("id", (await supabase.from("customizations").select("id").single()).data?.id);

      if (updateError) throw updateError;

      if (type === "hub") setLogoUrl(publicUrl);
      else setChatLogoUrl(publicUrl);

      toast.success("Logo uploaded!");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(null);
    }
  };

  const handleGenerateLogo = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-logo");

      if (error) throw error;
      if (!data?.imageDataUrl) throw new Error("No image generated");

      // Convert base64 to blob and upload
      const base64Response = await fetch(data.imageDataUrl);
      const blob = await base64Response.blob();
      const file = new File([blob], "generated-logo.png", { type: "image/png" });
      
      await handleFileUpload(file, "chat");
      toast.success("Logo generated and uploaded!");
    } catch (error) {
      console.error("Error generating logo:", error);
      toast.error("Failed to generate logo");
    } finally {
      setGenerating(false);
    }
  };


  return (
    <Card className="p-6 shadow-elegant hover:shadow-hover transition-all">
      <div className="flex items-center gap-2 mb-6">
        <ImageIcon className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Hub Logo</h3>
      </div>

      <div>
        <Label>Hub Logo (for Public Hub page)</Label>
        <div className="mt-2 flex items-center gap-4">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "hub")}
            className="hidden"
            id="hub-logo-upload"
          />
          <label htmlFor="hub-logo-upload">
            <Button
              type="button"
              variant="outline"
              disabled={uploading === "hub"}
              className="gap-2 cursor-pointer"
              asChild
            >
              <span>
                {uploading === "hub" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading === "hub" ? "Uploading..." : "Upload Logo"}
              </span>
            </Button>
          </label>
          {logoUrl && (
            <img src={logoUrl} alt="Hub Logo" className="w-16 h-16 object-cover rounded-lg border" />
          )}
        </div>
      </div>
    </Card>
  );
};

export default LogoCustomization;
