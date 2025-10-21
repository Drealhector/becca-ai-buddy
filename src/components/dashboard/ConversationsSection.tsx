import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const ConversationsSection = () => {
  const [conversations, setConversations] = useState<any[]>([]);

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
  }, []);

  const fetchConversations = async () => {
    try {
      const { data: convos } = await supabase
        .from("conversations")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(10);

      const conversationsWithMessages = await Promise.all(
        (convos || []).map(async (convo) => {
          const { data: messages } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", convo.id)
            .order("timestamp", { ascending: true });

          return { ...convo, messages: messages || [] };
        })
      );

      setConversations(conversationsWithMessages);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Conversations</h3>
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
                {convo.messages.slice(0, 3).map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`text-sm p-2 rounded ${
                      msg.role === "user"
                        ? "bg-muted ml-8"
                        : "bg-primary/10 mr-8"
                    }`}
                  >
                    <span className="font-medium">
                      {msg.role === "user" ? "User" : "BECCA"}:
                    </span>{" "}
                    {msg.content}
                  </div>
                ))}
                {convo.messages.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    + {convo.messages.length - 3} more messages
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default ConversationsSection;