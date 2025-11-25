import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Phone } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AnalyzeCallsDialog } from "./AnalyzeCallsDialog";

const TranscriptsSection = () => {
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false);

  useEffect(() => {
    fetchTranscripts();

    const channel = supabase
      .channel("transcripts-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transcripts",
        },
        () => {
          fetchTranscripts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTranscripts = async () => {
    try {
      const { data } = await supabase
        .from("transcripts")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(20);

      setTranscripts(data || []);
    } catch (error) {
      console.error("Error fetching transcripts:", error);
    }
  };

  const handleEdit = (transcript: any) => {
    setEditingId(transcript.id);
    setEditText(transcript.transcript_text || "");
  };

  const handleSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from("transcripts")
        .update({ transcript_text: editText })
        .eq("id", id);

      if (error) throw error;

      setEditingId(null);
      toast.success("Transcript updated");
      fetchTranscripts();
    } catch (error) {
      console.error("Error updating transcript:", error);
      toast.error("Failed to update transcript");
    }
  };

  return (
    <Card className="p-6">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Call Transcripts</h3>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setAnalyzeDialogOpen(true)}
          >
            <Brain className="h-4 w-4 mr-1" />
            <Phone className="h-4 w-4 mr-2" />
            Analyze
          </Button>
        </div>
      </CardHeader>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {transcripts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No transcripts yet
          </p>
        ) : (
          transcripts.map((transcript) => (
            <div
              key={transcript.id}
              className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(transcript.timestamp), "MMM dd, yyyy HH:mm")}
                    </span>
                    {transcript.sales_flagged && (
                      <Badge variant="default">Sales</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium">{transcript.caller_info}</p>
                </div>
              </div>

              {editingId === transcript.id ? (
                <div className="mt-2">
                  <Input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSave(transcript.id);
                      } else if (e.key === "Escape") {
                        setEditingId(null);
                      }
                    }}
                    className="mb-2"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(transcript.id)}
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

      <AnalyzeCallsDialog
        open={analyzeDialogOpen}
        onOpenChange={setAnalyzeDialogOpen}
      />
    </Card>
  );
};

export default TranscriptsSection;