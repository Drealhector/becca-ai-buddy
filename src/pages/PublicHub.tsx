import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, Mic } from "lucide-react";

const PublicHub = () => {
  const { slug } = useParams<{ slug: string }>();
  const [customization, setCustomization] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomization();
  }, []);

  const fetchCustomization = async () => {
    try {
      const { data, error } = await supabase
        .from("customizations")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      setCustomization(data);
    } catch (error) {
      console.error("Error fetching customization:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSocialLink = (platform: string) => {
    switch (platform) {
      case "telegram":
        return customization?.telegram_username
          ? `https://t.me/${customization.telegram_username}`
          : "#";
      default:
        return "#";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Avatar */}
        <div className="text-center mb-8">
          {customization?.logo_url ? (
            <img
              src={customization.logo_url}
              alt="Business Logo"
              className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white shadow-elegant"
            />
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white shadow-elegant">
              <span className="text-4xl">🤖</span>
            </div>
          )}
          <h1 className="text-3xl font-bold text-white mb-2">
            {customization?.business_name || "Business Name"}
          </h1>
          <p className="text-white/90 text-lg">
            {customization?.greeting || "Welcome to our AI assistant!"}
          </p>
        </div>

        {/* Action Tiles */}
        <div className="space-y-4 animate-fade-in">
          <Link to={`/chat/${slug}`}>
            <Button
              variant="secondary"
              className="w-full h-16 text-lg bg-white hover:bg-white/90 text-primary shadow-elegant hover:shadow-hover transition-all"
            >
              <MessageSquare className="mr-2 h-6 w-6" />
              Chat with {customization?.business_name || slug || "us"}
            </Button>
          </Link>

          <Link to={`/call/${slug}`}>
            <Button
              variant="secondary"
              className="w-full h-16 text-lg bg-white hover:bg-white/90 text-primary shadow-elegant hover:shadow-hover transition-all"
            >
              <Phone className="mr-2 h-6 w-6" />
              Call {customization?.business_name || slug || "us"}
            </Button>
          </Link>
        </div>

        {/* Floating Bubble */}
        <Link
          to={`/call/${slug}`}
          className="fixed bottom-6 right-6 w-16 h-16 bg-white rounded-full shadow-glow flex items-center justify-center hover:scale-110 transition-all animate-bounce"
        >
          <Mic className="h-8 w-8 text-primary" />
        </Link>
      </div>
    </div>
  );
};

export default PublicHub;