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
      const { data: customData } = await supabase
        .from("customizations")
        .select("business_name, business_description")
        .single();

      const prompt = `Create a professional, modern circular logo for ${customData?.business_name || "a business"}. ${customData?.business_description || ""}. Simple, clean design on transparent or white background, suitable for web use as avatar.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      const data = await response.json();
      const imageDataUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (imageDataUrl) {
        // Convert base64 to blob and upload
        const base64Response = await fetch(imageDataUrl);
        const blob = await base64Response.blob();
        const file = new File([blob], "generated-logo.png", { type: "image/png" });
        
        await handleFileUpload(file, "chat");
        toast.success("Logo generated and uploaded!");
      }
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
        <h3 className="text-lg font-semibold">Logo & Branding</h3>
      </div>

      <div className="space-y-6">
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

        <div>
          <Label>Chat Widget Logo</Label>
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "chat")}
                className="hidden"
                id="chat-logo-upload"
              />
              <label htmlFor="chat-logo-upload">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading === "chat" || generating}
                  className="gap-2 cursor-pointer"
                  asChild
                >
                  <span>
                    {uploading === "chat" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploading === "chat" ? "Uploading..." : "Upload Logo"}
                  </span>
                </Button>
              </label>
              {chatLogoUrl && (
                <img src={chatLogoUrl} alt="Chat Logo" className="w-16 h-16 object-cover rounded-lg border" />
              )}
            </div>
            <Button
              variant="outline"
              onClick={handleGenerateLogo}
              disabled={generating || uploading === "chat"}
              className="w-full gap-2"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generating ? "Generating..." : "Generate with AI"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LogoCustomization;
