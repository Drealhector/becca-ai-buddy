import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const channels = [
  { key: "whatsapp_n8n_webhook_url", label: "WhatsApp" },
  { key: "instagram_n8n_webhook_url", label: "Instagram" },
  { key: "facebook_n8n_webhook_url", label: "Facebook" },
  { key: "telegram_n8n_webhook_url", label: "Telegram" },
];

const ConnectionStatus = () => {
  const [connections, setConnections] = useState<any>({});

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
    } catch (error) {
      console.error("Error fetching connections:", error);
    }
  };

  const handleConnect = (channel: string) => {
    toast.info(`Connect ${channel} via backend configuration`);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Connection Status</h3>
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