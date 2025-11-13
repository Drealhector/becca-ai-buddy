import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConversationViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  conversations: any[];
}

export const ConversationViewDialog = ({ open, onOpenChange, title, conversations }: ConversationViewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title} Conversations</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          {conversations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No conversations yet</p>
          ) : (
            <div className="space-y-4">
              {conversations.map((conversation, index) => (
                <div key={index} className="border border-border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {conversation.timestamp ? new Date(conversation.timestamp).toLocaleString() : 'N/A'}
                      </p>
                      <p className="text-sm font-medium">
                        Duration: {conversation.duration || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Message:</p>
                    <p className="text-sm bg-muted/50 p-3 rounded whitespace-pre-wrap">
                      {conversation.content || conversation.transcript || "No content available"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
