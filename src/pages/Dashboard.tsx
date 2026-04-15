import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { PhoneConnectionDialog } from "@/components/dashboard/PhoneConnectionDialog";
import FloatingAssistant from "@/components/dashboard/FloatingAssistant";
import SectionCard from "@/components/dashboard/SectionCard";
import {
  Menu, X, LogOut, Phone, Link as LinkIcon, Settings, MessageSquare,
  Mic, Trash2, CreditCard, Brain, Palette, Share2, PhoneCall,
  ToggleLeft, Radio, Image, ChevronDown, ChevronRight,
  PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import SocialConnectSection from "@/components/dashboard/SocialConnectSection";
import CRMSection from "@/components/dashboard/crm/CRMSection";
import PropertiesSection from "@/components/dashboard/crm/PropertiesSection";
import { Building2, Users } from "lucide-react";
import beccaLogo from "@/assets/becca-new-logo.png";
import beccaBLogo from "@/assets/becca-b-new-logo.png";


const Dashboard = () => {
  const [user, setUser] = useState<any | null>(null);
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
        { id: "properties", label: "Properties", icon: Building2, info: "Manage your real estate listings — apartments, houses, land, and commercial properties." },
      ]
    },
    {
      label: "CRM",
      sections: [
        { id: "crm", label: "CRM", icon: Users, info: "Manage contacts, pipeline, follow-ups, and analytics — your full real estate command center." },
      ]
    },
    {
      label: "OPERATIONS",
      sections: [
        { id: "conversations", label: "Conversations", icon: MessageSquare, info: "Monitor all customer conversations across platforms. Click any chat to read the full transcript." },
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
    toast.success("Phone connected successfully");
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
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: 'radial-gradient(ellipse at top, #0a1628 0%, #040811 70%, #02040a 100%)' }}>
      {/* Mobile "More" sheet overlay */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300
          ${sidebarOpen ? 'bg-black/70 backdrop-blur-sm pointer-events-auto' : 'bg-transparent pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile "More" bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[65] lg:hidden transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${sidebarOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{
          background: 'linear-gradient(180deg, rgba(22,40,72,0.99) 0%, rgba(14,26,52,0.99) 100%)',
          borderTop: '1px solid rgba(0,230,255,0.25)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -12px 48px rgba(0,0,0,0.5), 0 -1px 0 rgba(0,230,255,0.2)',
          maxHeight: '75vh',
        }}
      >
        <div className="flex flex-col overflow-y-auto max-h-[75vh]">
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-3">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
          <div className="px-4 pb-3">
            <h3 className="text-white/90 font-semibold text-base">All Sections</h3>
          </div>
          <div className="px-2 pb-6 space-y-1">
            {sectionGroups.map((group) => (
              <div key={group.label} className="mb-2">
                <div className="px-3 py-1.5 text-[10px] text-cyan-400/60 uppercase tracking-[0.2em] font-bold">{group.label}</div>
                {group.sections.map((section) => {
                  const IconComp = section.icon;
                  const active = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => { scrollToSection(section.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98]
                        ${active ? 'bg-cyan-500/15 text-cyan-200' : 'text-white/70 hover:bg-white/5'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-cyan-500/20' : 'bg-white/5'}`}>
                        <IconComp className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">{section.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            <button onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 mt-4 rounded-xl text-red-400 hover:bg-red-500/10 transition-all active:scale-[0.98]">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10">
                <LogOut className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== SIDEBAR with sci-fi retraction — brighter than content area ===== */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 hidden lg:flex flex-col
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${sidebarW} lg:translate-x-0 ${sidebarOpen ? 'translate-x-0 w-56' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          background: 'linear-gradient(180deg, rgba(28,48,82,0.98) 0%, rgba(22,40,72,0.98) 50%, rgba(18,34,64,0.98) 100%)',
          borderRight: '1px solid rgba(0,230,255,0.25)',
          boxShadow: '6px 0 50px rgba(0,230,255,0.08), 2px 0 0 rgba(0,230,255,0.15), inset -1px 0 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Animated edge glow on sidebar — stronger */}
        <div className="absolute top-0 right-0 bottom-0 w-[2px] overflow-hidden">
          <div className="absolute w-full h-28 bg-gradient-to-b from-transparent via-cyan-400/60 to-transparent animate-[sidebar-glow_4s_ease-in-out_infinite]" />
        </div>

        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-white/[0.04] min-h-[56px]">
          {!sidebarCollapsed || sidebarOpen ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img src={beccaBLogo} alt="B" className="w-8 h-8 flex-shrink-0 transition-all duration-500" style={{ filter: 'drop-shadow(0 0 8px rgba(0,230,255,0.5))' }} />
              <span className="text-white text-base font-semibold whitespace-nowrap transition-all duration-300" style={{ fontFamily: 'system-ui', letterSpacing: '0.02em' }}>Dashboard</span>
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
                <p className="text-[11px] font-bold text-cyan-300/80 uppercase tracking-[0.2em] px-2 mb-2">{group.label}</p>
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
                      className={`group/nav w-full flex items-center rounded-lg text-sm font-medium relative overflow-hidden
                        transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                        active:scale-[0.96]
                        ${isExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5'}
                        ${isActive
                          ? 'text-cyan-200 bg-gradient-to-r from-cyan-500/15 to-transparent'
                          : 'text-white/85 hover:text-white hover:bg-white/[0.06]'
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
                      <section.icon className={`h-[18px] w-[18px] flex-shrink-0 transition-all duration-300
                        ${isActive ? 'text-cyan-400 drop-shadow-[0_0_4px_rgba(0,230,255,0.5)]' : 'text-white/70 group-hover/nav:text-white'}`} />
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
              <p className="text-[11px] font-bold text-cyan-300/80 uppercase tracking-[0.2em] px-2 mb-2">PHONE</p>
              <button
                onClick={() => setShowConnectNumber(!showConnectNumber)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-white/85 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <div className="flex items-center gap-3">
                  <Phone className="h-[18px] w-[18px] text-white/70" />
                  <span>Connect</span>
                </div>
                {showConnectNumber ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
        <div className="border-t border-white/10 p-2 space-y-0.5">
          {/* Collapse toggle with retraction animation (desktop only) */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70
              hover:text-cyan-300 hover:bg-cyan-500/10 transition-all duration-300 active:scale-95
              hover:shadow-[0_0_10px_rgba(0,230,255,0.05)]"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <div className={`transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${sidebarCollapsed ? 'rotate-180' : ''}`}>
              <PanelLeftClose className={`h-[18px] w-[18px] ${sidebarCollapsed ? 'mx-auto' : ''}`} />
            </div>
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
          {(!sidebarCollapsed || sidebarOpen) ? (
            <>
              <button onClick={() => navigate("/dashboard/billing")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/75 hover:text-white hover:bg-white/[0.06] transition-all">
                <CreditCard className="h-[18px] w-[18px]" /><span>Billing</span>
              </button>
              <button onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-all">
                <LogOut className="h-[18px] w-[18px]" /><span>Sign Out</span>
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
        style={{ background: 'rgba(4,10,20,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,230,255,0.08)' }}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            {/* Mobile logo — no hamburger, bottom tabs handle nav */}
            <div className="flex items-center gap-2 lg:hidden">
              <img src={beccaBLogo} alt="B" className="w-7 h-7" style={{ filter: 'drop-shadow(0 0 6px rgba(0,230,255,0.5))' }} />
              <span className="text-white/80 text-sm font-medium">
                {allSections.find(s => s.id === activeSection)?.label || "Dashboard"}
              </span>
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
          {/* Mobile sign-out icon */}
          <button onClick={handleSignOut}
            className="lg:hidden p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/5 transition-all active:scale-90">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className={`relative z-10 transition-all duration-300 ${mainPl}`}>
        <div className="w-full px-3 sm:px-5 lg:px-6 py-3 sm:py-5 space-y-3 sm:space-y-5">

          {/* === ROW 1: Master Switch — full width umbrella === */}
          <SectionCard id="master-switch" title="Master Switch" icon={ToggleLeft} alwaysOpen
            infoText="The power button for BECCA. Turn it ON to activate across all platforms, OFF to pause everything.">
            <MasterSwitch />
          </SectionCard>

          {/* === ROW 2: Channels + Properties side by side equal === */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard id="channels" title="Channels" icon={Radio}
              infoText="Choose which platforms BECCA responds on — WhatsApp, Instagram, Facebook, or Telegram.">
              <ChannelToggles />
              <div className="mt-4">
                <SocialConnectSection />
              </div>
            </SectionCard>
            <SectionCard id="properties" title="Properties" icon={Building2}
              infoText="Manage your real estate listings — apartments, houses, land, and commercial properties.">
              <PropertiesSection />
            </SectionCard>
          </div>

          {/* === ROW 3: CRM (full width with tabs) === */}
          <SectionCard id="crm" title="CRM" icon={Users}
            infoText="Manage contacts, pipeline, follow-ups, and analytics — your full real estate command center.">
            <CRMSection />
          </SectionCard>

          {/* === ROW 3: Conversations + Phone Calls side by side equal === */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard id="conversations" title="Conversations" icon={MessageSquare}
              infoText="Monitor all customer conversations across platforms. Click any chat to read the full transcript.">
              <ConversationsSection />
            </SectionCard>
            <SectionCard id="phone-calls" title="Phone Calls" icon={PhoneCall}
              infoText="Manage inbound/outbound calls, view call history, and access full transcripts.">
              <PhoneCallSection />
            </SectionCard>
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

          {/* Bottom spacer for floating ball + mobile tab bar */}
          <div className="h-24 lg:h-20" />
        </div>
      </main>

      {/* ===== MOBILE BOTTOM TAB BAR ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]"
        style={{
          background: 'linear-gradient(180deg, rgba(16,28,52,0.92) 0%, rgba(10,20,40,0.98) 100%)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(0,230,255,0.18)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.4), 0 -1px 0 rgba(0,230,255,0.15)',
        }}
      >
        <div className="flex items-center justify-around px-1 pt-2 pb-2">
          {[
            { id: "master-switch", label: "Home", icon: ToggleLeft, isMore: false },
            { id: "crm", label: "CRM", icon: Users, isMore: false },
            { id: "conversations", label: "Chats", icon: MessageSquare, isMore: false },
            { id: "phone-calls", label: "Calls", icon: PhoneCall, isMore: false },
            { id: "__more", label: "More", icon: Menu, isMore: true },
          ].map((tab) => {
            const isActive = tab.isMore ? sidebarOpen : (activeSection === tab.id && !sidebarOpen);
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.isMore) {
                    setSidebarOpen(true);
                  } else {
                    setSidebarOpen(false);
                    scrollToSection(tab.id);
                  }
                }}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[56px] transition-all duration-300 active:scale-90
                  ${isActive ? 'text-cyan-300' : 'text-white/45'}`}
              >
                <div className={`relative p-1.5 rounded-lg transition-all duration-300 ${isActive ? 'bg-cyan-500/15 shadow-[0_0_12px_rgba(0,230,255,0.25)]' : ''}`}>
                  <TabIcon className="h-5 w-5" />
                  {isActive && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,230,255,0.6)]" />
                  )}
                </div>
                <span className={`text-[10px] font-medium tracking-tight ${isActive ? 'text-cyan-300' : 'text-white/45'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

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
