import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, MessageSquare } from "lucide-react";
import { AnalyzeConversationsDialog } from "./AnalyzeConversationsDialog";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const ConversationsSection = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false);

  const conversations = useQuery(api.conversations.listWithMessages, {
    platform: selectedPlatform === "all" ? undefined : selectedPlatform,
    limit: 20,
  });

  return (
    <>
      <Card className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Conversations</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnalyzeDialogOpen(true)}
            className="gap-2"
          >
            <Brain className="h-4 w-4" />
            <MessageSquare className="h-4 w-4" />
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
        {!conversations || conversations.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No conversations yet
          </p>
        ) : (
          conversations.map((convo) => (
            <div
              key={convo._id}
              className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{convo.platform || "web"}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {convo.latest_message_time
                      ? format(new Date(convo.latest_message_time), "MMM dd, HH:mm")
                      : convo.start_time
                        ? format(new Date(convo.start_time), "MMM dd, HH:mm")
                        : ""}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {convo.messages.map((msg: any) => (
                  <div key={msg._id} className="space-y-1">
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
                      {msg.timestamp && (
                        <span className="text-xs text-muted-foreground block mt-1">
                          {format(new Date(msg.timestamp), "HH:mm")}
                        </span>
                      )}
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
