import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BotConfig {
  botActive: boolean;
  personality: string;
  tone: string;
  character: string;
}

interface Message {
  id: number;
  user_phone: string;
  message_text: string;
  sender_type: string;
  timestamp: string;
}

const WhatsAppBotControl = () => {
  const [config, setConfig] = useState<BotConfig>({
    botActive: true,
    personality: "helpful and friendly",
    tone: "professional",
    character: "polite and informative",
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  useEffect(() => {
    fetchBotConfig();
    fetchRecentMessages();

    // Auto-refresh messages every 10 seconds
    const interval = setInterval(() => {
      fetchRecentMessages();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchBotConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("bot_config")
        .select("*")
        .limit(1)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setConfig({
          botActive: data.bot_active ?? true,
          personality: data.personality || "helpful and friendly",
          tone: data.tone || "professional",
          character: data.character || "polite and informative",
        });
      }
    } catch (error) {
      console.error("Error fetching config:", error);
      toast.error("Could not load bot configuration");
    }
  };

  const fetchRecentMessages = async () => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      if (data) {
        setMessages(data);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("bot_config")
        .update({
          bot_active: config.botActive,
          personality: config.personality,
          tone: config.tone,
          character: config.character,
        })
        .eq("id", 1);

      if (error) throw error;

      toast.success("Bot configuration saved! n8n will use these settings.");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Could not save bot configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            WhatsApp Bot Control
          </CardTitle>
          <CardDescription>
            Configure your WhatsApp bot's personality and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Bot Status</Label>
              <p className="text-sm text-muted-foreground">
                {config.botActive ? "Active" : "Inactive"}
              </p>
            </div>
            <Switch
              checked={config.botActive}
              onCheckedChange={(checked) =>
                setConfig({ ...config, botActive: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personality">Personality</Label>
            <Input
              id="personality"
              value={config.personality}
              onChange={(e) =>
                setConfig({ ...config, personality: e.target.value })
              }
              placeholder="e.g., friendly and enthusiastic"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone">Tone</Label>
            <Input
              id="tone"
              value={config.tone}
              onChange={(e) => setConfig({ ...config, tone: e.target.value })}
              placeholder="e.g., casual, professional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="character">Character</Label>
            <Input
              id="character"
              value={config.character}
              onChange={(e) =>
                setConfig({ ...config, character: e.target.value })
              }
              placeholder="e.g., humorous and witty"
            />
          </div>

          <Button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Messages</CardTitle>
              <CardDescription>Last 5 WhatsApp interactions</CardDescription>
            </div>
            {isLoadingMessages && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No messages yet
            </p>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{message.user_phone}</p>
                      <p className="text-sm text-muted-foreground">
                        {message.message_text}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        message.sender_type === "bot"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary/10 text-secondary-foreground"
                      }`}
                    >
                      {message.sender_type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(message.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppBotControl;
