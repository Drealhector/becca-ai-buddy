import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const defaultLinks = [
  { key: "call-hector", label: "Call Hector", path: "/call-hector" },
  { key: "whatsapp", label: "WhatsApp", path: "/whatsapp/hector" },
  { key: "instagram", label: "Instagram Page", path: "/instagram/hector" },
  { key: "facebook", label: "Facebook Page", path: "/facebook/hector" },
  { key: "telegram", label: "Telegram", path: "/telegram/hector" },
];

const CopyableLinks = () => {
  const [expanded, setExpanded] = useState(false);
  const [hiddenLinks, setHiddenLinks] = useState<string[]>([]);
  const [showHideDialog, setShowHideDialog] = useState(false);
  const [pendingHideAction, setPendingHideAction] = useState<{ path: string; isCurrentlyHidden: boolean } | null>(null);

  const products = useQuery(api.products.list, {}) ?? [];

  const copyToClipboard = (path: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Link copied to clipboard");
  };

  const toggleLinkVisibility = (path: string) => {
    const isCurrentlyHidden = hiddenLinks.includes(path);
    setPendingHideAction({ path, isCurrentlyHidden });
    setShowHideDialog(true);
  };

  const confirmToggleVisibility = () => {
    if (!pendingHideAction) return;
    
    const { path, isCurrentlyHidden } = pendingHideAction;
    setHiddenLinks(prev => {
      const newHiddenLinks = isCurrentlyHidden 
        ? prev.filter(p => p !== path)
        : [...prev, path];
      
      // Store in localStorage so PublicHub can read it
      localStorage.setItem('hiddenLinks', JSON.stringify(newHiddenLinks));
      
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new Event('storage'));
      
      toast.success(isCurrentlyHidden ? "Link shown on public hub" : "Link hidden from public hub");
      return newHiddenLinks;
    });
    
    setShowHideDialog(false);
    setPendingHideAction(null);
  };

  // Load hidden links from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('hiddenLinks');
    if (stored) {
      setHiddenLinks(JSON.parse(stored));
    }
  }, []);

  const publicHubLink = { label: "Public Hub", path: "/hector" };
  const productLinks = products.map(product => ({
    label: product.name,
    path: `/product/${product.link_slug}`,
    productData: product
  }));

  return (
    <Card className="p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Shareable Links</h3>
      <div className="space-y-3 flex-1">
        {/* Public Hub Link - Always visible */}
        <div
          className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1">
            <p className="font-medium">{publicHubLink.label}</p>
            <p className="text-sm text-muted-foreground">{publicHubLink.path}</p>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(publicHubLink.path);
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                window.open(publicHubLink.path, "_blank");
              }}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded Links */}
        {expanded && (
          <div className="space-y-3 pl-4">
            {defaultLinks.map((link) => (
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
                    onClick={() => toggleLinkVisibility(link.key)}
                    className={hiddenLinks.some(id => id === link.key || id === link.path) ? 'text-destructive hover:text-destructive/90' : ''}
                    title={hiddenLinks.some(id => id === link.key || id === link.path) ? "Show on public hub" : "Hide from public hub"}
                  >
                    {hiddenLinks.some(id => id === link.key || id === link.path) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
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

            {/* Product Links */}
            {productLinks.map((link) => (
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
                    onClick={() => toggleLinkVisibility(link.path)}
                    className={hiddenLinks.some(id => id === link.path || id === link.productData.link_slug) ? 'text-destructive hover:text-destructive/90' : ''}
                    title={hiddenLinks.some(id => id === link.path || id === link.productData.link_slug) ? "Show on public hub" : "Hide from public hub"}
                  >
                    {hiddenLinks.some(id => id === link.path || id === link.productData.link_slug) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
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
        )}
      </div>

      {/* Hide/Unhide Confirmation Dialog */}
      <AlertDialog open={showHideDialog} onOpenChange={setShowHideDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingHideAction?.isCurrentlyHidden ? "Show Link on Public Hub?" : "Hide Link from Public Hub?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingHideAction?.isCurrentlyHidden 
                ? "This link will become visible to customers on the public hub. Are you sure you want to continue?"
                : "This link will be hidden from customers on the public hub. You can still see it on your dashboard. Are you sure you want to continue?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowHideDialog(false);
              setPendingHideAction(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleVisibility}>
              {pendingHideAction?.isCurrentlyHidden ? "Show" : "Hide"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default CopyableLinks;
