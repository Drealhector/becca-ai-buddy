import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
          tone: customization.tone,
          greeting: customization.greeting,
          faqs: customization.faqs,
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
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Customization</h3>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Business Name</label>
          <Input
            value={customization.business_name || ""}
            onChange={(e) =>
              setCustomization({ ...customization, business_name: e.target.value })
            }
            placeholder="Your Business Name"
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
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">FAQs (JSON)</label>
          <Textarea
            value={
              typeof customization.faqs === "string"
                ? customization.faqs
                : JSON.stringify(customization.faqs || [], null, 2)
            }
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setCustomization({ ...customization, faqs: parsed });
              } catch {
                setCustomization({ ...customization, faqs: e.target.value });
              }
            }}
            placeholder='[{"q": "Question?", "a": "Answer"}]'
            rows={4}
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
        >
          {loading ? "Saving..." : "Save Customization"}
        </Button>
      </div>
    </Card>
  );
};

export default CustomizationPanel;