import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Sparkles, Image as ImageIcon } from "lucide-react";

const LogoCustomization = () => {
  const [logoUrl, setLogoUrl] = useState("");
  const [chatLogoUrl, setChatLogoUrl] = useState("");
  const [generating, setGenerating] = useState(false);

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

  const handleGenerateLogo = async () => {
    setGenerating(true);
    try {
      const { data: customData } = await supabase
        .from("customizations")
        .select("business_name, business_description")
        .single();

      const prompt = `Create a professional, modern logo for ${customData?.business_name || "a business"}. ${customData?.business_description || ""}. Simple, clean design suitable for web use.`;

      // Call Lovable AI to generate logo
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
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (imageUrl) {
        setChatLogoUrl(imageUrl);
        await supabase
          .from("customizations")
          .update({ chat_logo_url: imageUrl })
          .eq("id", (await supabase.from("customizations").select("id").single()).data?.id);
        toast.success("Logo generated!");
      }
    } catch (error) {
      console.error("Error generating logo:", error);
      toast.error("Failed to generate logo");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("customizations")
        .update({ logo_url: logoUrl, chat_logo_url: chatLogoUrl })
        .eq("id", (await supabase.from("customizations").select("id").single()).data?.id);

      if (error) throw error;
      toast.success("Logos updated!");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save logos");
    }
  };

  return (
    <Card className="p-6 shadow-elegant hover:shadow-hover transition-all">
      <div className="flex items-center gap-2 mb-6">
        <ImageIcon className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Logo & Branding</h3>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="logo_url">Hub Logo URL</Label>
          <Input
            id="logo_url"
            placeholder="https://..."
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="mt-2 w-20 h-20 object-cover rounded-lg" />
          )}
        </div>

        <div>
          <Label htmlFor="chat_logo_url">Chat Logo URL</Label>
          <Input
            id="chat_logo_url"
            placeholder="https://..."
            value={chatLogoUrl}
            onChange={(e) => setChatLogoUrl(e.target.value)}
          />
          {chatLogoUrl && (
            <img src={chatLogoUrl} alt="Chat Logo" className="mt-2 w-20 h-20 object-cover rounded-lg" />
          )}
          <Button
            variant="outline"
            onClick={handleGenerateLogo}
            disabled={generating}
            className="w-full mt-2 gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {generating ? "Generating..." : "Generate with AI"}
          </Button>
        </div>

        <Button onClick={handleSave} className="w-full gap-2">
          <Upload className="w-4 h-4" />
          Save Logos
        </Button>
      </div>
    </Card>
  );
};

export default LogoCustomization;
