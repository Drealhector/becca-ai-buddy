import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import beccaLogo from "@/assets/becca-b-logo.png";
import { ArrowLeft } from "lucide-react";

const TalkToUs = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const successMessageRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    countryCode: "+234",
    phoneNumber: "",
    role: "",
    callVolume: "",
    customFunction: "",
  });

  const openVapiChat = () => {
    // Load VAPI widget script dynamically when button is clicked
    const existingScript = document.querySelector('script[src*="vapi-ai"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@vapi-ai/client-sdk-react/dist/embed/widget.umd.js';
      script.async = true;
      script.onload = () => {
        createVapiWidget();
      };
      document.body.appendChild(script);
    } else {
      createVapiWidget();
    }
  };

  const createVapiWidget = () => {
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
    
    // Validate radio buttons manually
    if (!formData.role) {
      alert('Please select your role');
      return;
    }
    if (!formData.callVolume) {
      alert('Please select number of support calls');
      return;
    }
    
    setLoading(true);
    setShowSuccess(false);
    setShowError(false);

    const submissionData = {
      fullName: formData.fullName,
      email: formData.email,
      countryCode: formData.countryCode,
      phoneNumber: formData.phoneNumber,
      role: formData.role,
      supportCalls: formData.callVolume,
      customFunction: formData.customFunction || ""
    };

    try {
      const response = await fetch('https://drealhector334.app.n8n.cloud/webhook/form-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
        setShowSuccess(true);
        
        // Reset form
        setFormData({
          fullName: "",
          email: "",
          countryCode: "+234",
          phoneNumber: "",
          role: "",
          callVolume: "",
          customFunction: "",
        });

        // Scroll to success message
        setTimeout(() => {
          successMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        // Hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setShowError(true);
      
      // Hide error message after 5 seconds
      setTimeout(() => {
        setShowError(false);
      }, 5000);
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

          {/* Success Message */}
          {showSuccess && (
            <div
              ref={successMessageRef}
              className="bg-emerald-500 text-white p-5 rounded-lg mb-6 text-center shadow-lg"
            >
              <div className="text-lg font-bold mb-1">
                ✅ Success! Your submission has been received.
              </div>
              <div className="text-sm font-normal">
                Check your email for confirmation.
              </div>
            </div>
          )}

          {/* Error Message */}
          {showError && (
            <div className="bg-red-500 text-white p-5 rounded-lg mb-6 text-center shadow-lg">
              <div className="text-lg font-bold mb-1">
                ❌ Error! There was a problem submitting your form.
              </div>
              <div className="text-sm font-normal">
                Please try again.
              </div>
            </div>
          )}

          {/* Form */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-lg">
            <form onSubmit={handleSubmit} id="contactForm" className="space-y-4">
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
                  placeholder="becca@gmail.com"
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
                    <SelectTrigger className="w-32 border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {/* African Countries (Priority) */}
                      <SelectItem value="+234">🇳🇬 +234</SelectItem>
                      <SelectItem value="+233">🇬🇭 +233</SelectItem>
                      <SelectItem value="+27">🇿🇦 +27</SelectItem>
                      <SelectItem value="+254">🇰🇪 +254</SelectItem>
                      <SelectItem value="+237">🇨🇲 +237</SelectItem>
                      <SelectItem value="+255">🇹🇿 +255</SelectItem>
                      <SelectItem value="+256">🇺🇬 +256</SelectItem>
                      <SelectItem value="+20">🇪🇬 +20</SelectItem>
                      <SelectItem value="+251">🇪🇹 +251</SelectItem>
                      <SelectItem value="+225">🇨🇮 +225</SelectItem>
                      <SelectItem value="+221">🇸🇳 +221</SelectItem>
                      <SelectItem value="+250">🇷🇼 +250</SelectItem>
                      <SelectItem value="+212">🇲🇦 +212</SelectItem>
                      <SelectItem value="+213">🇩🇿 +213</SelectItem>
                      <SelectItem value="+216">🇹🇳 +216</SelectItem>
                      <SelectItem value="+260">🇿🇲 +260</SelectItem>
                      <SelectItem value="+263">🇿🇼 +263</SelectItem>
                      <SelectItem value="+265">🇲🇼 +265</SelectItem>
                      <SelectItem value="+267">🇧🇼 +267</SelectItem>
                      <SelectItem value="+231">🇱🇷 +231</SelectItem>
                      <SelectItem value="+232">🇸🇱 +232</SelectItem>
                      <SelectItem value="+220">🇬🇲 +220</SelectItem>
                      <SelectItem value="+229">🇧🇯 +229</SelectItem>
                      <SelectItem value="+228">🇹🇬 +228</SelectItem>
                      <SelectItem value="+227">🇳🇪 +227</SelectItem>
                      <SelectItem value="+226">🇧🇫 +226</SelectItem>
                      <SelectItem value="+223">🇲🇱 +223</SelectItem>
                      <SelectItem value="+252">🇸🇴 +252</SelectItem>
                      <SelectItem value="+211">🇸🇸 +211</SelectItem>
                      <SelectItem value="+249">🇸🇩 +249</SelectItem>
                      {/* Major International Countries */}
                      <SelectItem value="+1">🇺🇸 +1</SelectItem>
                      <SelectItem value="+44">🇬🇧 +44</SelectItem>
                      <SelectItem value="+91">🇮🇳 +91</SelectItem>
                      <SelectItem value="+86">🇨🇳 +86</SelectItem>
                      <SelectItem value="+81">🇯🇵 +81</SelectItem>
                      <SelectItem value="+49">🇩🇪 +49</SelectItem>
                      <SelectItem value="+33">🇫🇷 +33</SelectItem>
                      <SelectItem value="+39">🇮🇹 +39</SelectItem>
                      <SelectItem value="+34">🇪🇸 +34</SelectItem>
                      <SelectItem value="+7">🇷🇺 +7</SelectItem>
                      <SelectItem value="+55">🇧🇷 +55</SelectItem>
                      <SelectItem value="+52">🇲🇽 +52</SelectItem>
                      <SelectItem value="+61">🇦🇺 +61</SelectItem>
                      <SelectItem value="+82">🇰🇷 +82</SelectItem>
                      <SelectItem value="+971">🇦🇪 +971</SelectItem>
                      <SelectItem value="+966">🇸🇦 +966</SelectItem>
                      <SelectItem value="+65">🇸🇬 +65</SelectItem>
                      <SelectItem value="+60">🇲🇾 +60</SelectItem>
                      <SelectItem value="+62">🇮🇩 +62</SelectItem>
                      <SelectItem value="+63">🇵🇭 +63</SelectItem>
                      <SelectItem value="+66">🇹🇭 +66</SelectItem>
                      <SelectItem value="+84">🇻🇳 +84</SelectItem>
                      <SelectItem value="+92">🇵🇰 +92</SelectItem>
                      <SelectItem value="+880">🇧🇩 +880</SelectItem>
                      <SelectItem value="+90">🇹🇷 +90</SelectItem>
                      <SelectItem value="+98">🇮🇷 +98</SelectItem>
                      <SelectItem value="+972">🇮🇱 +972</SelectItem>
                      <SelectItem value="+31">🇳🇱 +31</SelectItem>
                      <SelectItem value="+32">🇧🇪 +32</SelectItem>
                      <SelectItem value="+41">🇨🇭 +41</SelectItem>
                      <SelectItem value="+43">🇦🇹 +43</SelectItem>
                      <SelectItem value="+45">🇩🇰 +45</SelectItem>
                      <SelectItem value="+46">🇸🇪 +46</SelectItem>
                      <SelectItem value="+47">🇳🇴 +47</SelectItem>
                      <SelectItem value="+358">🇫🇮 +358</SelectItem>
                      <SelectItem value="+48">🇵🇱 +48</SelectItem>
                      <SelectItem value="+351">🇵🇹 +351</SelectItem>
                      <SelectItem value="+30">🇬🇷 +30</SelectItem>
                      <SelectItem value="+353">🇮🇪 +353</SelectItem>
                      <SelectItem value="+64">🇳🇿 +64</SelectItem>
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
                      <Label htmlFor={`role-${role}`} className="cursor-pointer flex-1 text-sm text-slate-900">
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
                      <Label htmlFor={`calls-${range}`} className="cursor-pointer flex-1 text-sm text-slate-900">
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
                  placeholder="what you need automated in your business"
                  rows={5}
                  className="mt-1.5 border-slate-300 focus:border-slate-400 resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-600 text-white hover:bg-slate-700 h-11"
                >
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </form>

            {/* Chat with Becca Button - Below Form */}
            <div className="mt-4">
              <Button
                type="button"
                onClick={openVapiChat}
                className="w-full bg-gradient-to-r from-indigo-200 to-blue-200 text-slate-900 hover:opacity-90 border-0 h-11 font-medium"
              >
                Chat with Becca
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TalkToUs;
