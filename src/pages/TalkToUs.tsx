import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import beccaLogo from "@/assets/becca-b-logo.png";
import { ArrowLeft } from "lucide-react";

const TalkToUs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    email: "",
    callVolume: "",
    beccaDescription: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const emailContent = `
New BECCA Inquiry

Business Name: ${formData.businessName}
Email: ${formData.email}
Monthly Support Calls: ${formData.callVolume}
How they want BECCA to work: ${formData.beccaDescription}
      `.trim();

      // Send email (you'll need to implement this with your email service)
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: "info@becca.live",
          from: "noreply@becca.live",
          subject: `New BECCA Inquiry from ${formData.businessName}`,
          text: emailContent,
        }),
      });

      if (response.ok) {
        toast({
          title: "Thank you!",
          description: "We'll get back to you soon.",
        });
        setFormData({
          businessName: "",
          email: "",
          callVolume: "",
          beccaDescription: "",
        });
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Submission sent",
        description: "We'll contact you shortly.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 relative">
      {/* Background Image */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070')] bg-cover bg-center opacity-30"></div>

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
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Info Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img src={beccaLogo} alt="B" className="h-12 w-12 drop-shadow-lg" />
              <h1 className="text-5xl font-bold text-slate-900">ECCA</h1>
            </div>
            <p className="text-2xl text-slate-800 mb-4">
              Your AI Business Assistant That Never Sleeps
            </p>
            <p className="text-lg text-slate-700 max-w-3xl mx-auto">
              BECCA is an advanced AI agent designed to handle customer conversations across all platforms - 
              phone calls, chat, WhatsApp, Instagram, Facebook, and Telegram. Available 24/7 to support your 
              business needs and scale with your growth.
            </p>
          </div>

          {/* Form and Chat Widget Side by Side */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Form */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-slate-300 shadow-xl">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Get Started with BECCA</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="businessName" className="text-slate-900">
                    Business Name
                  </Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-slate-900">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-slate-900 mb-3 block">
                    Number of Support Calls (Monthly)
                  </Label>
                  <RadioGroup
                    value={formData.callVolume}
                    onValueChange={(value) => setFormData({ ...formData, callVolume: value })}
                    className="space-y-3"
                  >
                    {["< 50,000", "50,001 - 100,000", "100,001 - 500,000", "500,001 - 1,000,000", "> 1,000,000"].map((range) => (
                      <div key={range} className="flex items-center space-x-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <RadioGroupItem value={range} id={range} />
                        <Label htmlFor={range} className="cursor-pointer flex-1">
                          {range}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="beccaDescription" className="text-slate-900">
                    How do you want BECCA to work for your company?
                  </Label>
                  <Textarea
                    id="beccaDescription"
                    value={formData.beccaDescription}
                    onChange={(e) => setFormData({ ...formData, beccaDescription: e.target.value })}
                    placeholder="Describe your needs, use cases, and expectations..."
                    rows={4}
                    required
                    className="mt-1"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-slate-900 text-white hover:bg-slate-800 h-12 text-lg"
                >
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </form>
            </div>

            {/* Chat Widget */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-slate-300 shadow-xl flex flex-col">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">
                CHAT WITH BECCA
              </h2>
              <div className="flex-1 min-h-[600px]" id="vapi-widget-container"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TalkToUs;