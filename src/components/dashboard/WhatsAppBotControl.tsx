import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Power, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BotConfig {
  id: number;
  is_enabled: boolean;
  system_prompt: string;
  tone: string;
  character: string;
  model: string;
}

interface Message {
  id: number;
  user_phone: string;
  message_text: string;
  sender_type: string;
  timestamp: string;
}

const SYSTEM_PROMPT_TEMPLATES = [
  "You are a friendly customer support assistant. Be helpful, patient, and professional.",
  "You are a witty companion who loves to joke around while being helpful.",
  "You are a professional business assistant. Be concise, formal, and efficient.",
];

const WhatsAppBotControl = () => {
  const [config, setConfig] = useState<BotConfig>({
    id: 1,
    is_enabled: true,
    system_prompt: "",
    tone: "",
    character: "",
    model: "gpt-4o-mini",
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  useEffect(() => {
    fetchBotConfig();
    fetchRecentMessages();
    const interval = setInterval(fetchRecentMessages, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchBotConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("bot_config")
        .select("*")
        .eq("id", 1)
        .single();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          is_enabled: data.is_enabled ?? true,
          system_prompt: data.system_prompt ?? "",
          tone: data.tone ?? "",
          character: data.character ?? "",
          model: data.model ?? "gpt-4o-mini",
        });
      }
    } catch (error) {
      console.error("Error fetching bot config:", error);
      toast.error("Failed to load bot configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(5);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleToggleBot = async (enabled: boolean) => {
    const newConfig = { ...config, is_enabled: enabled };
    setConfig(newConfig);
    await handleSaveConfig(newConfig);
  };

  const handleSaveConfig = async (configToSave = config) => {
    setIsSaving(true);
    try {
      // Update Supabase
      const { error: supabaseError } = await supabase
        .from("bot_config")
        .update({
          is_enabled: configToSave.is_enabled,
          system_prompt: configToSave.system_prompt,
          tone: configToSave.tone,
          character: configToSave.character,
          model: configToSave.model,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      if (supabaseError) throw supabaseError;

      // Notify n8n webhook
      try {
        console.log("🔔 Calling n8n webhook to update bot config...", configToSave);
        const n8nResponse = await fetch("https://drealhector455.app.n8n.cloud/webhook/update-bot-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            is_enabled: configToSave.is_enabled,
            system_prompt: configToSave.system_prompt,
            tone: configToSave.tone,
            character: configToSave.character,
            model: configToSave.model,
          }),
        });
        console.log("✅ n8n webhook response:", n8nResponse.status, await n8nResponse.text());
      } catch (webhookError) {
        console.error("❌ n8n webhook notification failed:", webhookError);
        // Non-critical, Supabase update already succeeded
      }

      toast.success("Bot configuration updated successfully");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Failed to save bot configuration");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bot Status Toggle - Large and Prominent */}
      <Card className="p-6 border-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Power className={`h-8 w-8 ${config.is_enabled ? "text-green-500" : "text-muted-foreground"}`} />
            <div>
              <h2 className="text-2xl font-bold">WhatsApp Bot</h2>
              <p className="text-sm text-muted-foreground">
                {config.is_enabled ? "Bot is currently active" : "Bot is currently disabled"}
              </p>
            </div>
          </div>
          <Switch
            checked={config.is_enabled}
            onCheckedChange={handleToggleBot}
            disabled={isSaving}
            className="scale-150"
          />
        </div>
      </Card>

      {/* Current Configuration Display */}
      <Card className="p-6 bg-muted/50">
        <h3 className="text-lg font-semibold mb-4">Current Configuration</h3>
        <div className="space-y-3 text-sm">
          <div>
            <span className="font-medium">Status:</span>{" "}
            <span className={config.is_enabled ? "text-green-600" : "text-muted-foreground"}>
              {config.is_enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div>
            <span className="font-medium">Model:</span> {config.model}
          </div>
          <div>
            <span className="font-medium">Tone:</span> {config.tone || "Not set"}
          </div>
          <div>
            <span className="font-medium">Character:</span> {config.character || "Not set"}
          </div>
          <div>
            <span className="font-medium">System Prompt:</span>
            <p className="mt-1 text-muted-foreground italic">
              {config.system_prompt ? `"${config.system_prompt.substring(0, 100)}..."` : "Not set"}
            </p>
          </div>
        </div>
      </Card>

      {/* Personality Editor */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Customize Bot Personality</h2>
        <div className="space-y-5">
          <div>
            <Label htmlFor="system-prompt" className="text-base font-semibold">
              System Prompt *
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Main personality instructions for the AI
            </p>
            <Textarea
              id="system-prompt"
              value={config.system_prompt}
              onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
              placeholder="You are a helpful assistant..."
              rows={5}
              className="resize-none"
            />
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-2">Quick templates:</p>
              <div className="flex flex-wrap gap-2">
                {SYSTEM_PROMPT_TEMPLATES.map((template, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => setConfig({ ...config, system_prompt: template })}
                    className="text-xs"
                  >
                    Template {idx + 1}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="tone" className="text-base font-semibold">
              Tone *
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Conversational tone (e.g., "friendly", "professional", "casual")
            </p>
            <Input
              id="tone"
              value={config.tone}
              onChange={(e) => setConfig({ ...config, tone: e.target.value })}
              placeholder="professional"
            />
          </div>

          <div>
            <Label htmlFor="character" className="text-base font-semibold">
              Character *
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Character traits (e.g., "helpful assistant", "witty companion")
            </p>
            <Input
              id="character"
              value={config.character}
              onChange={(e) => setConfig({ ...config, character: e.target.value })}
              placeholder="helpful assistant"
            />
          </div>

          <div>
            <Label htmlFor="model" className="text-base font-semibold">
              AI Model *
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Choose the OpenAI model to use
            </p>
            <Select value={config.model} onValueChange={(value) => setConfig({ ...config, model: value })}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">GPT-4o (Most Capable)</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini (Recommended)</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Fastest)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => handleSaveConfig()}
            disabled={isSaving || !config.system_prompt || !config.tone || !config.character}
            className="w-full"
            size="lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Bot Personality"
            )}
          </Button>
        </div>
      </Card>

      {/* Recent Messages */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Last 5 Conversations</h2>
        {isLoadingMessages ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No recent messages yet
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`border rounded-lg p-4 space-y-2 ${
                  message.sender_type === "bot" ? "bg-primary/5" : "bg-muted/30"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`font-semibold text-sm ${
                      message.sender_type === "bot" ? "text-primary" : "text-foreground"
                    }`}>
                      {message.sender_type === "user" ? "User" : "Bot"}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {message.user_phone}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{message.message_text}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default WhatsAppBotControl;
