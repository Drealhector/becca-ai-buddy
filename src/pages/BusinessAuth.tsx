import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const BusinessAuth = () => {
  const [businessName, setBusinessName] = useState("");
  const [businessKey, setBusinessKey] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("Checking business key:", businessKey);
      
      // Verify business name and key
      const { data: keyData, error: keyError } = await supabase
        .from("business_keys")
        .select("business_name, is_active, business_key")
        .eq("business_name", businessName.trim())
        .eq("business_key", businessKey.trim())
        .eq("is_active", true)
        .single();

      console.log("Key data:", keyData, "Error:", keyError);

      if (keyError || !keyData) {
        toast({
          title: "Invalid Credentials",
          description: "Please check your business name and business key and try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create a unique email for this business
      const businessEmail = `${businessKey.toLowerCase().replace(/[^a-z0-9]/g, '')}@becca.business`;
      const businessPassword = businessKey; // Use business key as password

      // Try to sign in first
      let authResult = await supabase.auth.signInWithPassword({
        email: businessEmail,
        password: businessPassword,
      });

      // If sign in fails, create new account
      if (authResult.error) {
        console.log("Sign in failed, creating new account");
        authResult = await supabase.auth.signUp({
          email: businessEmail,
          password: businessPassword,
        });

        if (authResult.error) {
          throw authResult.error;
        }
      }

      if (!authResult.data.user) {
        throw new Error("Failed to authenticate");
      }

      // Store business_key in user_onboarding table
      const { error: onboardingError } = await supabase
        .from("user_onboarding")
        .upsert({
          user_id: authResult.data.user.id,
          business_key: keyData.business_key,
          onboarding_completed: true,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (onboardingError) {
        console.error("Error updating onboarding:", onboardingError);
      }

      // Store business info in session storage for quick access
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
            <span style={{
              fontSize: '5rem',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
              fontWeight: 900,
              lineHeight: 1,
              color: '#ffffff',
              WebkitTextStroke: '2px #2c4a6f',
              textShadow: `
                -3px -3px 0 #5dd5ed,
                -6px -6px 0 #5dd5ed,
                -9px -9px 0 #70dff0,
                0 3px 10px rgba(0,0,0,0.4)
              `,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>B</span>
          </div>
        </div>

        <h1 className="text-white text-3xl font-bold text-center mb-8">Log in to BECCA</h1>

        {/* Business Login Form */}
        <form onSubmit={handleSignIn} className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="space-y-4">
              <div>
                <Label htmlFor="businessName" className="text-white text-sm mb-2 block">
                  Business Name
                </Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="Enter your business name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  required
                />
              </div>

              <div>
                <Label htmlFor="businessKey" className="text-white text-sm mb-2 block">
                  Business Key
                </Label>
                <Input
                  id="businessKey"
                  type="password"
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
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </div>
          </div>
        </form>

        <p className="text-white/50 text-sm text-center mt-6">
          Contact your administrator for access credentials
        </p>
      </div>
    </div>
  );
};

export default BusinessAuth;