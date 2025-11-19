import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Vapi from "@vapi-ai/web";

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
  const [vapi, setVapi] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeVapi();
    return () => {
      if (vapi) {
        vapi.stop();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const initializeVapi = async () => {
    try {
      // Fetch customization for greeting
      const { data: customData } = await supabase
        .from("customizations")
        .select("greeting")
        .limit(1)
        .maybeSingle();

      // Fetch Vapi configuration
      const { data: config, error: configError } = await supabase.functions.invoke('get-vapi-config');
      
      if (configError || !config?.publicKey || !config?.assistantId) {
        console.error('Vapi configuration not found:', configError);
        const greeting = customData?.greeting || "Hi! How can I help you today?";
        addMessage("assistant", greeting);
        setIsLoading(false);
        return;
      }

      console.log('Initializing Vapi with assistant:', config.assistantId);

      const vapiInstance = new Vapi(config.publicKey);
      
      // Set up event listeners
      vapiInstance.on('call-start', () => {
        console.log('Vapi call started');
        setIsConnected(true);
        setIsLoading(false);
      });

      vapiInstance.on('call-end', () => {
        console.log('Vapi call ended');
        setIsConnected(false);
      });

      vapiInstance.on('message', (message: any) => {
        console.log('Vapi message:', message);
        if (message.type === 'transcript' && message.role === 'assistant' && message.transcriptType === 'final') {
          addMessage("assistant", message.transcript);
        }
      });

      vapiInstance.on('error', (error: any) => {
        console.error('Vapi error:', error);
        toast.error('Connection error. Please try again.');
      });

      // Start the call in text-only mode
      await vapiInstance.start(config.assistantId);

      setVapi(vapiInstance);

      // Show initial greeting
      const greeting = customData?.greeting || "Hi! How can I help you today?";
      addMessage("assistant", greeting);
    } catch (error) {
      console.error('Error initializing Vapi:', error);
      addMessage("assistant", "Hi! How can I help you today?");
      setIsLoading(false);
    }
  };

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !vapi || !isConnected) {
      if (!isConnected) {
        toast.error("Not connected to assistant. Please wait...");
      }
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue("");
    addMessage("user", userMessage);

    try {
      // Send text message through Vapi
      vapi.send({
        type: "add-message",
        message: {
          role: "user",
          content: userMessage,
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
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
      <div className="relative w-full max-w-2xl h-[600px] bg-background rounded-lg shadow-xl flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xl">💬</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Chat Assistant</h2>
              <p className="text-xs text-muted-foreground">
                {isConnected ? "Connected" : "Connecting..."}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
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
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-background">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Type your message..." : "Connecting..."}
              disabled={!isConnected}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || !isConnected}
              className="px-6"
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
