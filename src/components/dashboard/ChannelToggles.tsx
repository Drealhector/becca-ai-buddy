import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageCircle, Instagram, Facebook, Send } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const channels = [
  { key: "whatsapp_on", label: "WhatsApp", icon: MessageCircle, color: "text-cyan-400" },
  { key: "instagram_on", label: "Instagram", icon: Instagram, color: "text-pink-600" },
  { key: "facebook_on", label: "Facebook", icon: Facebook, color: "text-blue-600" },
  { key: "telegram_on", label: "Telegram", icon: Send, color: "text-sky-600" },
] as const;

const ChannelToggles = () => {
  const toggles = useQuery(api.toggles.get, {});
  const updateToggle = useMutation(api.toggles.update);

  const loading = toggles === undefined;

  const handleToggle = async (key: string, checked: boolean) => {
    if (!toggles?._id) return;
    try {
      await updateToggle({ id: toggles._id, [key]: checked } as any);
      toast.success(`${channels.find(c => c.key === key)?.label} ${checked ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error updating toggle:", error);
      toast.error("Failed to update toggle");
    }
  };

  if (loading) return null;

  const activeCount = channels.filter(c => (toggles as any)?.[c.key]).length;

  return (
    <Card className="p-6 h-full flex flex-col">
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
                checked={(toggles as any)?.[channel.key] || false}
                onCheckedChange={(checked) => handleToggle(channel.key, checked)}
              />
            </div>
          );
        })}
      </div>

      {/* Channel status overview */}
      <div className="mt-auto pt-6 space-y-4">
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent" />

        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40 uppercase tracking-wider">Active Channels</span>
          <span className="text-sm font-semibold text-cyan-400">{activeCount} / {channels.length}</span>
        </div>

        <div className="flex gap-2">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const isActive = (toggles as any)?.[channel.key];
            return (
              <div
                key={channel.key}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-lg border transition-all duration-300 ${
                  isActive
                    ? 'border-cyan-500/20 bg-cyan-500/5'
                    : 'border-white/5 bg-white/[0.02]'
                }`}
              >
                <Icon className={`h-4 w-4 transition-colors duration-300 ${isActive ? channel.color : 'text-white/15'}`} />
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  isActive ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-white/10'
                }`} />
                <span className={`text-[9px] uppercase tracking-wider transition-colors ${
                  isActive ? 'text-white/60' : 'text-white/20'
                }`}>
                  {isActive ? 'Live' : 'Off'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-white/30">
            <span>Platform Coverage</span>
            <span>{Math.round((activeCount / channels.length) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-700"
              style={{ width: `${(activeCount / channels.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ChannelToggles;
