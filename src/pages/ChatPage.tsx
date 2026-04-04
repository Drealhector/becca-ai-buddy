import { useState } from "react";
import BeccaChatDialog from "@/components/chat/BeccaChatDialog";

const ChatPage = () => {
  const [isOpen, setIsOpen] = useState(true);

  return isOpen ? <BeccaChatDialog onClose={() => setIsOpen(false)} /> : null;
};

export default ChatPage;