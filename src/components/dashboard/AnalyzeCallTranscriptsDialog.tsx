import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Loader2, Brain, Phone } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnalyzeCallTranscriptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const callTypes = [
  { id: "incoming", label: "Incoming" },
  { id: "outgoing", label: "Outgoing" },
];

const questionTemplates = [
  "What were the main topics discussed in calls?",
  "What questions or concerns were raised most frequently?",
  "What time of day has the most call activity?",
  "Were there any common issues or complaints?",
  "What products or services were mentioned most?",
];

export function AnalyzeCallTranscriptsDialog({ open, onOpenChange }: AnalyzeCallTranscriptsDialogProps) {
  const [selectedCallTypes, setSelectedCallTypes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [transcriptCount, setTranscriptCount] = useState(0);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [analysis, setAnalysis] = useState<string>("");
  const [isAsking, setIsAsking] = useState(false);

  const handleCallTypeToggle = (typeId: string) => {
    setSelectedCallTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCallTypes.length === callTypes.length) {
      setSelectedCallTypes([]);
    } else {
      setSelectedCallTypes(callTypes.map(t => t.id));
    }
  };

  const validateTimeWindow = () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return false;
    }

    const start = new Date(startDate);
    const [startHour, startMin] = startTime.split(":").map(Number);
    start.setHours(startHour, startMin, 0, 0);

    const end = new Date(endDate);
    const [endHour, endMin] = endTime.split(":").map(Number);
    end.setHours(endHour, endMin, 0, 0);

    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      toast.error("End time must be after start time");
      return false;
    }

    if (diffHours > 24) {
      toast.error("Time window must be 24 hours or less");
      return false;
    }

    return true;
  };

  const fetchTranscripts = async () => {
    if (selectedCallTypes.length === 0) {
      toast.error("Please select at least one call type");
      return;
    }

    if (!validateTimeWindow()) return;

    setIsFetchingData(true);
    setAnalysisReady(false);

    try {
      const start = new Date(startDate!);
      const [startHour, startMin] = startTime.split(":").map(Number);
      start.setHours(startHour, startMin, 0, 0);

      const end = new Date(endDate!);
      const [endHour, endMin] = endTime.split(":").map(Number);
      end.setHours(endHour, endMin, 0, 0);

      // Fetch call history first
      const { data: callData, error: callError } = await supabase
        .from("call_history")
        .select("*")
        .in("type", selectedCallTypes)
        .gte("timestamp", start.toISOString())
        .lte("timestamp", end.toISOString())
        .order("timestamp", { ascending: false });

      if (callError) throw callError;

      // Fetch transcripts for these calls
      const { data: transcriptData, error: transcriptError } = await supabase
        .from("transcripts")
        .select("*")
        .gte("timestamp", start.toISOString())
        .lte("timestamp", end.toISOString());

      if (transcriptError) throw transcriptError;

      setTranscripts(transcriptData || []);
      setTranscriptCount((transcriptData || []).length);
      setAnalysisReady(true);
      toast.success(`Ready! Found ${(transcriptData || []).length} call transcripts`);
    } catch (error) {
      console.error("Error fetching transcripts:", error);
      toast.error("Failed to fetch transcripts");
    } finally {
      setIsFetchingData(false);
    }
  };

  const askQuestion = async (question: string) => {
    if (transcripts.length === 0) {
      toast.error("No transcripts to analyze");
      return;
    }

    setIsAsking(true);
    setAnalysis("");

    try {
      const { data, error } = await supabase.functions.invoke("analyze-conversations", {
        body: { 
          messages: transcripts.map(t => ({
            content: t.transcript_text,
            timestamp: t.timestamp,
            role: "transcript"
          })), 
          question 
        },
      });

      if (error) throw error;

      setAnalysis(data.analysis);
    } catch (error) {
      console.error("Error analyzing transcripts:", error);
      toast.error("Failed to analyze transcripts");
    } finally {
      setIsAsking(false);
    }
  };

  const handleTemplateQuestion = (question: string) => {
    setCustomQuestion(question);
    askQuestion(question);
  };

  const handleCustomQuestion = () => {
    if (!customQuestion.trim()) {
      toast.error("Please enter a question");
      return;
    }
    askQuestion(customQuestion);
  };

  const resetDialog = () => {
    setSelectedCallTypes([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setStartTime("00:00");
    setEndTime("23:59");
    setAnalysisReady(false);
    setTranscripts([]);
    setTranscriptCount(0);
    setCustomQuestion("");
    setAnalysis("");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetDialog();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <Phone className="h-5 w-5" />
            Analyze Call Transcripts
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          <div className="space-y-6">
            {!analysisReady ? (
              <>
                {/* Call Type Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Select Call Type</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedCallTypes.length === callTypes.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {callTypes.map((type) => (
                      <div key={type.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={type.id}
                          checked={selectedCallTypes.includes(type.id)}
                          onCheckedChange={() => handleCallTypeToggle(type.id)}
                        />
                        <Label htmlFor={type.id} className="cursor-pointer">
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Select Time Window (Max 24 hours)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Start DateTime */}
                    <div className="space-y-2">
                      <Label>Start</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : "Pick date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      />
                    </div>

                    {/* End DateTime */}
                    <div className="space-y-2">
                      <Label>End</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : "Pick date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={fetchTranscripts}
                  disabled={isFetchingData}
                  className="w-full"
                  size="lg"
                >
                  {isFetchingData ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fetching Transcripts...
                    </>
                  ) : (
                    "Analyze Call Transcripts"
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Analysis Ready State */}
                <div className="bg-primary/10 p-4 rounded-lg text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Brain className="h-12 w-12 text-primary" />
                    <Phone className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold">THE BRAIN IS READY FOR ANALYSIS</h3>
                  <p className="text-sm text-muted-foreground">
                    Analyzing {transcriptCount} call transcript(s) from {selectedCallTypes.join(", ")} calls
                  </p>
                  <Button variant="outline" size="sm" onClick={resetDialog}>
                    Start New Analysis
                  </Button>
                </div>

                {/* Question Templates */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Popular Questions</Label>
                  <div className="grid gap-2">
                    {questionTemplates.map((question, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="justify-start text-left h-auto py-3"
                        onClick={() => handleTemplateQuestion(question)}
                        disabled={isAsking}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Question */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Ask Your Own Question</Label>
                  <Textarea
                    placeholder="Type your custom question here..."
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={handleCustomQuestion}
                    disabled={isAsking || !customQuestion.trim()}
                    className="w-full"
                  >
                    {isAsking ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Get Answer"
                    )}
                  </Button>
                </div>

                {/* Analysis Result */}
                {analysis && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Analysis Result</Label>
                    <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                      {analysis}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}