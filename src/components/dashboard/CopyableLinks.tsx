import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, ChevronDown, ChevronUp, Edit, Eye } from "lucide-react";
import { toast } from "sonner";
import { AddProductDialog } from "./AddProductDialog";
import { EditProductDialog } from "./EditProductDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [viewingInteractions, setViewingInteractions] = useState<any>(null);
  const [showInteractionsDialog, setShowInteractionsDialog] = useState(false);
  const [interactions, setInteractions] = useState<any[]>([]);

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

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setShowEditDialog(true);
  };

  const handleViewInteractions = async (product: any) => {
    setViewingInteractions(product);
    
    // Fetch agent to get assistant_id
    const { data: agentData } = await supabase
      .from('ai_agents')
      .select('assistant_id')
      .eq('product_id', product.id)
      .single();
    
    if (agentData) {
      // Fetch interactions for this product
      const { data: interactionData } = await supabase
        .from('customer_interactions')
        .select('*')
        .eq('product_id', product.id)
        .order('timestamp', { ascending: false });
      
      setInteractions(interactionData || []);
    }
    
    setShowInteractionsDialog(true);
  };

  const publicHubLink = { label: "Public Hub", path: "/hector" };
  const productLinks = products.map(product => ({
    label: product.name,
    path: `/product/${product.link_slug}`,
    productData: product
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
                    onClick={() => handleEditProduct(link.productData)}
                    title="Edit Product"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleViewInteractions(link.productData)}
                    title="View Interactions"
                  >
                    <Eye className="h-4 w-4" />
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

            {/* Add Product Button */}
            <AddProductDialog onProductAdded={fetchProducts} />
          </div>
        )}
      </div>

      {/* Edit Product Dialog */}
      <EditProductDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        product={editingProduct}
        onProductUpdated={fetchProducts}
      />

      {/* View Interactions Dialog */}
      <Dialog open={showInteractionsDialog} onOpenChange={setShowInteractionsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Customer Interactions - {viewingInteractions?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            {interactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No interactions yet</p>
            ) : (
              <div className="space-y-4">
                {interactions.map((interaction) => (
                  <div key={interaction.id} className="border border-border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(interaction.timestamp).toLocaleString()}
                        </p>
                        <p className="text-sm font-medium">
                          Duration: {Math.floor(interaction.duration / 60)}m {interaction.duration % 60}s
                        </p>
                        <p className="text-sm">
                          Outcome: <span className="capitalize">{interaction.outcome}</span>
                        </p>
                      </div>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {interaction.call_id}
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1">Transcript:</p>
                      <p className="text-sm bg-muted/50 p-3 rounded whitespace-pre-wrap">
                        {interaction.transcript || "No transcript available"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CopyableLinks;
