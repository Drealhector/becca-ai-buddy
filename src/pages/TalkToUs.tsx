import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import beccaLogo from "@/assets/becca-b-logo.png";
import { ArrowLeft } from "lucide-react";

const TalkToUs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    countryCode: "+1",
    phoneNumber: "",
    role: "",
    callVolume: "",
    customFunction: "",
  });

  useEffect(() => {
    // Load VAPI widget script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@vapi-ai/client-sdk-react/dist/embed/widget.umd.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const openVapiChat = () => {
    // Create VAPI widget element
    const vapiWidget = document.createElement('vapi-widget');
    vapiWidget.setAttribute('public-key', '208b6005-0953-425b-a478-2748d49d484c');
    vapiWidget.setAttribute('assistant-id', 'b09cc3ec-1180-4b2a-a6c8-49f80bc10da8');
    vapiWidget.setAttribute('mode', 'chat');
    vapiWidget.setAttribute('theme', 'dark');
    vapiWidget.setAttribute('base-bg-color', '#000000');
    vapiWidget.setAttribute('accent-color', '#14B8A6');
    vapiWidget.setAttribute('cta-button-color', '#000000');
    vapiWidget.setAttribute('cta-button-text-color', '#ffffff');
    vapiWidget.setAttribute('border-radius', 'large');
    vapiWidget.setAttribute('size', 'full');
    vapiWidget.setAttribute('position', 'bottom-right');
    vapiWidget.setAttribute('title', 'CHAT WITH BECCA');
    vapiWidget.setAttribute('start-button-text', 'Start');
    vapiWidget.setAttribute('end-button-text', 'End Call');
    vapiWidget.setAttribute('chat-first-message', 'Hey, How can I help you today?');
    vapiWidget.setAttribute('chat-placeholder', 'Type your message...');
    vapiWidget.setAttribute('voice-show-transcript', 'true');
    vapiWidget.setAttribute('consent-required', 'false');
    
    document.body.appendChild(vapiWidget);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: `${formData.countryCode}${formData.phoneNumber}`,
          role: formData.role,
          callVolume: formData.callVolume,
          customFunction: formData.customFunction,
        }
      });

      if (error) throw error;

      toast({
        title: "Thank you!",
        description: "We'll get back to you soon.",
      });
      
      setFormData({
        fullName: "",
        email: "",
        countryCode: "+1",
        phoneNumber: "",
        role: "",
        callVolume: "",
        customFunction: "",
      });
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: "There was an issue submitting your form.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-indigo-200 relative">
      {/* Header */}
      <header className="relative z-10 container mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="text-slate-900 hover:bg-white/50"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Home
        </Button>
      </header>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Info Section */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src={beccaLogo} alt="B" className="h-10 w-10 drop-shadow-lg" />
              <h1 className="text-4xl font-bold text-slate-900">ECCA</h1>
            </div>
            <p className="text-xl text-slate-800 mb-3 font-semibold">
              Your AI Business Assistant That Never Sleeps
            </p>
            <p className="text-sm text-slate-700">
              BECCA is an advanced AI agent designed to handle customer conversations across all platforms - 
              phone calls, chat, WhatsApp, Instagram, Facebook, and Telegram. Available 24/7 to support your 
              business needs and scale with your growth.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="text-sm font-medium text-slate-900">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  className="mt-1.5 border-slate-300 focus:border-slate-400"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-slate-900">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="mt-1.5 border-slate-300 focus:border-slate-400"
                />
              </div>

              <div>
                <Label htmlFor="phoneNumber" className="text-sm font-medium text-slate-900">
                  Phone Number
                </Label>
                <div className="flex gap-2 mt-1.5">
                  <Select
                    value={formData.countryCode}
                    onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
                  >
                    <SelectTrigger className="w-24 border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+1">+1</SelectItem>
                      <SelectItem value="+234">+234</SelectItem>
                      <SelectItem value="+233">+233</SelectItem>
                      <SelectItem value="+44">+44</SelectItem>
                      <SelectItem value="+91">+91</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Enter phone number"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    required
                    className="flex-1 border-slate-300 focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-900 mb-2 block">
                  Role
                </Label>
                <RadioGroup
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  className="space-y-2"
                  required
                >
                  {["CXO", "VP", "Director", "Other"].map((role) => (
                    <div key={role} className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <RadioGroupItem value={role} id={`role-${role}`} />
                      <Label htmlFor={`role-${role}`} className="cursor-pointer flex-1 text-sm">
                        {role}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-900 mb-2 block">
                  Number of Support Calls (Monthly)
                </Label>
                <RadioGroup
                  value={formData.callVolume}
                  onValueChange={(value) => setFormData({ ...formData, callVolume: value })}
                  className="space-y-2"
                  required
                >
                  {["<50,000", "50,001-100,000", "100,001-500,000", "500,001-1,000,000", ">1,000,000"].map((range) => (
                    <div key={range} className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <RadioGroupItem value={range} id={`calls-${range}`} />
                      <Label htmlFor={`calls-${range}`} className="cursor-pointer flex-1 text-sm">
                        {range}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="customFunction" className="text-sm font-medium text-slate-900">
                  Custom Function for Becca to Automate
                </Label>
                <Textarea
                  id="customFunction"
                  value={formData.customFunction}
                  onChange={(e) => setFormData({ ...formData, customFunction: e.target.value })}
                  placeholder="Fully explain the automation needed"
                  rows={4}
                  required
                  className="mt-1.5 border-slate-300 focus:border-slate-400 resize-none"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-600 text-white hover:bg-slate-700 h-11"
                >
                  {loading ? "Submitting..." : "Submit"}
                </Button>
                <Button
                  type="button"
                  onClick={openVapiChat}
                  className="flex-1 bg-gradient-to-r from-indigo-200 to-blue-200 text-slate-900 hover:opacity-90 border-0 h-11 font-medium"
                >
                  Chat with Becca
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TalkToUs;
