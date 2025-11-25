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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const initializeChat = async () => {
    setIsLoading(true);
    try {
      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({ platform: "web" })
        .select()
        .single();

      if (convError) throw convError;
      setConversationId(conversation.id);

      // Fetch the greeting/personality from dashboard customizations
      const { data: customData } = await supabase
        .from("customizations")
        .select("greeting, assistant_personality")
        .limit(1)
        .maybeSingle();

      // Use the greeting or personality as the first message
      const greetingMessage = customData?.greeting || customData?.assistant_personality || "Hi! How can I help you today?";
      
      addMessage("assistant", greetingMessage);
    } catch (error) {
      console.error("Error loading greeting:", error);
      addMessage("assistant", "Hi! How can I help you today?");
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !conversationId) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    addMessage("user", userMessage);
    setIsLoading(true);

    try {
      // Save user message to database
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: userMessage,
        platform: "web",
      });

      // Prepare messages array for Vapi
      const messageHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      messageHistory.push({ role: "user", content: userMessage });

      // Send message to Vapi through edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vapi-text-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            messages: messageHistory,
            conversationId
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        throw new Error(`Failed to send message`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      // Add the complete assistant response
      if (assistantContent) {
        addMessage("assistant", assistantContent);
        
        // Save AI message to database
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          role: "ai",
          content: assistantContent,
          platform: "web",
        });
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
        className="relative w-full max-w-2xl h-[600px] rounded-lg shadow-xl flex flex-col border border-gray-600"
        style={{
          background: 'linear-gradient(135deg, #4a5568 0%, #5a6c7d 50%, #4a5568 100%)'
        }}
      >
        {/* Header */}
        <div className="relative p-4 border-b border-gray-500/30 bg-gradient-to-r from-gray-700/40 to-gray-600/40 backdrop-blur-sm rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
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
                <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">ECCA</span>
              </h2>
              <p className="text-xs text-gray-300 font-medium">
                AI Chat Assistant
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-red-500/20 hover:text-red-400 text-gray-300"
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
                      : "bg-black text-white border border-gray-700"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className={`text-xs opacity-70 mt-1 block ${
                    message.role === "user" ? "text-blue-100" : "text-gray-400"
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
                <div className="bg-black rounded-lg px-4 py-2 border border-gray-700 shadow-md">
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
        <div className="p-4 border-t border-gray-500/30 bg-gray-700/40 backdrop-blur-sm rounded-b-lg">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-white/10 border-gray-600 text-white placeholder:text-gray-400"
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
