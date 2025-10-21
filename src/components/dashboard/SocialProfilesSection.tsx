import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageCircle, Send } from "lucide-react";

const SocialProfilesSection = () => {
  const [profiles, setProfiles] = useState({
    whatsapp_username: "",
    instagram_username: "",
    facebook_username: "",
    telegram_username: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("customizations")
        .select("whatsapp_username, instagram_username, facebook_username, telegram_username")
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        setProfiles({
          whatsapp_username: data.whatsapp_username || "",
          instagram_username: data.instagram_username || "",
          facebook_username: data.facebook_username || "",
          telegram_username: data.telegram_username || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("customizations")
        .update(profiles)
        .eq("id", (await supabase.from("customizations").select("id").single()).data?.id);

      if (error) throw error;
      toast.success("Social profiles updated!");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 shadow-elegant hover:shadow-hover transition-all">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Social Media Profiles</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Enter your social media usernames. When customers click to chat, they'll be directed to your profile.
      </p>
      <div className="space-y-4">
        <div>
          <Label htmlFor="whatsapp">WhatsApp Phone Number</Label>
          <Input
            id="whatsapp"
            placeholder="e.g., 1234567890"
            value={profiles.whatsapp_username}
            onChange={(e) => setProfiles({ ...profiles, whatsapp_username: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">Include country code without +</p>
        </div>
        <div>
          <Label htmlFor="instagram">Instagram Username</Label>
          <Input
            id="instagram"
            placeholder="e.g., yourusername"
            value={profiles.instagram_username}
            onChange={(e) => setProfiles({ ...profiles, instagram_username: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="facebook">Facebook Username</Label>
          <Input
            id="facebook"
            placeholder="e.g., yourusername"
            value={profiles.facebook_username}
            onChange={(e) => setProfiles({ ...profiles, facebook_username: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="telegram">Telegram Username</Label>
          <Input
            id="telegram"
            placeholder="e.g., yourusername"
            value={profiles.telegram_username}
            onChange={(e) => setProfiles({ ...profiles, telegram_username: e.target.value })}
          />
        </div>
      </div>
      <Button
        onClick={handleSave}
        disabled={loading}
        className="w-full mt-6 gap-2"
      >
        <Send className="w-4 h-4" />
        {loading ? "Saving..." : "Save Profiles"}
      </Button>
    </Card>
  );
};

export default SocialProfilesSection;
