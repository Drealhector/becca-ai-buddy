import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Wallet } from "lucide-react";

const WalletSection = () => {
  const [wallet, setWallet] = useState<any>(null);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const { data } = await supabase
        .from("wallet")
        .select("*")
        .limit(1)
        .single();
      setWallet(data);
    } catch (error) {
      console.error("Error fetching wallet:", error);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Wallet className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Wallet (Demo)</h3>
          <p className="text-sm text-muted-foreground">
            Mock sales tracking
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Total:</span>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ${wallet?.total || 0}
          </span>
        </div>

        {wallet?.history && Array.isArray(wallet.history) && wallet.history.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm font-medium mb-2">Recent Sales</p>
            <div className="space-y-1">
              {wallet.history.slice(0, 5).map((sale: string, index: number) => (
                <div key={index} className="text-sm text-muted-foreground">
                  Sale #{sale}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default WalletSection;