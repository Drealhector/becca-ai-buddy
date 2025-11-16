import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, X } from "lucide-react";
import { toast } from "sonner";

interface ProductChatProps {
  productId: string;
  productName: string;
  salesInstructions?: string;
  onClose: () => void;
}

const ProductChat = ({ productId, productName, salesInstructions, onClose }: ProductChatProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add greeting message
    const greeting = salesInstructions 
      ? `Hey! I see you're interested in ${productName}. I'm here to help you learn more about it. What would you like to know?`
      : `Hi! I'm here to tell you all about ${productName}. What would you like to know?`;
    
    setMessages([
      {
        role: "assistant",
        content: greeting,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [productName, salesInstructions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/product-chat`;
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content }))
            .concat([{ role: "user", content: userInput }]),
          productId,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Too many requests. Please try again in a moment.");
          setLoading(false);
          return;
        }
        if (response.status === 402) {
          toast.error("Service temporarily unavailable. Please try again later.");
          setLoading(false);
          return;
        }
        throw new Error("Failed to get AI response");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";

      const aiMessage = {
        role: "assistant",
        content: "",
        imageUrl: null as string | null,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              aiContent += content;
              
              // Check for image tags in the content
              const imageMatch = aiContent.match(/\[SHOW_IMAGE:([^\]]+)\]/);
              let displayContent = aiContent;
              let imageUrl = null;

              if (imageMatch) {
                const label = imageMatch[1];
                // Remove the tag from display
                displayContent = aiContent.replace(/\[SHOW_IMAGE:([^\]]+)\]/, '').trim();
                
                // Fetch the image URL for this label
                try {
                  const response = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/product_media?product_id=eq.${productId}&label=ilike.%${label}%&select=media_url`,
                    {
                      headers: {
                        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                        "Content-Type": "application/json",
                      },
                    }
                  );
                  const mediaData = await response.json();
                  if (mediaData && mediaData.length > 0) {
                    imageUrl = mediaData[0].media_url;
                  }
                } catch (e) {
                  console.error("Error fetching media:", e);
                }
              }

              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === "assistant") {
                  lastMessage.content = displayContent;
                  if (imageUrl) {
                    lastMessage.imageUrl = imageUrl;
                  }
                }
                return newMessages;
              });
            }
          } catch (e) {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to send message. Please try again.");
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background/95 backdrop-blur-sm rounded-lg border border-border shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="font-semibold text-foreground">{productName}</h3>
          <p className="text-sm text-muted-foreground">AI Sales Assistant</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="hover:bg-accent"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {message.content && (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
              {message.imageUrl && (
                <img 
                  src={message.imageUrl} 
                  alt="Product" 
                  className="mt-2 rounded-lg max-w-full h-auto"
                />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about this product..."
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductChat;
