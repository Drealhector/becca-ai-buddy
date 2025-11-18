import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface BeccaChatDialogProps {
  onClose: () => void;
}

const BeccaChatDialog: React.FC<BeccaChatDialogProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm Becca. How can I help you today?", timestamp: new Date() }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    addMessage("user", userMessage);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('web-chat', {
        body: { 
          message: userMessage,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
        }
      });

      if (error) throw error;

      if (data?.response) {
        addMessage("assistant", data.response);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-[600px] mx-4 relative">
        {/* Background pattern with repeated B */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50' y='70' font-size='60' font-weight='900' font-family='system-ui' fill='%23ffffff' text-anchor='middle'%3EB%3C/text%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
              backgroundSize: '100px 100px'
            }}
          />
        </div>

        {/* Main content */}
        <div className="relative h-full flex flex-col rounded-2xl border border-border/20 shadow-2xl overflow-hidden bg-gradient-to-br from-slate-400 via-slate-300 to-slate-400 backdrop-blur-md">
          {/* Header with Becca branding */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 bg-slate-500/30">
            <h2 className="text-3xl font-bold flex items-baseline">
              <span style={{
                fontSize: '2rem',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                fontWeight: 900,
                display: 'inline-block',
                color: '#ffffff',
                WebkitTextStroke: '1px #2c4a6f',
                textShadow: `
                  -2px -2px 0 #5dd5ed,
                  -4px -4px 0 #5dd5ed,
                  -6px -6px 0 #70dff0,
                  0 2px 6px rgba(0,0,0,0.4)
                `
              }}>B</span>
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent ml-0.5">ecca</span>
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages area */}
          <ScrollArea className="flex-1 px-6 py-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-white/90 text-slate-900 ml-auto shadow-lg"
                      : "bg-slate-600/80 text-white shadow-lg backdrop-blur-sm"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <span className="text-xs opacity-60 mt-1 block">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </ScrollArea>

          {/* Input area */}
          <div className="p-4 border-t border-white/20 bg-slate-500/30">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 bg-white/90 border-white/30 focus:border-white/50 text-slate-900 placeholder:text-slate-500"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                size="icon"
                className="bg-white/90 hover:bg-white text-slate-700 shadow-lg"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeccaChatDialog;
