import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import bLogo from "@/assets/b-logo.png";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        
        setFormData({
          fullName: "",
          email: "",
          countryCode: "+234",
          phoneNumber: "",
          role: "",
          callVolume: "",
          customFunction: "",
        });

        setTimeout(() => {
          successMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setShowError(true);
      
      setTimeout(() => {
        setShowError(false);
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Faint BECCA Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none">
        <span className="text-[20rem] font-bold text-slate-900">BECCA</span>
      </div>

      {/* Header */}
      <header className="relative z-10 container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={bLogo} alt="B" className="h-10 w-10" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
          <span className="text-slate-900 text-2xl font-bold">ECCA</span>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-slate-900 hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
          <Button
            onClick={() => navigate("/auth")}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            Sign in
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          {/* Left Side - Content */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight">
              FULLY CUSTOMIZABLE AI BRAIN FOR B2B
            </h1>
            <p className="text-xl text-slate-700">
              THAT CAN BE INTEGRATED ANYWHERE DIGITALLY.
            </p>
          </div>

          {/* Right Side - Form with Nature Background */}
          <div className="relative">
            <div 
              className="absolute inset-0 rounded-2xl"
              style={{
                backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            
            {/* Form Container */}
            <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
              {/* Success Message */}
              {showSuccess && (
                <div
                  ref={successMessageRef}
                  className="bg-emerald-500 text-white p-4 rounded-lg mb-6 text-center"
                >
                  <div className="text-lg font-bold">✅ Success!</div>
                  <div className="text-sm">Check your email for confirmation.</div>
                </div>
              )}

              {/* Error Message */}
              {showError && (
                <div className="bg-red-500 text-white p-4 rounded-lg mb-6 text-center">
                  <div className="text-lg font-bold">❌ Error!</div>
                  <div className="text-sm">Please try again.</div>
                </div>
              )}

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
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-slate-900">
                    Email
                  </Label>
                  <div className="text-xs text-slate-600 mb-1">Work email</div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@gigaml.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="mt-1"
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
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="+1">🇺🇸 +1</SelectItem>
                        <SelectItem value="+234">🇳🇬 +234</SelectItem>
                        <SelectItem value="+44">🇬🇧 +44</SelectItem>
                        <SelectItem value="+91">🇮🇳 +91</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="Enter phone number"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      required
                      className="flex-1"
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
                  >
                    {["< 50,000", "50,001 - 100,000", "100,001 - 500,000", "500,001 - 1,000,000", "> 1,000,000"].map((range) => (
                      <div key={range} className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <RadioGroupItem value={range} id={`calls-${range}`} />
                        <Label htmlFor={`calls-${range}`} className="cursor-pointer flex-1 text-sm">
                          {range}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-600 text-white hover:bg-slate-700 h-12 text-base font-medium"
                >
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TalkToUs;