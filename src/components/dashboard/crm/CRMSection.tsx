import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Kanban, ClipboardList, BarChart3 } from "lucide-react";
import ContactsSection from "./ContactsSection";
import PipelineSection from "./PipelineSection";
import ActivitiesSection from "./ActivitiesSection";
import AnalyticsSection from "./AnalyticsSection";

const CRMSection = () => {
  const [activeTab, setActiveTab] = useState("contacts");

  const tabs = [
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "pipeline", label: "Pipeline", icon: Kanban },
    { id: "activities", label: "Activities", icon: ClipboardList },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-10 p-1 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(0,230,255,0.06) 0%, rgba(0,100,200,0.04) 100%)',
            border: '1px solid rgba(0,230,255,0.1)',
          }}>
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium rounded-lg
                transition-all duration-300 data-[state=active]:bg-cyan-500/15
                data-[state=active]:text-cyan-300 data-[state=active]:shadow-[0_0_12px_rgba(0,230,255,0.15)]
                text-white/40 hover:text-white/60"
              onClick={(e) => e.stopPropagation()}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-3">
          <TabsContent value="contacts" className="mt-0 focus-visible:outline-none">
            <ContactsSection />
          </TabsContent>
          <TabsContent value="pipeline" className="mt-0 focus-visible:outline-none">
            <PipelineSection />
          </TabsContent>
          <TabsContent value="activities" className="mt-0 focus-visible:outline-none">
            <ActivitiesSection />
          </TabsContent>
          <TabsContent value="analytics" className="mt-0 focus-visible:outline-none">
            <AnalyticsSection />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default CRMSection;
