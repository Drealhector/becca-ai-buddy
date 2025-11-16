import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductChat from "@/components/chat/ProductChat";

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [showInteractions, setShowInteractions] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("link_slug", slug)
        .single();

      if (error) throw error;
      setProduct(data);

      // Fetch interactions
      const { data: interactionsData } = await supabase
        .from("customer_interactions")
        .select("*")
        .eq("product_id", data.id)
        .order("timestamp", { ascending: false });

      if (interactionsData) {
        setInteractions(interactionsData);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
        <p className="text-foreground text-xl">Product not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-4xl relative">
        {/* Product Image Background */}
        <div className="absolute inset-0 z-0">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover opacity-20 blur-2xl"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh]">
          <div className="mb-12">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-64 h-64 object-cover rounded-2xl shadow-elegant border-4 border-white/20"
            />
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 text-center">
            {product.name}
          </h1>
          
          {product.description && (
            <p className="text-white/90 text-lg text-center mb-8 max-w-2xl">
              {product.description}
            </p>
          )}

          {/* Learn More Button */}
          <div className="relative mt-8">
            <button
              onClick={() => setShowChat(true)}
              className="group relative w-40 h-40 rounded-full bg-primary/20 backdrop-blur-md border-2 border-primary flex items-center justify-center hover:scale-110 transition-all duration-300 animate-float shadow-[0_0_30px_rgba(139,92,246,0.3)]"
            >
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse"></div>
              <div className="relative flex flex-col items-center gap-2">
                <svg
                  className="w-16 h-16 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-primary font-semibold">Learn More</span>
              </div>
            </button>
          </div>

          {/* View Interactions Button */}
          {interactions.length > 0 && (
            <button
              onClick={() => setShowInteractions(true)}
              className="mt-8 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm transition-all"
            >
              View Interactions ({interactions.length})
            </button>
          )}
        </div>
      </div>

      {/* Chat Dialog */}
      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="max-w-2xl h-[80vh] p-0">
          <ProductChat
            productId={product.id}
            productName={product.name}
            salesInstructions={product.sales_instructions}
            onClose={() => setShowChat(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Interactions Dialog */}
      <Dialog open={showInteractions} onOpenChange={setShowInteractions}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Customer Interactions</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {interactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No interactions yet</p>
            ) : (
              <div className="space-y-4">
                {interactions.map((interaction) => (
                  <div key={interaction.id} className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(interaction.timestamp).toLocaleString()}
                        </p>
                        {interaction.duration && (
                          <p className="text-sm text-muted-foreground">
                            Duration: {Math.floor(interaction.duration / 60)}m {interaction.duration % 60}s
                          </p>
                        )}
                      </div>
                      {interaction.outcome && (
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                          {interaction.outcome}
                        </span>
                      )}
                    </div>
                    {interaction.transcript && (
                      <div className="mt-2">
                        <p className="text-sm font-semibold mb-1">Transcript:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {interaction.transcript}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ProductPage;
