import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import TalkToUs from "./pages/TalkToUs";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import PublicHub from "./pages/PublicHub";
import ChatPage from "./pages/ChatPage";
import CallPage from "./pages/CallPage";
import CallHectorPage from "./pages/CallHectorPage";
import ProductPage from "./pages/ProductPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/talk-to-us" element={<TalkToUs />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/billing" element={<Billing />} />
          <Route path="/:slug" element={<PublicHub />} />
          <Route path="/chat/:slug" element={<ChatPage />} />
          <Route path="/call/:slug" element={<CallPage />} />
          <Route path="/call-hector" element={<CallHectorPage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
