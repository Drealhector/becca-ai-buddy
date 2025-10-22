import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const channels = [
  { key: "whatsapp_n8n_webhook_url", label: "WhatsApp" },
  { key: "instagram_n8n_webhook_url", label: "Instagram" },
  { key: "facebook_n8n_webhook_url", label: "Facebook" },
  { key: "telegram_n8n_webhook_url", label: "Telegram" },
];

const ConnectionStatus = () => {
  const [connections, setConnections] = useState<any>({});
  const [vapiAssistantId, setVapiAssistantId] = useState("");
  const [vapiPublicKey, setVapiPublicKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const { data } = await supabase
        .from("connections")
        .select("*")
        .limit(1)
        .single();
      setConnections(data || {});
      setVapiAssistantId(data?.vapi_assistant_id || "");
      setVapiPublicKey(data?.vapi_public_key || "");
    } catch (error) {
      console.error("Error fetching connections:", error);
    }
  };

  const handleSaveVapiId = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("connections")
        .update({ 
          vapi_assistant_id: vapiAssistantId,
          vapi_public_key: vapiPublicKey 
        })
        .eq("id", connections.id);
      
      if (error) throw error;
      
      toast.success("Vapi configuration saved successfully");
      fetchConnections();
    } catch (error) {
      console.error("Error saving Vapi config:", error);
      toast.error("Failed to save Vapi configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnect = (channel: string) => {
    toast.info(`Connect ${channel} via backend configuration`);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Connection Status</h3>
      
      {/* Vapi Configuration */}
      <div className="mb-6 p-4 border rounded-lg bg-muted/50">
        <h4 className="font-medium mb-3">Vapi Voice Assistant</h4>
        <div className="space-y-3">
          <div>
            <Label className="text-sm mb-2">Assistant ID</Label>
            <Input
              placeholder="Enter Vapi Assistant ID"
              value={vapiAssistantId}
              onChange={(e) => setVapiAssistantId(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm mb-2">Public Key</Label>
            <Input
              placeholder="Enter Vapi Public Key"
              value={vapiPublicKey}
              onChange={(e) => setVapiPublicKey(e.target.value)}
              type="password"
            />
          </div>
          <Button 
            onClick={handleSaveVapiId}
            disabled={isSaving || (!vapiAssistantId && !vapiPublicKey)}
            className="w-full"
          >
            {isSaving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
        {(connections.vapi_assistant_id || connections.vapi_public_key) && (
          <div className="mt-3 space-y-1">
            {connections.vapi_assistant_id && (
              <Badge variant="default">
                Assistant: {connections.vapi_assistant_id.slice(0, 8)}...
              </Badge>
            )}
            {connections.vapi_public_key && (
              <Badge variant="default" className="ml-2">
                Key Configured ✓
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {channels.map((channel) => {
          const isConnected = !!connections[channel.key];
          return (
            <div key={channel.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{channel.label}</span>
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnected ? "Connected" : "Not Connected"}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleConnect(channel.label)}
              >
                {isConnected ? "Manage" : "Connect"}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ConnectionStatus;