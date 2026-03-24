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
import HubBackgroundGenerator from "@/components/dashboard/HubBackgroundGenerator";
import VoiceManagementSection from "@/components/dashboard/VoiceManagementSection";
import { AIPersonalitySection } from "@/components/dashboard/AIPersonalitySection";
import { InventorySection } from "@/components/dashboard/InventorySection";
import { PhoneConnectionDialog } from "@/components/dashboard/PhoneConnectionDialog";
import FloatingAssistant from "@/components/dashboard/FloatingAssistant";
import MatrixBackground from "@/components/dashboard/MatrixBackground";
import SectionCard from "@/components/dashboard/SectionCard";
import {
  Menu, X, LogOut, Phone, Link as LinkIcon, Settings, MessageSquare,
  Mic, Trash2, CreditCard, Brain, Palette, Share2, PhoneCall,
  ToggleLeft, Radio, Package, Image, ChevronDown, ChevronRight,
  PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import beccaLogo from "@/assets/becca-new-logo.png";
import beccaBLogo from "@/assets/becca-b-new-logo.png";


const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState("master-switch");
  const [showConnectNumber, setShowConnectNumber] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<"twilio" | "telnyx" | "becca" | null>(null);
  const navigate = useNavigate();

  const sectionGroups = [
    {
      label: "CONTROL",
      sections: [
        { id: "master-switch", label: "Master Switch", icon: ToggleLeft, info: "The power button for BECCA. Turn it ON to activate across all platforms, OFF to pause everything." },
        { id: "channels", label: "Channels", icon: Radio, info: "Choose which platforms BECCA responds on — WhatsApp, Instagram, Facebook, or Telegram." },
      ]
    },
    {
      label: "OPERATIONS",
      sections: [
        { id: "conversations", label: "Conversations", icon: MessageSquare, info: "Monitor all customer conversations across platforms. Click any chat to read the full transcript." },
        { id: "inventory", label: "Inventory", icon: Package, info: "Add and manage your products. BECCA learns from these to help customers." },
        { id: "phone-calls", label: "Phone Calls", icon: PhoneCall, info: "Manage inbound/outbound calls, view call history, and access full transcripts." },
      ]
    },
    {
      label: "CUSTOMIZE",
      sections: [
        { id: "logo-voice", label: "Voice", icon: Mic, info: "Customize how BECCA sounds on calls. Upload your own voice or choose from pre-built options." },
        { id: "ai-personality", label: "AI Personality", icon: Brain, info: "Define how BECCA talks and behaves. The more specific, the better she matches your brand." },
        { id: "hub-background", label: "Hub Design", icon: Image, info: "Customize the look of your public hub page with uploaded or AI-generated backgrounds." },
      ]
    },
    {
      label: "SHARE",
      sections: [
        { id: "links", label: "Links", icon: Share2, info: "Copy and share links for your hub, chat, and call pages anywhere you want customers to reach you." },
      ]
    },
  ];

  const allSections = sectionGroups.flatMap(g => g.sections);

  useEffect(() => {
    let mounted = true;
    const businessName = sessionStorage.getItem("becca_business_name");
    const businessKey = sessionStorage.getItem("becca_business_key");
    if (businessName && businessKey) {
      if (mounted) {
        setUser({ id: businessKey, email: `${businessName}@business` } as User);
        setLoading(false);
      }
      return;
    }
    if (mounted) { setLoading(false); navigate("/"); }
    return () => { mounted = false; };
  }, [navigate]);

  useEffect(() => {
    const handleScroll = () => {
      const offset = 120;
      for (const section of [...allSections].reverse()) {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top <= offset) {
          setActiveSection(section.id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = () => {
    sessionStorage.removeItem("becca_business_name");
    sessionStorage.removeItem("becca_business_key");
    navigate("/");
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 64;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      setSidebarOpen(false);
    }
  };

  const handleConnectNumber = () => {
    if (!phoneNumber.trim()) { toast.error("Please enter a phone number"); return; }
    setIsConnected(true);
    toast.success(`Connected to ${phoneNumber}`);
  };

  const handleDeleteNumber = () => {
    setIsConnected(false); setPhoneNumber("");
    toast.success("Phone number disconnected");
  };

  const handleProviderConnect = (data: any) => {
    setPhoneNumber(data.phone); setIsConnected(true);
    toast.success(`Connected via ${data.provider}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const sidebarW = sidebarCollapsed ? 'w-16' : 'w-56';
  const mainPl = sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-56';

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <MatrixBackground />

      {/* Mobile overlay with blur */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-500
          ${sidebarOpen ? 'bg-black/60 backdrop-blur-sm pointer-events-auto' : 'bg-transparent pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ===== SIDEBAR with sci-fi retraction ===== */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${sidebarW} lg:translate-x-0 ${sidebarOpen ? 'translate-x-0 w-56' : '-translate-x-full'}`}
        style={{
          background: 'linear-gradient(180deg, rgba(4,10,20,0.97) 0%, rgba(2,8,18,0.98) 100%)',
          borderRight: '1px solid rgba(0,230,255,0.08)',
          boxShadow: '4px 0 40px rgba(0,0,0,0.4), 1px 0 0 rgba(0,230,255,0.05)',
        }}
      >
        {/* Animated edge glow on sidebar */}
        <div className="absolute top-0 right-0 bottom-0 w-[1px] overflow-hidden">
          <div className="absolute w-full h-20 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent animate-[sidebar-glow_4s_ease-in-out_infinite]" />
        </div>

        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-white/[0.04] min-h-[56px]">
          {!sidebarCollapsed || sidebarOpen ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <img src={beccaBLogo} alt="B" className="w-7 h-7 flex-shrink-0 transition-all duration-500" style={{ filter: 'drop-shadow(0 0 8px rgba(0,230,255,0.4))' }} />
              <span className="text-white/80 text-sm font-normal whitespace-nowrap transition-all duration-300" style={{ fontFamily: 'system-ui' }}>Dashboard</span>
            </div>
          ) : (
            <img src={beccaBLogo} alt="B" className="w-7 h-7 mx-auto transition-all duration-500 hover:scale-110" style={{ filter: 'drop-shadow(0 0 8px rgba(0,230,255,0.4))' }} />
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-white/40 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all duration-200 active:scale-75"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-none">
          {sectionGroups.map((group) => (
            <div key={group.label}>
              {(!sidebarCollapsed || sidebarOpen) && (
                <p className="text-[9px] font-bold text-cyan-500/40 uppercase tracking-[0.2em] px-2 mb-1.5">{group.label}</p>
              )}
              {sidebarCollapsed && !sidebarOpen && (
                <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent mb-2" />
              )}
              <div className="space-y-0.5">
                {group.sections.map((section) => {
                  const isActive = activeSection === section.id;
                  const isExpanded = !sidebarCollapsed || sidebarOpen;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`group/nav w-full flex items-center rounded-lg text-xs relative overflow-hidden
                        transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                        active:scale-[0.96]
                        ${isExpanded ? 'gap-2.5 px-2.5 py-2' : 'justify-center px-0 py-2.5'}
                        ${isActive
                          ? 'text-cyan-300 bg-gradient-to-r from-cyan-500/10 to-transparent'
                          : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                        }`}
                      title={!isExpanded ? section.label : undefined}
                    >
                      {/* Active indicator with glow */}
                      {isActive && (
                        <div className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-cyan-400"
                          style={{ boxShadow: '0 0 6px rgba(0,230,255,0.6), 0 0 12px rgba(0,230,255,0.3)' }} />
                      )}
                      {/* Hover sweep */}
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/[0.04] to-cyan-500/0
                        translate-x-[-100%] group-hover/nav:translate-x-[100%] transition-transform duration-700" />
                      <section.icon className={`h-4 w-4 flex-shrink-0 transition-all duration-300
                        ${isActive ? 'text-cyan-400 drop-shadow-[0_0_4px_rgba(0,230,255,0.5)]' : 'text-white/25 group-hover/nav:text-white/50'}`} />
                      {isExpanded && <span className="truncate relative">{section.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Connect Number (only when expanded) */}
          {(!sidebarCollapsed || sidebarOpen) && (
            <div>
              <p className="text-[9px] font-bold text-cyan-500/40 uppercase tracking-[0.2em] px-2 mb-1.5">PHONE</p>
              <button
                onClick={() => setShowConnectNumber(!showConnectNumber)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.03] transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-white/25" />
                  <span>Connect</span>
                </div>
                {showConnectNumber ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
              {showConnectNumber && (
                <div className="mt-1.5 ml-2 pl-3 border-l border-cyan-500/10 space-y-2">
                  {!isConnected ? (
                    <>
                      <div className="flex gap-1.5">
                        <Input placeholder="+234..." value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                          className="text-[10px] h-7 bg-white/5 border-white/10 text-white" />
                        <Button size="sm" className="h-7 text-[10px] px-2" onClick={handleConnectNumber}>Go</Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between p-1.5 rounded border border-emerald-500/20 bg-emerald-500/5">
                      <span className="text-[10px] text-emerald-400 truncate">{phoneNumber}</span>
                      <button onClick={handleDeleteNumber} className="p-0.5 text-red-400/60 hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-white/5 p-2 space-y-0.5">
          {/* Collapse toggle with retraction animation (desktop only) */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-white/30
              hover:text-cyan-400/70 hover:bg-cyan-500/5 transition-all duration-300 active:scale-95
              hover:shadow-[0_0_10px_rgba(0,230,255,0.05)]"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <div className={`transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${sidebarCollapsed ? 'rotate-180' : ''}`}>
              <PanelLeftClose className={`h-4 w-4 ${sidebarCollapsed ? 'mx-auto' : ''}`} />
            </div>
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
          {(!sidebarCollapsed || sidebarOpen) ? (
            <>
              <button onClick={() => navigate("/dashboard/billing")}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/[0.03] transition-all">
                <CreditCard className="h-4 w-4" /><span>Billing</span>
              </button>
              <button onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-red-400/40 hover:text-red-400 hover:bg-red-500/5 transition-all">
                <LogOut className="h-4 w-4" /><span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate("/dashboard/billing")}
                className="w-full flex justify-center py-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.03] transition-all" title="Billing">
                <CreditCard className="h-4 w-4" />
              </button>
              <button onClick={handleSignOut}
                className="w-full flex justify-center py-2 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-500/5 transition-all" title="Sign Out">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ===== HEADER ===== */}
      <header className={`sticky top-0 z-30 transition-all duration-300 ${mainPl}`}
        style={{ background: 'rgba(4,10,20,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,230,255,0.06)' }}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all active:scale-90">
              <Menu className="h-5 w-5" />
            </button>
            {/* Mobile logo */}
            <div className="flex items-center gap-2 lg:hidden">
              <img src={beccaBLogo} alt="B" className="w-6 h-6" style={{ filter: 'drop-shadow(0 0 4px rgba(0,230,255,0.3))' }} />
              <span className="text-white/60 text-sm">Dashboard</span>
            </div>
            {/* Desktop breadcrumb */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-white/40">
              {(() => {
                const current = allSections.find(s => s.id === activeSection);
                const group = sectionGroups.find(g => g.sections.some(s => s.id === activeSection));
                if (!current || !group) return null;
                return (
                  <>
                    <span className="text-cyan-500/40">{group.label}</span>
                    <span className="text-white/20">/</span>
                    <span className="text-white/70">{current.label}</span>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className={`relative z-10 transition-all duration-300 ${mainPl}`}>
        <div className="w-full px-3 sm:px-5 lg:px-6 py-5 space-y-5">

          {/* === ROW 1: Control Center — Master Switch + Channels side by side === */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard id="master-switch" title="Master Switch" icon={ToggleLeft}
              infoText="The power button for BECCA. Turn it ON to activate across all platforms, OFF to pause everything.">
              <MasterSwitch />
            </SectionCard>
            <SectionCard id="channels" title="Channels" icon={Radio}
              infoText="Choose which platforms BECCA responds on — WhatsApp, Instagram, Facebook, or Telegram.">
              <ChannelToggles />
            </SectionCard>
          </div>

          {/* === ROW 2: Conversations (full width) === */}
          <SectionCard id="conversations" title="Conversations" icon={MessageSquare}
            infoText="Monitor all customer conversations across platforms. Click any chat to read the full transcript.">
            <ConversationsSection />
          </SectionCard>

          {/* === ROW 3: Inventory + Phone Calls side by side === */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard id="inventory" title="Inventory" icon={Package}
              infoText="Add and manage your products. BECCA learns from these to help customers.">
              <InventorySection />
            </SectionCard>
            <SectionCard id="phone-calls" title="Phone Calls" icon={PhoneCall}
              infoText="Manage inbound/outbound calls, view call history, and access full transcripts.">
              <PhoneCallSection />
            </SectionCard>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent" />
            <span className="text-[9px] text-cyan-500/30 uppercase tracking-[0.3em] font-bold">Customize</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent" />
          </div>

          {/* === ROW 4: Voice + AI Personality side by side === */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard id="logo-voice" title="Voice Management" icon={Mic}
              infoText="Customize how BECCA sounds on calls. Upload your own voice or choose from pre-built options.">
              <VoiceManagementSection />
            </SectionCard>
            <SectionCard id="ai-personality" title="AI Personality" icon={Brain}
              infoText="Define how BECCA talks and behaves. The more specific, the better she matches your brand.">
              <AIPersonalitySection />
            </SectionCard>
          </div>

          {/* === ROW 5: Hub Design + Shareable Links side by side === */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard id="hub-background" title="Hub Design" icon={Image}
              infoText="Customize the look of your public hub page with uploaded or AI-generated backgrounds.">
              <HubBackgroundGenerator />
            </SectionCard>
            <SectionCard id="links" title="Shareable Links" icon={Share2}
              infoText="Copy and share links for your hub, chat, and call pages anywhere you want customers to reach you.">
              <CopyableLinks />
            </SectionCard>
          </div>

          {/* Bottom spacer for floating ball */}
          <div className="h-20" />
        </div>
      </main>

      {/* Dialogs */}
      <PhoneConnectionDialog open={showProviderDialog} onOpenChange={setShowProviderDialog}
        provider={selectedProvider} onConnect={handleProviderConnect} />

      {/* Floating Assistant */}
      <FloatingAssistant />

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes sidebar-glow {
          0%, 100% { top: -20%; }
          50% { top: 100%; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
