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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGreeting();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const loadGreeting = async () => {
    // Don't add any initial message - let Vapi send the greeting
    setIsLoading(false);
  };

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    addMessage("user", userMessage);
    setIsLoading(true);

    try {
      // Send message to Vapi through edge function
      const { data, error } = await supabase.functions.invoke('vapi-text-chat', {
        body: { 
          message: userMessage,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (error) throw error;

      if (data?.response) {
        addMessage("assistant", data.response);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-2xl h-[600px] rounded-lg shadow-xl flex flex-col border border-border"
        style={{
          background: 'linear-gradient(135deg, #c0c5ce 0%, #e8eaed 50%, #c0c5ce 100%)',
          backgroundImage: `
            linear-gradient(135deg, #c0c5ce 0%, #e8eaed 50%, #c0c5ce 100%),
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 35px,
              rgba(255,255,255,0.03) 35px,
              rgba(255,255,255,0.03) 70px
            )
          `,
          backgroundBlendMode: 'normal, overlay'
        }}
      >
        {/* Repeated B pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.015] pointer-events-none rounded-lg overflow-hidden"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50' y='70' font-size='60' font-weight='900' text-anchor='middle' fill='%23000' font-family='system-ui'%3EB%3C/text%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px',
            backgroundRepeat: 'repeat'
          }}
        />
        
        {/* Header */}
        <div className="relative p-4 border-b border-gray-400/30 bg-gradient-to-r from-gray-300/40 to-gray-200/40 backdrop-blur-sm rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center backdrop-blur-sm border border-white/50">
              <span className="text-xl font-black" style={{
                color: '#ffffff',
                WebkitTextStroke: '0.5px #2c4a6f',
                textShadow: '-1px -1px 0 #5dd5ed, 0 1px 3px rgba(0,0,0,0.3)'
              }}>B</span>
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-baseline">
                <span style={{
                  fontSize: '1.5rem',
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
                <span className="bg-gradient-to-r from-gray-800 via-gray-600 to-gray-500 bg-clip-text text-transparent">ECCA</span>
              </h2>
              <p className="text-xs text-gray-700 font-medium">
                AI Chat Assistant
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-red-500/20 hover:text-red-700 text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4 relative">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 shadow-md ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                      : "bg-white text-gray-800 border border-gray-300"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className={`text-xs opacity-70 mt-1 block ${
                    message.role === "user" ? "text-blue-100" : "text-gray-600"
                  }`}>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-lg px-4 py-2 border border-gray-300 shadow-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-400/30 bg-white/40 backdrop-blur-sm rounded-b-lg">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-6 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeccaChatDialog;
