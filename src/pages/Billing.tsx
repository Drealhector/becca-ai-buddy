import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const Billing = () => {
  const navigate = useNavigate();

  const tiers = [
    {
      name: "Free",
      price: "$0",
      features: [
        "Limited features",
        "Basic support",
        "1 channel",
        "100 messages/month",
      ],
      current: true,
    },
    {
      name: "Paid Tier 1",
      price: "$10",
      period: "/month",
      features: [
        "Higher limits",
        "Customization options",
        "3 channels",
        "1,000 messages/month",
        "Priority support",
      ],
    },
    {
      name: "Paid Tier 2",
      price: "$25",
      period: "/month",
      features: [
        "Unlimited features",
        "Advanced analytics",
        "Unlimited channels",
        "Unlimited messages",
        "24/7 Premium support",
        "Custom integrations",
      ],
    },
    {
      name: "Custom AI",
      price: "Contact us",
      features: [
        "Custom AI training",
        "Dedicated support",
        "Custom features",
        "SLA guarantees",
        "White-label options",
      ],
    },
  ];

  const handleUpgrade = () => {
    toast.info("Contact us to upgrade your plan");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Billing & Plans
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Choose Your Plan</h2>
          <p className="text-muted-foreground">
            Select the perfect plan for your business needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`p-6 ${
                tier.current
                  ? "border-primary shadow-elegant"
                  : "border-border"
              }`}
            >
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-muted-foreground ml-1">
                      {tier.period}
                    </span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {tier.current ? (
                <Button disabled className="w-full">
                  Current Plan
                </Button>
              ) : (
                <Button
                  onClick={handleUpgrade}
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  {tier.name === "Custom AI" ? "Contact Sales" : "Upgrade"}
                </Button>
              )}
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Billing;