import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { AddProductDialog } from "./AddProductDialog";
import { supabase } from "@/integrations/supabase/client";

const defaultLinks = [
  { label: "WhatsApp", path: "/whatsapp/hector" },
  { label: "Instagram Page", path: "/instagram/hector" },
  { label: "Facebook Page", path: "/facebook/hector" },
  { label: "Telegram", path: "/telegram/hector" },
];

const CopyableLinks = () => {
  const [expanded, setExpanded] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setProducts(data);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const copyToClipboard = (path: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Link copied to clipboard");
  };

  const publicHubLink = { label: "Public Hub", path: "/hector" };
  const productLinks = products.map(product => ({
    label: product.name,
    path: `/product/${product.link_slug}`
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Shareable Links</h3>
      <div className="space-y-3">
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

            {/* Add Product Button */}
            <AddProductDialog onProductAdded={fetchProducts} />
          </div>
        )}
      </div>
    </Card>
  );
};

export default CopyableLinks;
