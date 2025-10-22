import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Instagram, Facebook, MessageCircle } from "lucide-react";
import WebChatWidget from "@/components/chat/WebChatWidget";
import { supabase } from "@/integrations/supabase/client";

const ChatPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [customization, setCustomization] = useState<any>(null);

  useEffect(() => {
    fetchCustomization();
  }, []);

  const fetchCustomization = async () => {
    try {
      const { data } = await supabase
        .from("customizations")
        .select("*")
        .limit(1)
        .maybeSingle();
      setCustomization(data);
    } catch (error) {
      console.error("Error fetching customization:", error);
    }
  };

  const handleSocialClick = (platform: string) => {
    let link = "#";
    switch (platform) {
      case "instagram":
        link = customization?.instagram_username
          ? `https://instagram.com/${customization.instagram_username}`
          : "https://instagram.com";
        break;
      case "facebook":
        link = customization?.facebook_username
          ? `https://facebook.com/${customization.facebook_username}`
          : "https://facebook.com";
        break;
      case "whatsapp":
        link = customization?.whatsapp_username
          ? `https://wa.me/${customization.whatsapp_username}`
          : "https://whatsapp.com";
        break;
    }
    window.open(link, "_blank");
  };

  if (!selectedChannel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Where do you want to chat?
            </h1>
            <p className="text-white/80">Choose your preferred platform</p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => setSelectedChannel("web")}
              className="w-full h-16 text-lg bg-white hover:bg-white/90 text-primary"
            >
              <MessageSquare className="mr-2 h-6 w-6" />
              Web Chat
            </Button>

            <Button
              onClick={() => handleSocialClick("instagram")}
              className="w-full h-16 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 shadow-elegant"
            >
              <Instagram className="mr-2 h-6 w-6" />
              Chat on Instagram
            </Button>

            <Button
              onClick={() => handleSocialClick("facebook")}
              className="w-full h-16 text-lg bg-blue-600 hover:bg-blue-700 shadow-elegant"
            >
              <Facebook className="mr-2 h-6 w-6" />
              Chat on Facebook
            </Button>

            <Button
              onClick={() => handleSocialClick("whatsapp")}
              className="w-full h-16 text-lg bg-green-600 hover:bg-green-700 shadow-elegant"
            >
              <MessageCircle className="mr-2 h-6 w-6" />
              Chat on WhatsApp
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedChannel === "web") {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary p-4">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold text-white mb-4">
              {customization?.business_name || "BECCA"}
            </h1>
            <p className="text-white/80 text-lg">
              {customization?.greeting || "How can I help you today?"}
            </p>
          </div>
        </div>
        <WebChatWidget customization={customization} onClose={() => setSelectedChannel(null)} />
      </>
    );
  }

  return null;
};

export default ChatPage;