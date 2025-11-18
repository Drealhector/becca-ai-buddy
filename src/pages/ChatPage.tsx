import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Instagram, Facebook, MessageCircle } from "lucide-react";
import BeccaChatDialog from "@/components/chat/BeccaChatDialog";
import { supabase } from "@/integrations/supabase/client";

const ChatPage = () => {
  const [isOpen, setIsOpen] = useState(true);

  return isOpen ? <BeccaChatDialog onClose={() => setIsOpen(false)} /> : null;
};

export default ChatPage;