import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Power } from "lucide-react";

const MasterSwitch = () => {
  const [masterSwitch, setMasterSwitch] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchToggleState();
  }, []);

  const fetchToggleState = async () => {
    try {
      const { data, error } = await supabase
        .from("toggles")
        .select("master_switch")
        .limit(1)
        .single();

      if (error) throw error;
      setMasterSwitch(data?.master_switch || false);
    } catch (error) {
      console.error("Error fetching toggle state:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    try {
      const { error } = await supabase
        .from("toggles")
        .update({ master_switch: checked })
        .eq("id", (await supabase.from("toggles").select("id").limit(1).single()).data?.id);

      if (error) throw error;

      setMasterSwitch(checked);
      toast.success(checked ? "BECCA is now active" : "BECCA is now inactive");
    } catch (error) {
      console.error("Error updating master switch:", error);
      toast.error("Failed to update master switch");
    }
  };

  if (loading) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full ${masterSwitch ? "bg-primary/10" : "bg-muted"}`}>
            <Power className={`h-6 w-6 ${masterSwitch ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Master Switch</h3>
            <p className="text-sm text-muted-foreground">
              Turn BECCA {masterSwitch ? "off" : "on"} globally
            </p>
          </div>
        </div>
        <Switch checked={masterSwitch} onCheckedChange={handleToggle} />
      </div>
    </Card>
  );
};

export default MasterSwitch;