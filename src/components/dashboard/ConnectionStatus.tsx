import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const ConnectionStatus = () => {
  // Use getStatus() instead of get() to avoid leaking raw tokens to frontend
  const connections = useQuery(api.connections.getStatus, {});
  const updateConnections = useMutation(api.connections.update);
  const [telnyxApiKey, setTelnyxApiKey] = useState("");
  const [telnyxPhoneNumber, setTelnyxPhoneNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveTelnyxConfig = async () => {
    if (!connections?._id) return;
    setIsSaving(true);
    try {
      await updateConnections({
        id: connections._id,
        telnyx_api_key: telnyxApiKey,
        telnyx_phone_number: telnyxPhoneNumber,
      });
      setTelnyxApiKey("");
      toast.success("Telnyx configuration saved successfully");
    } catch (error) {
      console.error("Error saving Telnyx config:", error);
      toast.error("Failed to save Telnyx configuration");
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

      {/* Telnyx Configuration */}
      <div className="mb-6 p-4 border rounded-lg bg-muted/50">
        <h4 className="font-medium mb-3">Telnyx Voice Configuration</h4>
        <div className="space-y-3">
          <div>
            <Label className="text-sm mb-2">API Key</Label>
            <Input
              placeholder={connections?.telnyx_configured ? "••••••••  (configured — enter new to change)" : "Enter Telnyx API Key"}
              value={telnyxApiKey}
              onChange={(e) => setTelnyxApiKey(e.target.value)}
              type="password"
            />
          </div>
          <div>
            <Label className="text-sm mb-2">Phone Number</Label>
            <Input
              placeholder="Enter Telnyx Phone Number"
              value={telnyxPhoneNumber}
              onChange={(e) => setTelnyxPhoneNumber(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSaveTelnyxConfig}
            disabled={isSaving || (!telnyxApiKey && !telnyxPhoneNumber)}
            className="w-full"
          >
            {isSaving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
        {(connections?.telnyx_configured || connections?.telnyx_phone_number) && (
          <div className="mt-3 space-y-1">
            {connections.telnyx_phone_number && (
              <Badge variant="default">
                Phone: {connections.telnyx_phone_number}
              </Badge>
            )}
            {connections.telnyx_configured && (
              <Badge variant="default" className="ml-2">
                API Key Configured
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {[
          { key: "whatsapp_connected", label: "WhatsApp" },
          { key: "instagram_connected", label: "Instagram" },
          { key: "facebook_connected", label: "Facebook" },
          { key: "telegram_connected", label: "Telegram" },
        ].map((channel) => {
          const isConnected = !!(connections as any)?.[channel.key];
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
