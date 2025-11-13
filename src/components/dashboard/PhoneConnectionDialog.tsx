import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PhoneConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: "twilio" | "telnyx" | "becca" | null;
  onConnect: (data: any) => void;
}

export const PhoneConnectionDialog = ({ open, onOpenChange, provider, onConnect }: PhoneConnectionDialogProps) => {
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioPhone, setTwilioPhone] = useState("");
  
  const [telnyxKey, setTelnyxKey] = useState("");
  const [telnyxPhone, setTelnyxPhone] = useState("");
  
  const [beccaBusinessName, setBeccaBusinessName] = useState("");
  const [beccaBusinessKey, setBeccaBusinessKey] = useState("");

  const handleConnect = () => {
    if (provider === "twilio") {
      if (!twilioSid || !twilioToken || !twilioPhone) {
        toast.error("Please fill in all Twilio fields");
        return;
      }
      onConnect({ provider: "twilio", sid: twilioSid, token: twilioToken, phone: twilioPhone });
    } else if (provider === "telnyx") {
      if (!telnyxKey || !telnyxPhone) {
        toast.error("Please fill in all Telnyx fields");
        return;
      }
      onConnect({ provider: "telnyx", key: telnyxKey, phone: telnyxPhone });
    } else if (provider === "becca") {
      if (!beccaBusinessName || !beccaBusinessKey) {
        toast.error("Please fill in all BECCA fields");
        return;
      }
      onConnect({ provider: "becca", businessName: beccaBusinessName, businessKey: beccaBusinessKey });
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Phone Number via {provider?.toUpperCase()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {provider === "twilio" && (
            <>
              <div>
                <Label>Account SID</Label>
                <Input
                  value={twilioSid}
                  onChange={(e) => setTwilioSid(e.target.value)}
                  placeholder="Enter your Twilio Account SID"
                />
              </div>
              <div>
                <Label>Auth Token</Label>
                <Input
                  type="password"
                  value={twilioToken}
                  onChange={(e) => setTwilioToken(e.target.value)}
                  placeholder="Enter your Twilio Auth Token"
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={twilioPhone}
                  onChange={(e) => setTwilioPhone(e.target.value)}
                  placeholder="+1-234-567-8900"
                />
              </div>
            </>
          )}
          
          {provider === "telnyx" && (
            <>
              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={telnyxKey}
                  onChange={(e) => setTelnyxKey(e.target.value)}
                  placeholder="Enter your Telnyx API Key"
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={telnyxPhone}
                  onChange={(e) => setTelnyxPhone(e.target.value)}
                  placeholder="+1-234-567-8900"
                />
              </div>
            </>
          )}
          
          {provider === "becca" && (
            <>
              <div>
                <Label>Business Name</Label>
                <Input
                  value={beccaBusinessName}
                  onChange={(e) => setBeccaBusinessName(e.target.value)}
                  placeholder="Enter your business name"
                />
              </div>
              <div>
                <Label>Business Key</Label>
                <Input
                  type="password"
                  value={beccaBusinessKey}
                  onChange={(e) => setBeccaBusinessKey(e.target.value)}
                  placeholder="Enter your business key"
                />
              </div>
            </>
          )}

          <Button onClick={handleConnect} className="w-full">
            Connect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
