import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import MasterSwitch from "@/components/dashboard/MasterSwitch";
import ChannelToggles from "@/components/dashboard/ChannelToggles";
import ConnectionStatus from "@/components/dashboard/ConnectionStatus";
import TranscriptsSection from "@/components/dashboard/TranscriptsSection";
import ConversationsSection from "@/components/dashboard/ConversationsSection";
import WalletSection from "@/components/dashboard/WalletSection";
import CustomizationPanel from "@/components/dashboard/CustomizationPanel";
import CopyableLinks from "@/components/dashboard/CopyableLinks";
import PhoneCallSection from "@/components/dashboard/PhoneCallSection";
import SocialProfilesSection from "@/components/dashboard/SocialProfilesSection";
import VoiceManagementSection from "@/components/dashboard/VoiceManagementSection";
import LogoCustomization from "@/components/dashboard/LogoCustomization";
import { Menu, LogOut } from "lucide-react";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              BECCA Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard/billing")}
            >
              Billing
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Master Switch */}
        <MasterSwitch />

        {/* Channel Controls */}
        <div className="grid md:grid-cols-2 gap-8">
          <ChannelToggles />
          <ConnectionStatus />
        </div>

        {/* Transcripts */}
        <TranscriptsSection />

        {/* Conversations */}
        <ConversationsSection />

        {/* Wallet */}
        <WalletSection />

        {/* Logo Customization */}
        <LogoCustomization />

        {/* Social Profiles */}
        <SocialProfilesSection />

        {/* Voice Management */}
        <VoiceManagementSection />

        {/* Customization */}
        <CustomizationPanel />

        {/* Copyable Links */}
        <CopyableLinks />

        {/* Phone Call Section */}
        <PhoneCallSection />
      </main>
    </div>
  );
};

export default Dashboard;