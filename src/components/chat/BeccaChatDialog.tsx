import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, X } from "lucide-react";
import Vapi from "@vapi-ai/web";
import { toast } from "sonner";

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
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    initializeVapi();
    
    return () => {
      if (vapiRef.current && isConnected) {
        vapiRef.current.stop();
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
      const publicKey = 'a73cb300-eae5-4375-9b68-0dda8733474a';
      const assistantId = '6c411909-067b-4ce3-ad02-10299109dc64';
      
      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        setIsConnected(true);
        setIsConnecting(false);
        addMessage("assistant", "Hi! I'm Becca. How can I help you today?");
      });

      vapi.on("call-end", () => {
        setIsConnected(false);
      });

      vapi.on("message", (message: any) => {
        if (message.type === "transcript" && message.role === "assistant") {
          if (message.transcriptType === "final") {
            addMessage("assistant", message.transcript);
          }
        }
      });

      vapi.on("error", (error: any) => {
        console.error("Vapi error:", error);
        setIsConnecting(false);
        toast.error("Connection failed. Please try again.");
      });

      // Start the assistant in text mode
      await vapi.start(assistantId);
      
    } catch (error) {
      console.error("Failed to initialize Vapi:", error);
      setIsConnecting(false);
      toast.error("Failed to initialize chat");
    }
  };

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !vapiRef.current || !isConnected) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    addMessage("user", userMessage);

    try {
      vapiRef.current.send({
        type: "add-message",
        message: {
          role: "user",
          content: userMessage,
        },
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleClose = () => {
    if (vapiRef.current && isConnected) {
      vapiRef.current.stop();
    }
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
            {isConnecting && (
              <div className="flex justify-center items-center h-full">
                <div className="text-white/80 animate-pulse">Connecting to Becca...</div>
              </div>
            )}
            
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
                placeholder={isConnected ? "Type your message..." : "Connecting..."}
                disabled={!isConnected || isConnecting}
                className="flex-1 bg-white/90 border-white/30 focus:border-white/50 text-slate-900 placeholder:text-slate-500"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!isConnected || !inputValue.trim() || isConnecting}
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
