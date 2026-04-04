import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { AILogoGeneratorDialog } from "./AILogoGeneratorDialog";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const LogoCustomization = () => {
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState<"hub" | "chat" | null>(null);

  const customizations = useQuery(api.customizations.get, {});
  const updateCustomizations = useMutation(api.customizations.update);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const logoUrl = customizations?.logo_url || "";
  const chatLogoUrl = customizations?.chat_logo_url || "";

  const handleFileUpload = async (file: File, type: "hub" | "chat") => {
    if (!customizations?._id) return;
    setUploading(type);
    try {
      // Upload to Convex file storage
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      // Get public URL
      const url = `${import.meta.env.VITE_CONVEX_URL}/api/storage/${storageId}`;

      const updateField = type === "hub" ? "logo_url" : "chat_logo_url";
      await updateCustomizations({ id: customizations._id, [updateField]: url } as any);

      toast.success(`${type === "hub" ? "Hub" : "Chat"} logo updated!`);
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(null);
    }
  };

  return (
    <Card className="p-6 shadow-elegant hover:shadow-hover transition-all">
      <h3 className="text-lg font-semibold mb-4">Logo Customization</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hub Logo */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Hub Logo</Label>
          {logoUrl && (
            <div className="mb-3 p-4 border rounded-lg bg-muted/50 flex justify-center">
              <img src={logoUrl} alt="Hub Logo" className="max-h-24 object-contain" />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm" className="gap-2 flex-1"
              disabled={!!uploading}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileUpload(file, "hub");
                };
                input.click();
              }}
            >
              {uploading === "hub" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload
            </Button>
            <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => setGenerating(true)}>
              <ImageIcon className="w-4 h-4" /> AI Generate
            </Button>
          </div>
        </div>

        {/* Chat Logo */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Chat Logo</Label>
          {chatLogoUrl && (
            <div className="mb-3 p-4 border rounded-lg bg-muted/50 flex justify-center">
              <img src={chatLogoUrl} alt="Chat Logo" className="max-h-24 object-contain" />
            </div>
          )}
          <Button
            variant="outline" size="sm" className="gap-2 w-full"
            disabled={!!uploading}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFileUpload(file, "chat");
              };
              input.click();
            }}
          >
            {uploading === "chat" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Chat Logo
          </Button>
        </div>
      </div>

      <AILogoGeneratorDialog open={generating} onOpenChange={setGenerating} />
    </Card>
  );
};

export default LogoCustomization;
