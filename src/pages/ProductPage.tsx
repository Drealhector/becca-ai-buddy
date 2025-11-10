import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

          {/* Pendulum Ball */}
          <div className="relative w-32 h-32 mt-8">
            <div className="absolute inset-0 animate-[swing_3s_ease-in-out_infinite]">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary via-accent to-primary shadow-glow flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                <span className="text-white font-bold text-sm">Learn More</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
