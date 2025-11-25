import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import MasterSwitch from "@/components/dashboard/MasterSwitch";
import ChannelToggles from "@/components/dashboard/ChannelToggles";
import ConversationsSection from "@/components/dashboard/ConversationsSection";
import CopyableLinks from "@/components/dashboard/CopyableLinks";
import PhoneCallSection from "@/components/dashboard/PhoneCallSection";
import LogoCustomization from "@/components/dashboard/LogoCustomization";
import VoiceManagementSection from "@/components/dashboard/VoiceManagementSection";
import { AIPersonalitySection } from "@/components/dashboard/AIPersonalitySection";
import { PhoneConnectionDialog } from "@/components/dashboard/PhoneConnectionDialog";
import FloatingVapiAssistant from "@/components/dashboard/FloatingVapiAssistant";
import { Menu, LogOut, Phone, Link as LinkIcon, Settings, MessageSquare, Mic, Trash2 } from "lucide-react";


const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNav, setShowNav] = useState(false);
  const [showConnectNumber, setShowConnectNumber] = useState(false);
  const [showBuyNumber, setShowBuyNumber] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<"twilio" | "telnyx" | "becca" | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    // Check for business key session FIRST (priority over email auth)
    const businessName = sessionStorage.getItem("becca_business_name");
    const businessKey = sessionStorage.getItem("becca_business_key");

    if (businessName && businessKey) {
      // User is logged in with business key - create a pseudo-user
      if (mounted) {
        setUser({ id: businessKey, email: `${businessName}@business` } as User);
        setLoading(false);
      }
      return;
    }

    // If no business key, check for Supabase auth session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (mounted) {
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);
        
        // Only redirect if definitely no session of any kind
        if (!session && !businessName && !businessKey) {
          navigate("/");
        }
      }
    };

    checkSession();

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);
        
        // Handle sign out
        if (_event === 'SIGNED_OUT') {
          // Clear business session too
          sessionStorage.removeItem("becca_business_name");
          sessionStorage.removeItem("becca_business_key");
          navigate("/");
        }
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignOut = async () => {
    // Clear business session
    sessionStorage.removeItem("becca_business_name");
    sessionStorage.removeItem("becca_business_key");
    
    // Also sign out from Supabase if logged in that way
    await supabase.auth.signOut();
    
    navigate("/");
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // Calculate offset for sticky header
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      
      // Delay closing nav to ensure scroll completes
      setTimeout(() => setShowNav(false), 500);
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

  const handleDeleteNumber = () => {
    setIsConnected(false);
    setPhoneNumber("");
    toast.success("Phone number disconnected");
  };

  const handleProviderConnect = (data: any) => {
    setPhoneNumber(data.phone);
    setIsConnected(true);
    toast.success(`Connected via ${data.provider}`);
  };

  const sections = [
    { id: "master-switch", label: "Master Switch", icon: Settings },
    { id: "channels", label: "Channels", icon: MessageSquare },
    { id: "conversations", label: "Conversations", icon: MessageSquare },
    { id: "logo-voice", label: "Logo & Voice", icon: Mic },
    { id: "ai-personality", label: "AI Personality", icon: MessageSquare },
    { id: "links", label: "Shareable Links", icon: LinkIcon },
    { id: "phone-calls", label: "Phone Calls", icon: Phone },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show nothing if no user yet (prevents flash)
  if (!user) {
    return null;
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
            <h1 className="text-sm sm:text-xl md:text-2xl font-bold flex items-baseline">
              <span style={{
                fontSize: 'clamp(1rem, 4vw, 2rem)',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                fontWeight: 900,
                display: 'inline-block',
                color: '#ffffff',
                WebkitTextStroke: '1px #2c4a6f',
                textShadow: `
                  -2px -2px 0 #5dd5ed,
                  -4px -4px 0 #5dd5ed,
                  -6px -6px 0 #70dff0,
                  0 2px 6px rgba(0,0,0,0.4)
                `
              }}>B</span>
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent hidden sm:inline">ECCA Dashboard</span>
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent sm:hidden">ECCA</span>
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
                    {!isConnected ? (
                      <>
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
                        <p className="text-xs text-muted-foreground">One number per business</p>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                          <div>
                            <p className="text-sm font-medium text-green-700 dark:text-green-400">Active</p>
                            <p className="text-sm text-green-600 dark:text-green-500">{phoneNumber}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleDeleteNumber}
                            className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">One number per business</p>
                      </div>
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => {
                        setSelectedProvider("twilio");
                        setShowProviderDialog(true);
                      }}
                    >
                      Connect Twilio
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => {
                        setSelectedProvider("telnyx");
                        setShowProviderDialog(true);
                      }}
                    >
                      Connect Telnyx
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => {
                        setSelectedProvider("becca");
                        setShowProviderDialog(true);
                      }}
                    >
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

      {/* Phone Connection Dialog */}
      <PhoneConnectionDialog
        open={showProviderDialog}
        onOpenChange={setShowProviderDialog}
        provider={selectedProvider}
        onConnect={handleProviderConnect}
      />

      {/* Floating Vapi Assistant */}
      <FloatingVapiAssistant />
    </div>
  );
};

export default Dashboard;