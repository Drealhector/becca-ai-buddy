import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import MasterSwitch from "@/components/dashboard/MasterSwitch";
import ChannelToggles from "@/components/dashboard/ChannelToggles";
import TranscriptsSection from "@/components/dashboard/TranscriptsSection";
import ConversationsSection from "@/components/dashboard/ConversationsSection";
import CopyableLinks from "@/components/dashboard/CopyableLinks";
import PhoneCallSection from "@/components/dashboard/PhoneCallSection";
import LogoCustomization from "@/components/dashboard/LogoCustomization";
import VoiceManagementSection from "@/components/dashboard/VoiceManagementSection";
import { AIPersonalitySection } from "@/components/dashboard/AIPersonalitySection";
import { Menu, LogOut, Phone, Link as LinkIcon, Settings, MessageSquare, History, Mic } from "lucide-react";


const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNav, setShowNav] = useState(false);
  const [showConnectNumber, setShowConnectNumber] = useState(false);
  const [showBuyNumber, setShowBuyNumber] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // No auth required - use demo user
    setUser({ id: "demo-user" } as User);
    setLoading(false);
  }, []);

  const handleSignOut = async () => {
    navigate("/");
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setShowNav(false);
    }
  };

  const handleConnectNumber = () => {
    if (!phoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }
    setIsConnected(true);
    toast.success(`Connected to ${phoneNumber}`);
  };

  const sections = [
    { id: "master-switch", label: "Master Switch", icon: Settings },
    { id: "channels", label: "Channels", icon: MessageSquare },
    { id: "transcripts", label: "Transcripts", icon: History },
    { id: "conversations", label: "Conversations", icon: MessageSquare },
    { id: "logo-voice", label: "Logo & Voice", icon: Mic },
    { id: "ai-personality", label: "AI Personality", icon: MessageSquare },
    { id: "links", label: "Shareable Links", icon: LinkIcon },
    { id: "phone-calls", label: "Phone Calls", icon: Phone },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowNav(!showNav)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">
              <span className="text-4xl font-extrabold bg-gradient-to-br from-primary via-accent to-primary bg-clip-text text-transparent drop-shadow-lg">B</span>
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">ECCA Dashboard</span>
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

        {/* Navigation Dropdown */}
        {showNav && (
          <div className="border-t border-border bg-card/95 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-2">
              {sections.map((section) => (
                <Button
                  key={section.id}
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() => scrollToSection(section.id)}
                >
                  <section.icon className="h-4 w-4" />
                  {section.label}
                </Button>
              ))}
              
              {/* Connect Number Section */}
              <div className="pt-4 border-t border-border space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setShowConnectNumber(!showConnectNumber)}
                >
                  <Phone className="h-4 w-4" />
                  Connect Number
                </Button>
                
                {showConnectNumber && (
                  <div className="pl-6 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="+1-234-567-8900"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                      <Button size="sm" onClick={handleConnectNumber}>
                        Connect
                      </Button>
                    </div>
                    {isConnected && (
                      <p className="text-sm text-green-500">✓ Connected to {phoneNumber}</p>
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setShowBuyNumber(!showBuyNumber)}
                >
                  <Phone className="h-4 w-4" />
                  Buy Number
                </Button>
                
                {showBuyNumber && (
                  <div className="pl-6 space-y-2">
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      Connect Twilio
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      Connect Telnyx
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      Connect BECCA
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Master Switch */}
        <div id="master-switch">
          <MasterSwitch />
        </div>

        {/* Channel Controls */}
        <div id="channels">
          <ChannelToggles />
        </div>

        {/* Transcripts */}
        <div id="transcripts">
          <TranscriptsSection />
        </div>

        {/* Conversations */}
        <div id="conversations">
          <ConversationsSection />
        </div>

        {/* Logo & Voice Management */}
        <div id="logo-voice" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LogoCustomization />
          <VoiceManagementSection />
        </div>

        {/* AI Personality */}
        <div id="ai-personality">
          <AIPersonalitySection />
        </div>

        {/* Copyable Links */}
        <div id="links">
          <CopyableLinks />
        </div>

        {/* Phone Call Section */}
        <div id="phone-calls">
          <PhoneCallSection />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;