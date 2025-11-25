import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles } from "lucide-react";

interface AnalyzeConversationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function AnalyzeConversationsDialog({ open, onOpenChange }: AnalyzeConversationsDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const resetDialog = () => {
    setMessages([]);
    setShowTemplates(true);
    setUserInput("");
  };

  const analyzeConversations = async (question: string) => {
    setAnalyzing(true);
    setShowTemplates(false);
    
    try {
      const { data: conversations } = await supabase
        .from("conversations")
        .select("*, messages(*)")
        .order("start_time", { ascending: false })
        .limit(50);

      if (!conversations || conversations.length === 0) {
        toast.error("No conversations to analyze");
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "I couldn't find any conversations to analyze. Try having some conversations first!"
        }]);
        return;
      }

      const conversationsData = conversations.map((conv) => ({
        platform: conv.platform,
        start_time: conv.start_time,
        end_time: conv.end_time,
        summary: conv.summary,
        messages: conv.messages,
      }));

      const { data, error } = await supabase.functions.invoke("analyze-conversations", {
        body: { 
          conversations: conversationsData,
          question
        },
      });

      if (error) throw error;

      const analysisText = data.summary || "Analysis complete";
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `${analysisText}\n\nWould you like more details about any specific aspect? Just ask!`
      }]);
    } catch (error: any) {
      console.error("Error analyzing conversations:", error);
      toast.error(error.message || "Failed to analyze conversations");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error while analyzing the conversations. Please try again."
      }]);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTemplateClick = (template: string) => {
    setMessages([{ role: "user", content: template }]);
    analyzeConversations(template);
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    
    const newMessage: Message = { role: "user", content: userInput };
    setMessages(prev => [...prev, newMessage]);
    analyzeConversations(userInput);
    setUserInput("");
  };

  const templates = [
    "Overall Summary - Get a comprehensive overview",
    "Common Questions - What are customers asking?",
    "Customer Pain Points - What issues are raised?",
    "Sentiment Analysis - How do customers feel?"
  ];

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetDialog();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Analyze Conversations</DialogTitle>
        </DialogHeader>

        <ScrollArea ref={scrollRef} className="flex-1 px-6 py-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            
            {analyzing && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-4 max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    <span className="text-sm">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}

            {messages.length === 0 && !analyzing && (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground mb-6">
                  Ask me anything about your conversations
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t px-6 py-4 space-y-3">
          {showTemplates && (
            <div className="space-y-2">
              {templates.map((template, index) => (
                <Button
                  key={index}
                  onClick={() => handleTemplateClick(template)}
                  disabled={analyzing}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-2 px-3 text-sm"
                >
                  {template}
                </Button>
              ))}
            </div>
          )}
          
          {!showTemplates && (
            <Button
              onClick={() => setShowTemplates(!showTemplates)}
              variant="ghost"
              size="sm"
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {showTemplates ? "Hide" : "Show"} Question Templates
            </Button>
          )}

          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !analyzing && handleSendMessage()}
              placeholder="Ask a follow-up question..."
              disabled={analyzing}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={analyzing || !userInput.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
