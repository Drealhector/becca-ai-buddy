import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const TranscriptsSection = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const transcripts = useQuery(api.transcripts.list, { limit: 20 });
  const updateTranscript = useMutation(api.transcripts.update);

  const handleEdit = (transcript: any) => {
    setEditingId(transcript._id);
    setEditText(transcript.transcript_text || "");
  };

  const handleSave = async (id: any) => {
    try {
      await updateTranscript({ id, transcript_text: editText });
      setEditingId(null);
      toast.success("Transcript updated");
    } catch (error) {
      console.error("Error updating transcript:", error);
      toast.error("Failed to update transcript");
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Call Transcripts</h3>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {!transcripts || transcripts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No transcripts yet
          </p>
        ) : (
          transcripts.map((transcript) => (
            <div
              key={transcript._id}
              className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-muted-foreground">
                      {transcript.timestamp
                        ? format(new Date(transcript.timestamp), "MMM dd, yyyy HH:mm")
                        : ""}
                    </span>
                    {transcript.sales_flagged && (
                      <Badge variant="default">Sales</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium">{transcript.caller_info}</p>
                </div>
              </div>

              {editingId === transcript._id ? (
                <div className="mt-2">
                  <Input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSave(transcript._id);
                      } else if (e.key === "Escape") {
                        setEditingId(null);
                      }
                    }}
                    className="mb-2"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(transcript._id)}
                      className="text-xs text-primary hover:underline"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={() => handleEdit(transcript)}
                  className="text-sm text-foreground cursor-pointer hover:text-primary mt-2"
                >
                  {transcript.transcript_text || "No transcript"}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default TranscriptsSection;
