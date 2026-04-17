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
import DesktopOverview from "@/components/dashboard/DesktopOverview";
import MobileOverview from "@/components/dashboard/MobileOverview";
import {
  Menu, X, LogOut, Phone, Link as LinkIcon, Settings, MessageSquare,
  Mic, Trash2, CreditCard, Brain, Palette, Share2, PhoneCall,
  ToggleLeft, Radio, Image, ChevronDown, ChevronRight,
  PanelLeftClose, PanelLeftOpen,
  Home as HomeIcon, BarChart3, Shield, HelpCircle, Bell, Info
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
  // Desktop-only: which view fills the main area. "home" = overview (greeting + stats + quick actions + activity + charts).
  // Any other value = render that single section full-bleed (other sections hidden).
  const [activeView, setActiveView] = useState<string>("home");
  // Lightweight ripple origin for the in-app expand animation when a quick-action is clicked
  const [expandOrigin, setExpandOrigin] = useState<{ x: number; y: number; key: number } | null>(null);
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

  // ─────────────────────────────────────────────────────────────────────────────
  // DESKTOP-ONLY: Becca-native sidebar (mobile drawer untouched, uses sectionGroups above)
  // Groups reflect BECCA's actual domain: an AI assistant for real estate businesses.
  // Each item maps to a real Becca section. Clicking opens that section full-bleed.
  // ─────────────────────────────────────────────────────────────────────────────
  type DesktopItem = { id: string; label: string; icon: any; viewId: string };
  type DesktopGroup = { label: string; icon: any; items: DesktopItem[] };
  const desktopSectionGroups: DesktopGroup[] = [
    {
      label: "OVERVIEW",
      icon: HomeIcon,
      items: [
        { id: "home", label: "Home", icon: HomeIcon, viewId: "home" },
      ],
    },
    {
      label: "CONTROL",
      icon: ToggleLeft,
      items: [
        { id: "master-switch", label: "Master Switch", icon: ToggleLeft, viewId: "master-switch" },
        { id: "channels", label: "Channels", icon: Radio, viewId: "channels" },
      ],
    },
    {
      label: "CONTACTS",
      icon: Users,
      items: [
        { id: "crm", label: "CRM", icon: Users, viewId: "crm" },
        { id: "properties", label: "Properties", icon: Building2, viewId: "properties" },
      ],
    },
    {
      label: "CONVERSATIONS",
      icon: MessageSquare,
      items: [
        { id: "conversations", label: "Conversations", icon: MessageSquare, viewId: "conversations" },
        { id: "phone-calls", label: "Phone Calls", icon: PhoneCall, viewId: "phone-calls" },
      ],
    },
    {
      label: "PERSONALITY",
      icon: Brain,
      items: [
        { id: "logo-voice", label: "Voice", icon: Mic, viewId: "logo-voice" },
        { id: "ai-personality", label: "AI Personality", icon: Brain, viewId: "ai-personality" },
      ],
    },
    {
      label: "BRAND",
      icon: Image,
      items: [
        { id: "hub-background", label: "Hub Design", icon: Image, viewId: "hub-background" },
        { id: "links", label: "Shareable Links", icon: Share2, viewId: "links" },
      ],
    },
  ];

  // All groups expanded by default — small enough that flat exposure aids discoverability
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(desktopSectionGroups.map((g) => [g.label, true]))
  );
  const toggleGroup = (label: string) => setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  // Centralized navigation: switch the in-page view. Triggers cross-fade animation via key bump.
  const openView = (viewId: string, originX?: number, originY?: number) => {
    if (originX !== undefined && originY !== undefined) {
      setExpandOrigin({ x: originX, y: originY, key: Date.now() });
    }
    setActiveView(viewId);
    setActiveSection(viewId === "home" ? "master-switch" : viewId);
    // Auto-expand the parent group in the sidebar so the active item is visible
    const parentGroup = desktopSectionGroups.find((g) => g.items.some((i) => i.viewId === viewId));
    if (parentGroup) setExpandedGroups((prev) => ({ ...prev, [parentGroup.label]: true }));
    // Scroll to top so the new section is in view
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
    // Close drawer first, then scroll after a short delay to let the drawer animation finish
    setSidebarOpen(false);
    setActiveSection(id);
    // Use a small delay to let the drawer collapse before scrolling
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        const headerOffset = 72;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        // Auto-reveal the card by clicking it if it's not alwaysOpen
        setTimeout(() => {
          const card = element.querySelector('[class*="cursor-pointer"]') as HTMLElement | null;
          if (card) card.click();
        }, 500);
      }
    }, 100);
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
      {/* Mobile drawer backdrop */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300
          ${sidebarOpen ? 'bg-black/70 backdrop-blur-sm pointer-events-auto' : 'bg-transparent pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile drawer sidebar (slides in from left) */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-[65] lg:hidden w-[280px] flex flex-col transition-transform duration-400 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          background: 'linear-gradient(180deg, rgba(28,48,82,0.99) 0%, rgba(22,40,72,0.99) 50%, rgba(18,34,64,0.99) 100%)',
          borderRight: '1px solid rgba(0,230,255,0.25)',
          boxShadow: '8px 0 40px rgba(0,0,0,0.5), 2px 0 0 rgba(0,230,255,0.15)',
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <img src={beccaBLogo} alt="B" className="w-8 h-8" style={{ filter: 'drop-shadow(0 0 8px rgba(0,230,255,0.5))' }} />
            <span className="text-white text-base font-semibold">Dashboard</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer nav — uses the same Becca-native groups as desktop, opens sections full-bleed */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4 scrollbar-none">
          {desktopSectionGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-bold text-cyan-300/80 uppercase tracking-[0.2em] px-2 mb-2 capitalize">{group.label.toLowerCase()}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const IconComp = item.icon;
                  const active = activeView === item.viewId;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { openView(item.viewId); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98]
                        ${active ? 'bg-cyan-500/15 text-cyan-200' : 'text-white/85 hover:text-white hover:bg-white/[0.06]'}`}
                    >
                      <IconComp className={`h-[18px] w-[18px] flex-shrink-0 ${active ? 'text-cyan-400' : 'text-white/70'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Drawer footer */}
        <div className="border-t border-white/10 p-3 space-y-1">
          <button onClick={() => { navigate("/dashboard/billing"); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-white/75 hover:text-white hover:bg-white/[0.06] transition-all active:scale-[0.98]">
            <CreditCard className="h-[18px] w-[18px]" /><span>Billing</span>
          </button>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-all active:scale-[0.98]">
            <LogOut className="h-[18px] w-[18px]" /><span>Sign Out</span>
          </button>
        </div>
      </aside>

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

        {/* Nav — Gangmates-style 8 groups with expandable subitems */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-none">
          {desktopSectionGroups.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = !sidebarCollapsed || sidebarOpen;
            const isOpen = !!expandedGroups[group.label];
            const hasMultipleItems = group.items.length > 1;
            // For groups with single item (like OVERVIEW > Home), render as flat clickable item
            if (!hasMultipleItems && group.items.length === 1) {
              const item = group.items[0];
              const ItemIcon = item.icon || GroupIcon;
              const isActive = activeView === item.viewId;
              return (
                <button
                  key={group.label}
                  onClick={() => openView(item.viewId)}
                  className={`group/nav w-full flex items-center rounded-lg text-sm font-medium relative overflow-hidden
                    transition-all duration-300 active:scale-[0.96]
                    ${isExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5'}
                    ${isActive
                      ? 'text-cyan-200 bg-gradient-to-r from-cyan-500/15 to-transparent'
                      : 'text-white/85 hover:text-white hover:bg-white/[0.06]'}`}
                  title={!isExpanded ? item.label : undefined}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-cyan-400"
                      style={{ boxShadow: '0 0 6px rgba(0,230,255,0.6), 0 0 12px rgba(0,230,255,0.3)' }} />
                  )}
                  <ItemIcon className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? 'text-cyan-400 drop-shadow-[0_0_4px_rgba(0,230,255,0.5)]' : 'text-white/70 group-hover/nav:text-white'}`} />
                  {isExpanded && <span className="truncate">{item.label}</span>}
                </button>
              );
            }

            return (
              <div key={group.label}>
                {/* Group header (collapsible) */}
                {isExpanded ? (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.04] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <GroupIcon className="h-[18px] w-[18px] text-white/70" />
                      <span className="capitalize">{group.label.toLowerCase()}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-white/40 transition-transform duration-300 ${isOpen ? '' : '-rotate-90'}`} />
                  </button>
                ) : (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex justify-center py-2.5 rounded-lg text-white/70 hover:text-cyan-300 hover:bg-white/[0.04] transition-all"
                    title={group.label}
                  >
                    <GroupIcon className="h-[18px] w-[18px]" />
                  </button>
                )}
                {/* Subitems */}
                {isExpanded && isOpen && (
                  <div className="mt-0.5 ml-3 pl-3 border-l border-white/[0.06] space-y-0.5">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = activeView === item.viewId;
                      return (
                        <button
                          key={item.id}
                          onClick={() => openView(item.viewId)}
                          className={`group/nav w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium relative overflow-hidden
                            transition-all duration-300 active:scale-[0.97]
                            ${isActive
                              ? 'text-cyan-200 bg-cyan-500/10'
                              : 'text-white/65 hover:text-white hover:bg-white/[0.04]'}`}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-cyan-400"
                              style={{ boxShadow: '0 0 6px rgba(0,230,255,0.6)' }} />
                          )}
                          <ItemIcon className={`h-[15px] w-[15px] flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-white/55 group-hover/nav:text-white/80'}`} />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

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

      {/* ===== MOBILE HEADER ONLY — desktop has no top bar ===== */}
      <header className="lg:hidden sticky top-0 z-30 transition-all duration-300"
        style={{ background: 'rgba(4,10,20,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,230,255,0.08)' }}>
        <div className="flex items-center justify-between px-3 h-14">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center p-2 rounded-lg text-white/80 hover:text-cyan-300 hover:bg-white/5 transition-all active:scale-90"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <img src={beccaBLogo} alt="B" className="w-7 h-7 flex-shrink-0" style={{ filter: 'drop-shadow(0 0 6px rgba(0,230,255,0.5))' }} />
              <span className="text-white text-base font-semibold truncate">Dashboard</span>
            </div>
          </div>
          {/* Mobile right side: live "Listening" wave indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(0,230,255,0.08) 0%, rgba(0,140,200,0.04) 100%)',
              border: '1px solid rgba(0,230,255,0.18)',
            }}>
            <div className="flex items-end gap-[2px] h-3">
              <div className="w-[2px] bg-cyan-400 rounded-full" style={{ animation: 'becca-wave 1.2s ease-in-out infinite' }} />
              <div className="w-[2px] bg-cyan-300 rounded-full" style={{ animation: 'becca-wave 1.2s ease-in-out infinite', animationDelay: '0.15s' }} />
              <div className="w-[2px] bg-cyan-400 rounded-full" style={{ animation: 'becca-wave 1.2s ease-in-out infinite', animationDelay: '0.3s' }} />
              <div className="w-[2px] bg-cyan-300 rounded-full" style={{ animation: 'becca-wave 1.2s ease-in-out infinite', animationDelay: '0.45s' }} />
            </div>
            <span className="text-[10px] font-semibold text-cyan-200/85 tracking-wide">Live</span>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className={`relative z-10 transition-all duration-300 ${mainPl}`}>
        <div className="w-full px-3 sm:px-5 lg:px-6 py-3 sm:py-5 space-y-3 sm:space-y-5">

          {/* ═══════════════════════════════════════════════════════════════════
              MOBILE LAYOUT — overview + click-to-open-section (mirrors desktop UX).
              Hamburger → drawer sidebar opens individual sections.
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="lg:hidden">
            {/* Click ripple anchored to tap point */}
            {expandOrigin && (
              <div
                key={expandOrigin.key}
                className="fixed pointer-events-none z-[200]"
                style={{
                  left: expandOrigin.x - 40,
                  top: expandOrigin.y - 40,
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(0,230,255,0.5) 0%, rgba(0,230,255,0.15) 40%, transparent 70%)',
                  animation: 'becca-expand-ripple 700ms cubic-bezier(0.23,1,0.32,1) forwards',
                }}
              />
            )}

            <div key={`m-${activeView}`} className="becca-view-enter space-y-3">
              {activeView === "home" && (
                <MobileOverview
                  businessName={sessionStorage.getItem("becca_business_name") || ""}
                  openView={(viewId, x, y) => openView(viewId, x, y)}
                />
              )}

              {/* Active section rendered with a back button */}
              {activeView !== "home" && (
                <>
                  <button
                    onClick={() => openView("home")}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-cyan-300/80 hover:text-cyan-200 active:scale-95 transition-all"
                    style={{
                      background: 'rgba(0,230,255,0.06)',
                      border: '1px solid rgba(0,230,255,0.18)',
                    }}>
                    <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                    <span>Back to Home</span>
                  </button>

                  {activeView === "master-switch" && (
                    <SectionCard id="master-switch" title="Master Switch" icon={ToggleLeft} alwaysOpen
                      infoText="The power button for BECCA. Turn it ON to activate across all platforms, OFF to pause everything.">
                      <MasterSwitch />
                    </SectionCard>
                  )}
                  {activeView === "channels" && (
                    <SectionCard id="channels" title="Channels" icon={Radio} alwaysOpen
                      infoText="Choose which platforms BECCA responds on — WhatsApp, Instagram, Facebook, or Telegram.">
                      <ChannelToggles />
                      <div className="mt-4"><SocialConnectSection /></div>
                    </SectionCard>
                  )}
                  {activeView === "properties" && (
                    <SectionCard id="properties" title="Properties" icon={Building2} alwaysOpen
                      infoText="Manage your real estate listings — apartments, houses, land, and commercial properties.">
                      <PropertiesSection />
                    </SectionCard>
                  )}
                  {activeView === "crm" && (
                    <SectionCard id="crm" title="CRM" icon={Users} alwaysOpen
                      infoText="Manage contacts, pipeline, follow-ups, and analytics — your full real estate command center.">
                      <CRMSection />
                    </SectionCard>
                  )}
                  {activeView === "conversations" && (
                    <SectionCard id="conversations" title="Conversations" icon={MessageSquare} alwaysOpen
                      infoText="Monitor all customer conversations across platforms. Click any chat to read the full transcript.">
                      <ConversationsSection />
                    </SectionCard>
                  )}
                  {activeView === "phone-calls" && (
                    <SectionCard id="phone-calls" title="Phone Calls" icon={PhoneCall} alwaysOpen
                      infoText="Manage inbound/outbound calls, view call history, and access full transcripts.">
                      <PhoneCallSection />
                    </SectionCard>
                  )}
                  {activeView === "logo-voice" && (
                    <SectionCard id="logo-voice" title="Voice Management" icon={Mic} alwaysOpen
                      infoText="Customize how BECCA sounds on calls. Upload your own voice or choose from pre-built options.">
                      <VoiceManagementSection />
                    </SectionCard>
                  )}
                  {activeView === "ai-personality" && (
                    <SectionCard id="ai-personality" title="AI Personality" icon={Brain} alwaysOpen
                      infoText="Define how BECCA talks and behaves. The more specific, the better she matches your brand.">
                      <AIPersonalitySection />
                    </SectionCard>
                  )}
                  {activeView === "hub-background" && (
                    <SectionCard id="hub-background" title="Hub Design" icon={Image} alwaysOpen
                      infoText="Customize the look of your public hub page with uploaded or AI-generated backgrounds.">
                      <HubBackgroundGenerator />
                    </SectionCard>
                  )}
                  {activeView === "links" && (
                    <SectionCard id="links" title="Shareable Links" icon={Share2} alwaysOpen
                      infoText="Copy and share links for your hub, chat, and call pages anywhere you want customers to reach you.">
                      <CopyableLinks />
                    </SectionCard>
                  )}
                </>
              )}
            </div>

            <div className="h-20" />

            {/* Mobile footer */}
            <footer className="flex flex-col items-center justify-center gap-1 pt-4 pb-3 text-[10px] text-white/35"
              style={{ borderTop: '1px solid rgba(0,230,255,0.06)' }}>
              <div>© {new Date().getFullYear()} BECCA</div>
              <div className="flex items-center gap-1">
                <Info className="h-2.5 w-2.5 text-cyan-400/60" />
                <span className="text-white/45 tabular-nums">v2026.04.17</span>
              </div>
            </footer>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              DESKTOP LAYOUT — single-view: either the home overview OR ONE section
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="hidden lg:block">
            {/* Click-origin ripple (animation when a quick action expands into the section) */}
            {expandOrigin && (
              <div
                key={expandOrigin.key}
                className="fixed pointer-events-none z-[200]"
                style={{
                  left: expandOrigin.x - 40,
                  top: expandOrigin.y - 40,
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(0,230,255,0.5) 0%, rgba(0,230,255,0.15) 40%, transparent 70%)',
                  animation: 'becca-expand-ripple 700ms cubic-bezier(0.23,1,0.32,1) forwards',
                }}
              />
            )}

            {/* Cross-fade wrapper. Key changes per view → React unmounts old + mounts new with the entry animation. */}
            <div key={activeView} className="becca-view-enter space-y-5">
              {activeView === "home" && (
                <DesktopOverview
                  businessName={sessionStorage.getItem("becca_business_name") || ""}
                  openView={(viewId, x, y) => openView(viewId, x, y)}
                />
              )}

              {activeView === "master-switch" && (
                <SectionCard id="master-switch" title="Master Switch" icon={ToggleLeft} alwaysOpen
                  infoText="The power button for BECCA. Turn it ON to activate across all platforms, OFF to pause everything.">
                  <MasterSwitch />
                </SectionCard>
              )}
              {activeView === "channels" && (
                <SectionCard id="channels" title="Channels" icon={Radio} alwaysOpen
                  infoText="Choose which platforms BECCA responds on — WhatsApp, Instagram, Facebook, or Telegram.">
                  <ChannelToggles />
                  <div className="mt-4"><SocialConnectSection /></div>
                </SectionCard>
              )}
              {activeView === "properties" && (
                <SectionCard id="properties" title="Properties" icon={Building2} alwaysOpen
                  infoText="Manage your real estate listings — apartments, houses, land, and commercial properties.">
                  <PropertiesSection />
                </SectionCard>
              )}
              {activeView === "crm" && (
                <SectionCard id="crm" title="CRM" icon={Users} alwaysOpen
                  infoText="Manage contacts, pipeline, follow-ups, and analytics — your full real estate command center.">
                  <CRMSection />
                </SectionCard>
              )}
              {activeView === "conversations" && (
                <SectionCard id="conversations" title="Conversations" icon={MessageSquare} alwaysOpen
                  infoText="Monitor all customer conversations across platforms. Click any chat to read the full transcript.">
                  <ConversationsSection />
                </SectionCard>
              )}
              {activeView === "phone-calls" && (
                <SectionCard id="phone-calls" title="Phone Calls" icon={PhoneCall} alwaysOpen
                  infoText="Manage inbound/outbound calls, view call history, and access full transcripts.">
                  <PhoneCallSection />
                </SectionCard>
              )}
              {activeView === "logo-voice" && (
                <SectionCard id="logo-voice" title="Voice Management" icon={Mic} alwaysOpen
                  infoText="Customize how BECCA sounds on calls. Upload your own voice or choose from pre-built options.">
                  <VoiceManagementSection />
                </SectionCard>
              )}
              {activeView === "ai-personality" && (
                <SectionCard id="ai-personality" title="AI Personality" icon={Brain} alwaysOpen
                  infoText="Define how BECCA talks and behaves. The more specific, the better she matches your brand.">
                  <AIPersonalitySection />
                </SectionCard>
              )}
              {activeView === "hub-background" && (
                <SectionCard id="hub-background" title="Hub Design" icon={Image} alwaysOpen
                  infoText="Customize the look of your public hub page with uploaded or AI-generated backgrounds.">
                  <HubBackgroundGenerator />
                </SectionCard>
              )}
              {activeView === "links" && (
                <SectionCard id="links" title="Shareable Links" icon={Share2} alwaysOpen
                  infoText="Copy and share links for your hub, chat, and call pages anywhere you want customers to reach you.">
                  <CopyableLinks />
                </SectionCard>
              )}
            </div>

            <div className="h-20" />

            {/* Desktop footer */}
            <footer className="flex flex-col items-center justify-center gap-1 pt-6 pb-4 text-[11px] text-white/35"
              style={{ borderTop: '1px solid rgba(0,230,255,0.06)' }}>
              <div>© {new Date().getFullYear()} BECCA. All rights reserved.</div>
              <div className="flex items-center gap-1.5">
                <Info className="h-3 w-3 text-cyan-400/60" />
                <span className="text-white/45 tabular-nums">Version: 2026.04.17</span>
                <ChevronDown className="h-3 w-3 text-white/30" />
              </div>
            </footer>
          </div>
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

        /* View entry — fade + lift, used when activeView changes (key swap forces remount) */
        @keyframes becca-view-enter {
          0%   { opacity: 0; transform: translateY(12px) scale(0.985); filter: blur(2px); }
          60%  { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .becca-view-enter { animation: becca-view-enter 460ms cubic-bezier(0.23,1,0.32,1) both; }

        /* Click-origin ripple — anchored to where the user clicked the quick-action icon */
        @keyframes becca-expand-ripple {
          0%   { opacity: 0.85; transform: scale(0.4); }
          50%  { opacity: 0.55; }
          100% { opacity: 0;    transform: scale(28); }
        }

        /* Brain hero — pulsing ring around the orb */
        @keyframes becca-brain-pulse {
          0%   { transform: scale(1);   opacity: 0.85; }
          70%  { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        /* Brain hero — softly drifting background blobs */
        @keyframes becca-brain-blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(20px, -10px) scale(1.08); }
          66%      { transform: translate(-15px, 12px) scale(0.95); }
        }

        /* Brain hero — live status dot */
        @keyframes becca-live-dot {
          0%, 100% { opacity: 1;   transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.85); }
        }

        /* Header — audio waveform bars (Becca "listening" indicator) */
        @keyframes becca-wave {
          0%, 100% { height: 30%; }
          50%      { height: 100%; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
