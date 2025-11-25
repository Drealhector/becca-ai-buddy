import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, X, Loader2 } from "lucide-react";
import Vapi from "@vapi-ai/web";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface VapiChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VapiChatDialog: React.FC<VapiChatDialogProps> = ({ open, onOpenChange }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    if (open && !vapiRef.current) {
      initializeVapi();
    }
    
    return () => {
      if (vapiRef.current && isConnected) {
        vapiRef.current.stop();
      }
    };
  }, [open]);

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
      setIsConnecting(true);
      
      // Create conversation in database
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({ platform: "web" })
        .select()
        .single();

      if (convError) {
        console.error("Error creating conversation:", convError);
      } else {
        setConversationId(conversation.id);
      }
      
      const vapi = new Vapi("208b6005-0953-425b-a478-2748d49d484c");
      vapiRef.current = vapi;

      // Set up event listeners
      vapi.on("call-start", async () => {
        setIsConnected(true);
        setIsConnecting(false);
        const greeting = "Hi! How can I help you today?";
        addMessage("assistant", greeting);
        
        // Save greeting to database
        if (conversation?.id) {
          await supabase.from("messages").insert({
            conversation_id: conversation.id,
            role: "assistant",
            content: greeting,
            platform: "web",
          });
        }
      });

      vapi.on("call-end", () => {
        setIsConnected(false);
      });

      vapi.on("speech-start", () => {
        setIsSpeaking(true);
      });

      vapi.on("speech-end", () => {
        setIsSpeaking(false);
      });

      vapi.on("message", async (message: any) => {
        if (message.type === "transcript" && message.role === "assistant") {
          if (message.transcriptType === "final") {
            addMessage("assistant", message.transcript);
            
            // Save assistant message to database
            if (conversationId) {
              await supabase.from("messages").insert({
                conversation_id: conversationId,
                role: "assistant",
                content: message.transcript,
                platform: "web",
              });
            }
          }
        } else if (message.type === "transcript" && message.role === "user") {
          if (message.transcriptType === "final") {
            addMessage("user", message.transcript);
            
            // Save user message to database
            if (conversationId) {
              await supabase.from("messages").insert({
                conversation_id: conversationId,
                role: "user",
                content: message.transcript,
                platform: "web",
              });
            }
          }
        }
      });

      vapi.on("error", (error: any) => {
        console.error("Vapi error:", error);
        setIsConnecting(false);
      });

      // Start the call
      await vapi.start("b09cc3ec-1180-4b2a-a6c8-49f80bc10da8");
      
    } catch (error) {
      console.error("Failed to initialize Vapi:", error);
      setIsConnecting(false);
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
    }
  };

  const handleClose = () => {
    if (vapiRef.current && isConnected) {
      vapiRef.current.stop();
    }
    vapiRef.current = null;
    setMessages([]);
    setIsConnected(false);
    setIsConnecting(false);
    setConversationId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0">
        {/* Header with embossed B logo */}
        <DialogHeader className="relative h-32 flex items-center justify-center bg-gradient-to-br from-slate-300 via-slate-200 to-slate-300 border-b border-slate-400 rounded-t-lg overflow-hidden">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,.05)_10px,rgba(255,255,255,.05)_20px)]"></div>
          
          <div className="relative z-10">
            <span style={{
              fontSize: '4rem',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
              fontWeight: 900,
              letterSpacing: '0',
              lineHeight: 1,
              display: 'inline-block'
            }}>
              <span style={{
                color: '#c0c0c0',
                WebkitTextStroke: '2px #888888',
                textShadow: `
                  -2px -2px 0 #d4d4d4,
                  -4px -4px 0 #e0e0e0,
                  -6px -6px 0 #eeeeee,
                  2px 2px 4px rgba(0,0,0,0.3),
                  4px 4px 8px rgba(0,0,0,0.2),
                  inset -2px -2px 4px rgba(255,255,255,0.5),
                  inset 2px 2px 4px rgba(0,0,0,0.3)
                `,
                fontWeight: 900,
                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))'
              }}>B</span>
              <span style={{
                color: '#999999',
                fontWeight: 800,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>ECCA</span>
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4 bg-slate-50">
          <div className="space-y-4">
            {isConnecting && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <span className="ml-2 text-slate-600">Connecting...</span>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.role === "user"
                      ? "bg-slate-600 text-white"
                      : "bg-white text-slate-900 border border-slate-200"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
            
            {isSpeaking && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-200 bg-white rounded-b-lg">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type your message..."
              disabled={!isConnected}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || !isConnected}
              size="icon"
              className="bg-slate-600 hover:bg-slate-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VapiChatDialog;
