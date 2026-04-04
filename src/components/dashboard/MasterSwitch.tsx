import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Power } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const MasterSwitch = () => {
  const toggles = useQuery(api.toggles.get, {});
  const updateToggle = useMutation(api.toggles.update);

  const masterSwitch = toggles?.master_switch ?? false;
  const loading = toggles === undefined;

  const handleToggle = async (checked: boolean) => {
    if (!toggles?._id) return;
    try {
      await updateToggle({ id: toggles._id, master_switch: checked });
      toast.success(checked ? "BECCA is now active" : "BECCA is now inactive");
    } catch (error) {
      console.error("Error updating master switch:", error);
      toast.error("Failed to update master switch");
    }
  };

  if (loading) return null;

  return (
    <Card className="p-6 h-full">
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
