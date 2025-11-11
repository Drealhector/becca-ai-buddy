import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState("");
  const [interactions, setInteractions] = useState<any[]>([]);
  const [showInteractions, setShowInteractions] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showVoice, setShowVoice] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    if (showChat || showVoice) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/index.js';
      script.async = true;
      script.onload = () => initializeVapi();
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [showChat, showVoice, agentId]);

  const initializeVapi = () => {
    if (!(window as any).Vapi || !agentId) return;

    const vapi = new (window as any).Vapi({
      apiKey: 'cb6d31db-2209-4ffa-ac27-794c02fcd8ec',
      assistant: agentId
    });

    vapi.start();
  };

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("link_slug", slug)
        .single();

      if (error) throw error;
      setProduct(data);

      // Fetch agent ID
      const { data: agentData } = await supabase
        .from("ai_agents")
        .select("*")
        .eq("product_id", data.id)
        .single();

      if (agentData) {
        setAgentId(agentData.assistant_id);
      }

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

          {/* Interaction Balls */}
          <div className="flex gap-8 mt-8 items-center">
            {/* Chat Ball */}
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 animate-[swing_3s_ease-in-out_infinite]">
                <div 
                  onClick={() => setShowChat(true)}
                  className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 shadow-glow flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                >
                  <span className="text-white font-bold text-sm">Chat</span>
                </div>
              </div>
            </div>

            {/* Voice Ball */}
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 animate-[swing_3s_ease-in-out_infinite_1.5s]">
                <div 
                  onClick={() => setShowVoice(true)}
                  className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 via-green-600 to-green-700 shadow-glow flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                >
                  <span className="text-white font-bold text-sm">Voice</span>
                </div>
              </div>
            </div>
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

      {/* Interactions Dialog */}
      <Dialog open={showInteractions} onOpenChange={setShowInteractions}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Interactions</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {interactions.map((interaction) => (
                <div key={interaction.id} className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium">
                      {new Date(interaction.timestamp).toLocaleString()}
                    </span>
                    <span className="text-xs bg-primary/20 px-2 py-1 rounded">
                      {Math.floor(interaction.duration / 60)}:{(interaction.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {interaction.transcript}
                  </p>
                  <span className="text-xs text-muted-foreground mt-2 block">
                    Outcome: {interaction.outcome}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="max-w-2xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Chat with AI Assistant</DialogTitle>
          </DialogHeader>
          <div id="vapi-chat-widget" className="flex-1"></div>
        </DialogContent>
      </Dialog>

      {/* Voice Dialog */}
      <Dialog open={showVoice} onOpenChange={setShowVoice}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Voice Call with AI Assistant</DialogTitle>
          </DialogHeader>
          <div id="vapi-voice-widget" className="p-8 text-center">
            <p className="text-muted-foreground">Connecting to voice assistant...</p>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes swing {
          0%, 100% {
            transform: translateX(-15px) rotate(-5deg);
          }
          50% {
            transform: translateX(15px) rotate(5deg);
          }
        }
      `}</style>
    </div>
  );
};

export default ProductPage;
