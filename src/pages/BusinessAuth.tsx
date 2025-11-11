import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import beccaLogo from "@/assets/becca-b-logo.png";

const BusinessAuth = () => {
  const [businessKey, setBusinessKey] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify business key
      const { data: keyData, error: keyError } = await supabase
        .from("business_keys")
        .select("business_name, is_active")
        .eq("business_key", businessKey)
        .eq("is_active", true)
        .single();

      if (keyError || !keyData) {
        toast({
          title: "Invalid Business Key",
          description: "Please check your business key and try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Store business info in session storage
      sessionStorage.setItem("becca_business_name", keyData.business_name);
      sessionStorage.setItem("becca_business_key", businessKey);

      // Navigate to welcome page
      navigate("/welcome");
    } catch (error) {
      console.error("Auth error:", error);
      toast({
        title: "Error",
        description: "An error occurred during sign in.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-2xl">
            <img src={beccaLogo} alt="BECCA" className="h-20 w-20 drop-shadow-xl" />
          </div>
        </div>

        <h1 className="text-white text-3xl font-bold text-center mb-8">Log in to BECCA</h1>

        {/* Business Key Form */}
        <form onSubmit={handleSignIn} className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="space-y-4">
              <div>
                <Label htmlFor="businessKey" className="text-white text-sm mb-2 block">
                  Business Key
                </Label>
                <Input
                  id="businessKey"
                  type="text"
                  placeholder="Enter your business key"
                  value={businessKey}
                  onChange={(e) => setBusinessKey(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-white/90 h-12"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in with Business Key"}
              </Button>
            </div>
          </div>
        </form>

        <p className="text-white/50 text-sm text-center mt-6">
          Contact your administrator for a business key
        </p>
      </div>
    </div>
  );
};

export default BusinessAuth;