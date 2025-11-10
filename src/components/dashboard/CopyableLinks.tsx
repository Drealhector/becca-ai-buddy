import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const links = [
  { label: "Public Hub", path: "/hector" },
  { label: "Call Page", path: "/call/hector" },
  { label: "Chat Page", path: "/chat/hector" },
  { label: "WhatsApp", path: "/whatsapp/hector" },
  { label: "Instagram Page", path: "/instagram/hector" },
  { label: "Facebook Page", path: "/facebook/hector" },
  { label: "Telegram", path: "/telegram/hector" },
];

const CopyableLinks = () => {
  const copyToClipboard = (path: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Link copied to clipboard");
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Shareable Links</h3>
      <div className="space-y-3">
        {links.map((link) => (
          <div
            key={link.path}
            className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div>
              <p className="font-medium">{link.label}</p>
              <p className="text-sm text-muted-foreground">{link.path}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(link.path)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(link.path, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default CopyableLinks;