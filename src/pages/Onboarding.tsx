import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    business_name: "",
    business_description: "",
    business_industry: "",
    target_audience: "",
    key_services: "",
    business_hours: "",
    assistant_personality: "",
    special_instructions: "",
    tone: "friendly and professional",
    greeting: "",
  });

  useEffect(() => {
    // Generate a demo user ID for development
    setUserId("demo-user-id");
  }, []);

  const calculateStrength = (): string => {
    const filledFields = Object.values(formData).filter(val => val.trim() !== "").length;
    const totalFields = Object.keys(formData).length;
    const percentage = (filledFields / totalFields) * 100;

    if (percentage < 40) return "weak";
    if (percentage < 60) return "moderate";
    if (percentage < 80) return "strong";
    return "very strong";
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "weak": return "text-destructive";
      case "moderate": return "text-yellow-500";
      case "strong": return "text-blue-500";
      case "very strong": return "text-green-500";
      default: return "";
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!userId) return;

    const strength = calculateStrength();

    try {
      // Create customization
      const { error: customError } = await supabase
        .from("customizations")
        .insert({
          ...formData,
          setup_strength: strength,
        });

      if (customError) throw customError;

      // Mark onboarding complete
      const { error: onboardError } = await supabase
        .from("user_onboarding")
        .insert({
          user_id: userId,
          onboarding_completed: true,
          completed_at: new Date().toISOString(),
        });

      if (onboardError) throw onboardError;

      toast.success("Setup complete! Welcome to BECCA!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save setup");
    }
  };

  const strength = calculateStrength();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card rounded-2xl shadow-depth p-8 animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full mb-4 shadow-glow">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to BECCA</h1>
          <p className="text-muted-foreground">Let's set up your AI Brain</p>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 w-16 rounded-full transition-all ${
                  step <= currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div>
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="e.g., Hector's Shoes"
              />
            </div>
            <div>
              <Label htmlFor="business_description">What does your business do? *</Label>
              <Textarea
                id="business_description"
                value={formData.business_description}
                onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
                placeholder="Describe your business, products, or services..."
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="business_industry">Industry</Label>
              <Input
                id="business_industry"
                value={formData.business_industry}
                onChange={(e) => setFormData({ ...formData, business_industry: e.target.value })}
                placeholder="e.g., E-commerce, Healthcare, Education"
              />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-semibold mb-4">Your Customers</h2>
            <div>
              <Label htmlFor="target_audience">Who are your customers?</Label>
              <Textarea
                id="target_audience"
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                placeholder="Describe your target audience, demographics, pain points..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="key_services">What are your key offerings?</Label>
              <Textarea
                id="key_services"
                value={formData.key_services}
                onChange={(e) => setFormData({ ...formData, key_services: e.target.value })}
                placeholder="List your main products or services..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="business_hours">Business Hours</Label>
              <Input
                id="business_hours"
                value={formData.business_hours}
                onChange={(e) => setFormData({ ...formData, business_hours: e.target.value })}
                placeholder="e.g., Mon-Fri 9AM-5PM EST"
              />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-semibold mb-4">Assistant Personality</h2>
            <div>
              <Label htmlFor="assistant_personality">How should your assistant sound?</Label>
              <Textarea
                id="assistant_personality"
                value={formData.assistant_personality}
                onChange={(e) => setFormData({ ...formData, assistant_personality: e.target.value })}
                placeholder="e.g., Professional but friendly, enthusiastic, helpful..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="tone">Tone</Label>
              <Input
                id="tone"
                value={formData.tone}
                onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                placeholder="e.g., friendly and professional"
              />
            </div>
            <div>
              <Label htmlFor="greeting">Greeting Message</Label>
              <Input
                id="greeting"
                value={formData.greeting}
                onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                placeholder="Hi! I'm your AI Brain. How can I help?"
              />
            </div>
            <div>
              <Label htmlFor="special_instructions">Special Instructions (Optional)</Label>
              <Textarea
                id="special_instructions"
                value={formData.special_instructions}
                onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                placeholder="Any specific rules, FAQs, or guidance for your assistant..."
                rows={4}
              />
            </div>
            <div className="mt-6 p-4 bg-gradient-card rounded-lg border border-border">
              <Label className="text-sm font-medium">Setup Strength</Label>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-primary transition-all"
                    style={{
                      width: `${(Object.values(formData).filter(v => v.trim() !== "").length / Object.keys(formData).length) * 100}%`
                    }}
                  />
                </div>
                <span className={`text-sm font-semibold capitalize ${getStrengthColor(strength)}`}>
                  {strength}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                More information helps your assistant provide better responses
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          {currentStep < 3 ? (
            <Button onClick={handleNext} className="gap-2">
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="gap-2">
              Complete Setup
              <Sparkles className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
