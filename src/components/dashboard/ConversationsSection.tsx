import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain } from "lucide-react";
import { AnalyzeConversationsDialog } from "./AnalyzeConversationsDialog";

const ConversationsSection = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false);

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel("messages-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPlatform]);

  const fetchConversations = async () => {
    try {
      if (selectedPlatform === "all") {
        // Fetch all conversations across all platforms
        const { data: allConvos } = await supabase
          .from("conversations")
          .select("*")
          .order("start_time", { ascending: false })
          .limit(20);

        // For each conversation, fetch the latest messages
        const conversationsWithMessages = await Promise.all(
          (allConvos || []).map(async (convo) => {
            const { data: messages } = await supabase
              .from("messages")
              .select("*")
              .eq("conversation_id", convo.id)
              .order("timestamp", { ascending: true })
              .limit(15);

            return { 
              ...convo, 
              messages: messages || [],
              latest_message_time: messages && messages.length > 0 
                ? messages[messages.length - 1].timestamp 
                : convo.start_time
            };
          })
        );

        // Sort by latest message timestamp (most recent first)
        conversationsWithMessages.sort((a, b) => 
          new Date(b.latest_message_time).getTime() - new Date(a.latest_message_time).getTime()
        );

        setConversations(conversationsWithMessages);
      } else {
        // For specific platform, fetch conversations with last 15 messages each
        let query = supabase
          .from("conversations")
          .select("*")
          .eq("platform", selectedPlatform)
          .order("start_time", { ascending: false })
          .limit(10);

        const { data: convos } = await query;

        const conversationsWithMessages = await Promise.all(
          (convos || []).map(async (convo) => {
            const { data: messages } = await supabase
              .from("messages")
              .select("*")
              .eq("conversation_id", convo.id)
              .order("timestamp", { ascending: true })
              .limit(15);

            return { ...convo, messages: messages || [] };
          })
        );

        setConversations(conversationsWithMessages);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Conversations</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnalyzeDialogOpen(true)}
            className="gap-2"
          >
            <Brain className="h-4 w-4" />
            Analyze
          </Button>
        </div>
      <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
        <SelectTrigger className="w-full mb-4">
          <SelectValue placeholder="Select platform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Platforms</SelectItem>
          <SelectItem value="web">Web Chat</SelectItem>
          <SelectItem value="whatsapp">WhatsApp</SelectItem>
          <SelectItem value="instagram">Instagram</SelectItem>
          <SelectItem value="facebook">Facebook</SelectItem>
          <SelectItem value="telegram">Telegram</SelectItem>
        </SelectContent>
      </Select>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No conversations yet
          </p>
        ) : (
          conversations.map((convo) => (
            <div
              key={convo.id}
              className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{convo.platform || "web"}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(convo.start_time), "MMM dd, HH:mm")}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {convo.messages.map((msg: any) => (
                  <div key={msg.id} className="space-y-1">
                    {selectedPlatform === "all" && (
                      <Badge variant="outline" className="text-xs">
                        {msg.platform}
                      </Badge>
                    )}
                    <div
                      className={`text-sm p-3 rounded-lg ${
                        msg.role === "user"
                          ? "bg-muted ml-8"
                          : "bg-primary/10 mr-8"
                      }`}
                    >
                      <span className="font-semibold text-xs block mb-1">
                        {msg.role === "user" 
                          ? (msg.sender_name || "Customer")
                          : "Becca"
                        }
                      </span>
                      <p>{msg.content}</p>
                      <span className="text-xs text-muted-foreground block mt-1">
                        {format(new Date(msg.timestamp), "HH:mm")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>

    <AnalyzeConversationsDialog
      open={analyzeDialogOpen}
      onOpenChange={setAnalyzeDialogOpen}
    />
    </>
  );
};

export default ConversationsSection;