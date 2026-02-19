import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

const CustomizationPanel = () => {
  const [customization, setCustomization] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomization();
  }, []);

  const fetchCustomization = async () => {
    try {
      const { data } = await supabase
        .from("customizations")
        .select("*")
        .limit(1)
        .single();
      setCustomization(data || {});
    } catch (error) {
      console.error("Error fetching customization:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("customizations")
        .update({
          business_name: customization.business_name,
          business_description: customization.business_description,
          business_industry: customization.business_industry,
          target_audience: customization.target_audience,
          key_services: customization.key_services,
          business_hours: customization.business_hours,
          assistant_personality: customization.assistant_personality,
          special_instructions: customization.special_instructions,
          tone: customization.tone,
          greeting: customization.greeting,
          faqs: customization.faqs,
          whatsapp_username: customization.whatsapp_username,
          instagram_username: customization.instagram_username,
          facebook_username: customization.facebook_username,
          telegram_username: customization.telegram_username,
        })
        .eq("id", customization.id);

      if (error) throw error;
      toast.success("Customization saved");
    } catch (error) {
      console.error("Error saving customization:", error);
      toast.error("Failed to save customization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 shadow-elegant hover:shadow-hover transition-all">
      <h3 className="text-lg font-semibold mb-6">AI Brain Configuration</h3>
      <div className="space-y-6">
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm">Social Media Links</h4>
          <p className="text-xs text-muted-foreground">
            Add your social media usernames so customers are redirected to your profiles
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">WhatsApp Phone</label>
              <div className="flex gap-2">
                <Input
                  value={customization.whatsapp_username || ""}
                  onChange={(e) =>
                    setCustomization({ ...customization, whatsapp_username: e.target.value })
                  }
                  placeholder="1234567890 (with country code)"
                  className="flex-1"
                />
                {customization.whatsapp_username && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => window.open(`https://wa.me/${customization.whatsapp_username}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Instagram Username</label>
              <div className="flex gap-2">
                <Input
                  value={customization.instagram_username || ""}
                  onChange={(e) =>
                    setCustomization({ ...customization, instagram_username: e.target.value })
                  }
                  placeholder="yourusername"
                  className="flex-1"
                />
                {customization.instagram_username && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => window.open(`https://instagram.com/${customization.instagram_username}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Facebook Username</label>
              <div className="flex gap-2">
                <Input
                  value={customization.facebook_username || ""}
                  onChange={(e) =>
                    setCustomization({ ...customization, facebook_username: e.target.value })
                  }
                  placeholder="yourusername"
                  className="flex-1"
                />
                {customization.facebook_username && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => window.open(`https://facebook.com/${customization.facebook_username}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Telegram Username</label>
              <div className="flex gap-2">
                <Input
                  value={customization.telegram_username || ""}
                  onChange={(e) =>
                    setCustomization({ ...customization, telegram_username: e.target.value })
                  }
                  placeholder="yourusername"
                  className="flex-1"
                />
                {customization.telegram_username && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => window.open(`https://t.me/${customization.telegram_username}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Business Description</label>
          <Textarea
            value={customization.business_description || ""}
            onChange={(e) =>
              setCustomization({ ...customization, business_description: e.target.value })
            }
            placeholder="What does your business do?"
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Target Audience</label>
          <Textarea
            value={customization.target_audience || ""}
            onChange={(e) =>
              setCustomization({ ...customization, target_audience: e.target.value })
            }
            placeholder="Who are your customers?"
            rows={2}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Key Services</label>
          <Textarea
            value={customization.key_services || ""}
            onChange={(e) =>
              setCustomization({ ...customization, key_services: e.target.value })
            }
            placeholder="What do you offer?"
            rows={2}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">AI Brain Personality</label>
          <Input
            value={customization.assistant_personality || ""}
            onChange={(e) =>
              setCustomization({ ...customization, assistant_personality: e.target.value })
            }
            placeholder="Professional, friendly, enthusiastic..."
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Special Instructions</label>
          <Textarea
            value={customization.special_instructions || ""}
            onChange={(e) =>
              setCustomization({ ...customization, special_instructions: e.target.value })
            }
            placeholder="Any specific rules or guidance..."
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Tone</label>
          <Input
            value={customization.tone || ""}
            onChange={(e) =>
              setCustomization({ ...customization, tone: e.target.value })
            }
            placeholder="friendly and professional"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Greeting</label>
          <Textarea
            value={customization.greeting || ""}
            onChange={(e) =>
              setCustomization({ ...customization, greeting: e.target.value })
            }
            placeholder="Hi, I'm BECCA..."
            rows={2}
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Saving..." : "Save All Configuration"}
        </Button>
      </div>
    </Card>
  );
};

export default CustomizationPanel;