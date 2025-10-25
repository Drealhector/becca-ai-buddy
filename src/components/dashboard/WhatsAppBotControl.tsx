import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { MessageSquare, Loader2 } from "lucide-react";

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

  const WEBHOOKS = {
    UPDATE_CONFIG: "https://hector4all.app.n8n.cloud/webhook/update-bot-config",
    GET_CONFIG: "https://hector4all.app.n8n.cloud/webhook/get-bot-config",
    GET_MESSAGES: "https://hector4all.app.n8n.cloud/webhook/get-recent-messages",
  };

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
      console.log("Fetching bot config from:", WEBHOOKS.GET_CONFIG);
      const response = await fetch(WEBHOOKS.GET_CONFIG, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        mode: "cors",
      });

      console.log("Config response status:", response.status);
      const responseText = await response.text();
      console.log("Config response body:", responseText);

      if (response.ok) {
        const data = JSON.parse(responseText);
        if (data) {
          setConfig({
            botActive: data.bot_active ?? data.botActive ?? true,
            personality: data.personality ?? "helpful and friendly",
            tone: data.tone ?? "professional",
            character: data.character ?? "polite and informative",
          });
        }
      } else {
        console.error("Config fetch failed with status:", response.status);
      }
    } catch (error) {
      console.error("Error fetching bot config:", error);
      toast.error("Cannot connect to n8n. Make sure workflow is ACTIVE.");
    }
  };

  const fetchRecentMessages = async () => {
    setIsLoadingMessages(true);
    try {
      console.log("Fetching messages from:", WEBHOOKS.GET_MESSAGES);
      const response = await fetch(WEBHOOKS.GET_MESSAGES, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        mode: "cors",
      });

      console.log("Messages response status:", response.status);
      const responseText = await response.text();
      console.log("Messages response body:", responseText);

      if (response.ok) {
        const data = JSON.parse(responseText);
        setMessages(data || []);
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
      console.log("Saving config to:", WEBHOOKS.UPDATE_CONFIG);
      const payload = {
        botActive: config.botActive,
        personality: config.personality,
        tone: config.tone,
        character: config.character,
      };
      console.log("Payload:", payload);

      const response = await fetch(WEBHOOKS.UPDATE_CONFIG, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "cors",
        body: JSON.stringify(payload),
      });

      console.log("Save response status:", response.status);
      const responseText = await response.text();
      console.log("Save response body:", responseText);

      if (response.ok) {
        toast.success("Bot configuration saved successfully!");
      } else {
        toast.error(`Failed to save: ${response.status}. Is n8n workflow ACTIVE?`);
      }
    } catch (error) {
      console.error("Error saving bot config:", error);
      toast.error("Cannot connect to n8n. Make sure workflow is ACTIVE.");
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
