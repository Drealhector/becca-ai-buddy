import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Eye } from "lucide-react";
import hubBackground from "@/assets/hub-background.jpg";
import { EditProductDialog } from "@/components/dashboard/EditProductDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const PublicHub = () => {
  const { slug } = useParams<{ slug: string }>();
  const [customization, setCustomization] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [viewingInteractions, setViewingInteractions] = useState<any>(null);
  const [showInteractionsDialog, setShowInteractionsDialog] = useState(false);
  const [interactions, setInteractions] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: customData, error: customError } = await supabase
        .from("customizations")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (customError) throw customError;
      setCustomization(customData);

      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .order('created_at', { ascending: false });

      if (productError) throw productError;
      setProducts(productData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const links = [
    { 
      label: "Chat", 
      path: `/chat/${slug}`, 
      icon: "💬",
      image: null
    },
    { 
      label: "Call", 
      path: `/call/${slug}`, 
      icon: "📞",
      image: null
    },
    { 
      label: `WhatsApp/${slug}`, 
      path: customization?.whatsapp_username ? `https://wa.me/${customization.whatsapp_username}` : "#", 
      icon: null,
      image: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
    },
    { 
      label: `Instagram/${slug}`, 
      path: customization?.instagram_username ? `https://instagram.com/${customization.instagram_username}` : "#", 
      icon: null,
      image: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg"
    },
    { 
      label: `Facebook/${slug}`, 
      path: customization?.facebook_username ? `https://facebook.com/${customization.facebook_username}` : "#", 
      icon: null,
      image: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg"
    },
    { 
      label: `Telegram/${slug}`, 
      path: customization?.telegram_username ? `https://t.me/${customization.telegram_username}` : "#", 
      icon: null,
      image: "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"
    },
  ];

  const productLinks = products.map(product => ({
    label: product.name,
    path: `/product/${product.link_slug}`,
    icon: null,
    image: product.image_url,
    isProduct: true,
    productData: product
  }));

  const allLinks = [...links, ...productLinks];

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${hubBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-gradient-dark/80" />
      
      <div className="w-full max-w-3xl relative z-10">
        {/* Logo/Avatar */}
        <div className="text-center mb-12">
          {customization?.logo_url ? (
            <img
              src={customization.logo_url}
              alt="Business Logo"
              className="w-32 h-32 rounded-full mx-auto mb-6 border-4 border-white/20 shadow-elegant"
            />
          ) : (
            <div className="w-32 h-32 rounded-full mx-auto mb-6 bg-white/10 backdrop-blur-sm flex items-center justify-center border-4 border-white/20 shadow-elegant">
              <span className="text-5xl">🤖</span>
            </div>
          )}
          <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">
            {customization?.business_name || "Business Name"}
          </h1>
          <p className="text-white/90 text-xl">
            {customization?.greeting || "Welcome to our AI assistant!"}
          </p>
        </div>

        {/* Spacebar-style Link Buttons */}
        <div className="space-y-4 animate-fade-in">
          {allLinks.map((link, index) => {
            const isExternal = link.path.startsWith('http');
            
            const buttonContent = (
              <div className="relative group">
                {/* Spacebar Button */}
                <div className="bg-gradient-to-b from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border-2 border-gray-600 rounded-2xl shadow-[0_4px_0_0_rgba(0,0,0,0.3),0_8px_16px_-4px_rgba(0,0,0,0.5)] hover:shadow-[0_2px_0_0_rgba(0,0,0,0.3),0_4px_12px_-4px_rgba(0,0,0,0.5)] active:shadow-[0_1px_0_0_rgba(0,0,0,0.3),0_2px_8px_-4px_rgba(0,0,0,0.5)] transition-all duration-150 active:translate-y-1 p-4 flex items-center gap-4 min-h-[80px]">
                  {/* Icon/Image on left edge */}
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                    {link.image ? (
                      <img 
                        src={link.image} 
                        alt={link.label}
                        className="w-10 h-10 object-contain rounded"
                      />
                    ) : (
                      <span className="text-3xl">{link.icon}</span>
                    )}
                  </div>
                  
                  {/* Label */}
                  <div className="flex-1">
                    <p className="text-white text-lg font-semibold tracking-wide">
                      {link.label}
                    </p>
                  </div>

                  {/* Product Actions */}
                  {(link as any).isProduct && (
                    <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProduct((link as any).productData);
                        }}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        title="Edit Product"
                      >
                        <Edit className="h-4 w-4 text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewInteractions((link as any).productData);
                        }}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        title="View Interactions"
                      >
                        <Eye className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  )}

                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
                </div>
              </div>
            );

            return isExternal ? (
              <a
                key={index}
                href={link.path}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                {buttonContent}
              </a>
            ) : (
              <Link
                key={index}
                to={link.path}
                className="block w-full"
              >
                {buttonContent}
              </Link>
            );
          })}
        </div>
      </div>

      <EditProductDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        product={editingProduct}
        onProductUpdated={fetchData}
      />

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
    </div>
  );
};

export default PublicHub;
