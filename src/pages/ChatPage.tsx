import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Instagram, Facebook, MessageCircle } from "lucide-react";
import WebChat from "@/components/chat/WebChat";
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
        .single();
      setCustomization(data);
    } catch (error) {
      console.error("Error fetching customization:", error);
    }
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
              onClick={() => window.open("https://instagram.com", "_blank")}
              className="w-full h-16 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
            >
              <Instagram className="mr-2 h-6 w-6" />
              Instagram
            </Button>

            <Button
              onClick={() => window.open("https://facebook.com", "_blank")}
              className="w-full h-16 text-lg bg-blue-600 hover:bg-blue-700"
            >
              <Facebook className="mr-2 h-6 w-6" />
              Facebook
            </Button>

            <Button
              onClick={() => window.open("https://whatsapp.com", "_blank")}
              className="w-full h-16 text-lg bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="mr-2 h-6 w-6" />
              WhatsApp
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedChannel === "web") {
    return <WebChat slug={slug || "default"} customization={customization} />;
  }

  return null;
};

export default ChatPage;