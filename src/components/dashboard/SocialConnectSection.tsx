import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Security: uses getStatus() to avoid leaking raw API tokens to frontend
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageCircle, Instagram, Facebook, Send, CheckCircle, AlertCircle, Copy, ExternalLink, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL;

const channels = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    tokenField: "whatsapp_access_token" as const,
    fields: [
      { key: "whatsapp_access_token", label: "Access Token", type: "password", placeholder: "Paste your WhatsApp access token" },
      { key: "whatsapp_phone_number_id", label: "Phone Number ID", type: "text", placeholder: "e.g. 123456789012345" },
    ],
    steps: [
      "Go to developers.facebook.com and open your app",
      "Click WhatsApp → API Setup in the sidebar",
      "Copy the 'Temporary access token' (or generate a permanent one)",
      "Copy the 'Phone number ID' shown below the token",
      "Paste both below and click Connect",
    ],
    helpUrl: "https://developers.facebook.com/apps/",
    webhookUrl: `${CONVEX_SITE_URL}/whatsapp`,
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: Instagram,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    tokenField: "instagram_access_token" as const,
    fields: [
      { key: "instagram_access_token", label: "Page Access Token", type: "password", placeholder: "Paste your Instagram access token" },
    ],
    steps: [
      "Go to developers.facebook.com and open your app",
      "Click Instagram → API Setup in the sidebar",
      "Click 'Generate Token' for your Instagram account",
      "Copy the token and paste it below",
    ],
    helpUrl: "https://developers.facebook.com/apps/",
    webhookUrl: `${CONVEX_SITE_URL}/instagram`,
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: Facebook,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    tokenField: "facebook_access_token" as const,
    fields: [
      { key: "facebook_access_token", label: "Page Access Token", type: "password", placeholder: "Paste your Facebook Page access token" },
    ],
    steps: [
      "Go to developers.facebook.com and open your app",
      "Click Messenger → Settings in the sidebar",
      "Under 'Access Tokens', click 'Generate Token' for your Page",
      "Copy the token and paste it below",
    ],
    helpUrl: "https://developers.facebook.com/apps/",
    webhookUrl: `${CONVEX_SITE_URL}/instagram`,
  },
  {
    key: "telegram",
    label: "Telegram",
    icon: Send,
    color: "text-sky-500",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30",
    tokenField: "telegram_bot_token" as const,
    fields: [
      { key: "telegram_bot_token", label: "Bot Token", type: "password", placeholder: "e.g. 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" },
    ],
    steps: [
      "Open Telegram and search for @BotFather",
      "Send /newbot and follow the prompts",
      "Choose a name (e.g. 'Becca Assistant')",
      "Choose a username (e.g. 'becca_assistant_bot')",
      "BotFather will give you a token — paste it below",
    ],
    helpUrl: "https://t.me/BotFather",
    webhookUrl: `${CONVEX_SITE_URL}/telegram`,
  },
];

const SocialConnectSection = () => {
  const [connectingChannel, setConnectingChannel] = useState<typeof channels[0] | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Use getStatus() to avoid leaking raw tokens to frontend
  const connections = useQuery(api.connections.getStatus, {});
  const updateConnections = useMutation(api.connections.update);

  const connectedFlags: Record<string, string> = {
    whatsapp_access_token: "whatsapp_connected",
    instagram_access_token: "instagram_connected",
    facebook_access_token: "facebook_connected",
    telegram_bot_token: "telegram_connected",
  };

  const isConnected = (channel: typeof channels[0]) => {
    if (!connections) return false;
    const flag = connectedFlags[channel.tokenField];
    return !!(connections as any)?.[flag];
  };

  const handleConnect = (channel: typeof channels[0]) => {
    setConnectingChannel(channel);
    setCurrentStep(0);
    // Tokens are no longer returned — fields start empty for new entry
    setFormValues({});
  };

  const handleSave = async () => {
    if (!connectingChannel || !connections?._id) return;
    setSaving(true);
    try {
      await updateConnections({ id: connections._id, ...formValues } as any);

      // Auto-set Telegram webhook
      if (connectingChannel.key === "telegram" && formValues.telegram_bot_token) {
        const webhookUrl = `${CONVEX_SITE_URL}/telegram`;
        await fetch(`https://api.telegram.org/bot${formValues.telegram_bot_token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
      }

      toast.success(`${connectingChannel.label} connected successfully!`);
      setConnectingChannel(null);
      setFormValues({});
    } catch (error) {
      console.error("Error saving connection:", error);
      toast.error("Failed to save connection");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  return (
    <>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2">Connect Your Channels</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Let BECCA respond to your customers automatically on every platform.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const connected = isConnected(channel);
            return (
              <button
                key={channel.key}
                onClick={() => handleConnect(channel)}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all hover:scale-[1.02] ${
                  connected
                    ? `${channel.borderColor} ${channel.bgColor}`
                    : "border-border hover:border-primary/30 hover:bg-muted/50"
                }`}
              >
                <div className={`p-2.5 rounded-lg ${channel.bgColor}`}>
                  <Icon className={`h-5 w-5 ${channel.color}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{channel.label}</p>
                  {connected ? (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-500">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Tap to connect</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </Card>

      {/* Connect Dialog — Step-by-step wizard */}
      <Dialog open={!!connectingChannel} onOpenChange={() => setConnectingChannel(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {connectingChannel && (
                <>
                  <div className={`p-1.5 rounded-lg ${connectingChannel.bgColor}`}>
                    <connectingChannel.icon className={`h-4 w-4 ${connectingChannel.color}`} />
                  </div>
                  Connect {connectingChannel.label}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {connectingChannel && (
            <div className="space-y-5">
              {/* Step indicator */}
              <div className="flex items-center gap-1">
                {["Setup", "Connect"].map((label, i) => (
                  <div key={label} className="flex items-center gap-1 flex-1">
                    <div className={`h-1.5 rounded-full flex-1 transition-colors ${
                      i <= currentStep ? "bg-primary" : "bg-muted"
                    }`} />
                  </div>
                ))}
              </div>

              {currentStep === 0 && (
                <>
                  {/* Instructions */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Follow these steps:</p>
                    <div className="space-y-2">
                      {connectingChannel.steps.map((step, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Open help link */}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => window.open(connectingChannel.helpUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {connectingChannel.key === "telegram"
                      ? "Open BotFather in Telegram"
                      : "Open Meta Developer Dashboard"
                    }
                  </Button>

                  <Button className="w-full" onClick={() => setCurrentStep(1)}>
                    I have my {connectingChannel.key === "telegram" ? "bot token" : "access token"} ready
                  </Button>
                </>
              )}

              {currentStep === 1 && (
                <>
                  {/* Token input fields */}
                  <div className="space-y-4">
                    {connectingChannel.fields.map((field) => (
                      <div key={field.key}>
                        <label className="text-sm font-medium mb-1.5 block">{field.label}</label>
                        <Input
                          type={field.type}
                          value={formValues[field.key] || ""}
                          onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Webhook URL — user needs this for Meta webhook config */}
                  {connectingChannel.key !== "telegram" && (
                    <div className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Webhook URL (paste in Meta dashboard)</p>
                      <div className="flex gap-2">
                        <code className="text-xs bg-background px-2 py-1 rounded border flex-1 overflow-hidden text-ellipsis">
                          {connectingChannel.webhookUrl}
                        </code>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(connectingChannel.webhookUrl, "Webhook URL")}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex gap-2 items-center mt-1">
                        <p className="text-xs text-muted-foreground">Verify Token:</p>
                        <code className="text-xs bg-background px-2 py-0.5 rounded border">becca-brain-verify</code>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => copyToClipboard("becca-brain-verify", "Verify token")}>
                          <Copy className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentStep(0)} className="flex-1">
                      Back
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving || !connectingChannel.fields.some((f) => formValues[f.key])}
                      className="flex-1"
                    >
                      {saving ? "Connecting..." : `Connect ${connectingChannel.label}`}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SocialConnectSection;
