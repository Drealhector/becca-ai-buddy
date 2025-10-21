import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageCircle, Instagram, Facebook, Send } from "lucide-react";

const channels = [
  { key: "whatsapp_on", label: "WhatsApp", icon: MessageCircle, color: "text-green-600" },
  { key: "instagram_on", label: "Instagram", icon: Instagram, color: "text-pink-600" },
  { key: "facebook_on", label: "Facebook", icon: Facebook, color: "text-blue-600" },
  { key: "telegram_on", label: "Telegram", icon: Send, color: "text-sky-600" },
];

const ChannelToggles = () => {
  const [toggles, setToggles] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchToggles();
  }, []);

  const fetchToggles = async () => {
    try {
      const { data, error } = await supabase
        .from("toggles")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      setToggles(data || {});
    } catch (error) {
      console.error("Error fetching toggles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: string, checked: boolean) => {
    try {
      const { error } = await supabase
        .from("toggles")
        .update({ [key]: checked })
        .eq("id", toggles.id);

      if (error) throw error;

      setToggles({ ...toggles, [key]: checked });
      toast.success(`${channels.find(c => c.key === key)?.label} ${checked ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error updating toggle:", error);
      toast.error("Failed to update toggle");
    }
  };

  if (loading) return null;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Channel Controls</h3>
      <div className="space-y-4">
        {channels.map((channel) => {
          const Icon = channel.icon;
          return (
            <div key={channel.key} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${channel.color}`} />
                <span className="font-medium">{channel.label}</span>
              </div>
              <Switch
                checked={toggles[channel.key] || false}
                onCheckedChange={(checked) => handleToggle(channel.key, checked)}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ChannelToggles;