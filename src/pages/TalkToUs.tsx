import React, { useState, useRef, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import FloatingAssistant from "@/components/dashboard/FloatingAssistant";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import NeuralBrain from "@/components/3d/NeuralBrain";
import beccaLogo from "@/assets/becca-new-logo.png";

const TalkToUs = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showBecca, setShowBecca] = useState(false);
  const [beccaTrigger, setBeccaTrigger] = useState(0);
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
    <div className="min-h-screen relative overflow-hidden bg-[#050a18]">
      {/* Full-page 3D Neural Brain Background */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0.5, 6], fov: 55 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#050a18']} />
          <fog attach="fog" args={['#050a18', 8, 18]} />
          <ambientLight intensity={0.15} />
          <pointLight position={[5, 5, 5]} intensity={0.3} color="#4488ff" />
          <pointLight position={[-5, -3, 3]} intensity={0.2} color="#8844ff" />
          <Suspense fallback={null}>
            <NeuralBrain />
          </Suspense>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={false}
            maxPolarAngle={Math.PI / 1.8}
            minPolarAngle={Math.PI / 2.5}
          />
        </Canvas>
      </div>

      {/* Vignette overlay for readability */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 20%, rgba(5,10,24,0.65) 80%, rgba(5,10,24,0.92) 100%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-6 pointer-events-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Home
        </Button>
      </header>

      {/* Content */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center pointer-events-none">
        {/* Box 1 — Outermost (logo + description) */}
        <div
          className="w-full rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/10 pointer-events-auto"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(8px)' }}
        >
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-4">
              <img src={beccaLogo} alt="Becca" style={{ height: '2.5rem' }} />
            </div>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 font-semibold text-center leading-relaxed">
              BECCA is an advanced AI brain designed to make calls, receive calls and integrate into any platform, website and social media accounts and handle interactions for businesses. Available 24/7 to support your business needs and scale with your growth.
            </p>
          </div>

          {/* Box 2 — Medium */}
          <div
            className="w-full max-w-4xl mx-auto rounded-2xl p-4 sm:p-5 lg:p-6 border border-white/10"
            style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}
          >
            {/* Box 3 — Smaller */}
            <div
              className="w-full max-w-2xl mx-auto rounded-2xl p-4 sm:p-5 lg:p-6 border border-white/10"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)' }}
            >
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

              {/* Box 4 — Form (innermost, smallest) */}
              <div className="w-full max-w-lg mx-auto rounded-2xl p-4 sm:p-6 border border-white/10 shadow-lg" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                <form onSubmit={handleSubmit} id="contactForm" className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="text-sm font-medium text-white/80">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-cyan-500/50"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-white/80">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="becca@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-cyan-500/50"
                />
              </div>

              <div>
                <Label htmlFor="phoneNumber" className="text-sm font-medium text-white/80">
                  Phone Number
                </Label>
                <div className="flex gap-2 mt-1.5">
                  <Select
                    value={formData.countryCode}
                    onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
                  >
                    <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
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
                    className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-white/80 mb-2 block">
                  Role
                </Label>
                <RadioGroup
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  className="space-y-2"
                  required
                >
                  {["CXO", "VP", "Director", "Other"].map((role) => (
                    <div key={role} className="flex items-center space-x-2 bg-white/5 p-3 rounded-lg border border-white/10">
                      <RadioGroupItem value={role} id={`role-${role}`} />
                      <Label htmlFor={`role-${role}`} className="cursor-pointer flex-1 text-sm text-white/80">
                        {role}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label className="text-sm font-medium text-white/80 mb-2 block">
                  Number of Support Calls (Monthly)
                </Label>
                <RadioGroup
                  value={formData.callVolume}
                  onValueChange={(value) => setFormData({ ...formData, callVolume: value })}
                  className="space-y-2"
                  required
                >
                  {["<50,000", "50,001-100,000", "100,001-500,000", "500,001-1,000,000", ">1,000,000"].map((range) => (
                    <div key={range} className="flex items-center space-x-2 bg-white/5 p-3 rounded-lg border border-white/10">
                      <RadioGroupItem value={range} id={`calls-${range}`} />
                      <Label htmlFor={`calls-${range}`} className="cursor-pointer flex-1 text-sm text-white/80">
                        {range}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="customFunction" className="text-sm font-medium text-white/80">
                  Custom Function for Becca to Automate
                </Label>
                <Textarea
                  id="customFunction"
                  value={formData.customFunction}
                  onChange={(e) => setFormData({ ...formData, customFunction: e.target.value })}
                  placeholder="what you need automated in your business"
                  rows={5}
                  className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-cyan-500/50 resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 h-11 shadow-[0_0_20px_rgba(93,213,237,0.15)] transition-transform active:scale-95"
                >
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </form>

                {/* Talk to Becca Button - Below Form */}
                <div className="mt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowBecca(true);
                      setBeccaTrigger(prev => prev + 1);
                    }}
                    className="w-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30 h-11 font-medium transition-transform active:scale-95"
                  >
                    Talk to Becca
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative sphere only — no AI assistant connected */}
      {showBecca && (
        <FloatingAssistant
          agentId=""
          initialPosition={{ x: window.innerWidth / 2 - 60, y: window.innerHeight / 2 - 60 }}
          activationTrigger={0}
        />
      )}
    </div>
  );
};

export default TalkToUs;
