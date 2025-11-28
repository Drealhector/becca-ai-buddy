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
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  const [questionsExpanded, setQuestionsExpanded] = useState(true);

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
    setExpandedTopics(new Set());

    try {
      const { data, error } = await supabase.functions.invoke("analyze-conversations", {
        body: { 
          messages: transcripts.map(t => ({
            content: t.transcript_text,
            timestamp: t.timestamp,
            role: "transcript",
            platform: "Phone Call"
          })), 
          question 
        },
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      setCustomQuestion(""); // Clear the input after successful question
    } catch (error) {
      console.error("Error analyzing transcripts:", error);
      toast.error("Failed to analyze transcripts");
    } finally {
      setIsAsking(false);
    }
  };

  const handleTemplateQuestion = (question: string) => {
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
    setAnalysis(null);
    setExpandedTopics(new Set());
    setQuestionsExpanded(true);
  };

  const toggleTopic = (index: number) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetDialog();
    }}>
      <DialogContent className="max-w-[92vw] sm:max-w-xl max-h-[90vh] p-1.5 sm:p-3">
        <DialogHeader className="pb-1 sm:pb-2">
          <DialogTitle className="flex items-center gap-1 text-xs sm:text-sm">
            <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
            <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-[11px] sm:text-sm">Analyze Call Transcripts</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-5rem)] pr-1 sm:pr-2">
          <div className="space-y-1.5 sm:space-y-2">
            {!analysisReady ? (
              <>
                {/* Call Type Selection */}
                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <Label className="text-[10px] sm:text-sm font-semibold">Call Type</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-[9px] sm:text-xs h-5 sm:h-7 px-1.5 sm:px-2"
                    >
                      {selectedCallTypes.length === callTypes.length ? "Deselect" : "Select All"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 sm:gap-2">
                    {callTypes.map((type) => (
                      <div key={type.id} className="flex items-center space-x-1 sm:space-x-1.5">
                        <Checkbox
                          id={type.id}
                          checked={selectedCallTypes.includes(type.id)}
                          onCheckedChange={() => handleCallTypeToggle(type.id)}
                          className="h-3 w-3 sm:h-4 sm:w-4"
                        />
                        <Label htmlFor={type.id} className="cursor-pointer text-[10px] sm:text-sm">
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-[10px] sm:text-sm font-semibold">Time Window (Max 24h)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                    {/* Start DateTime */}
                    <div className="space-y-1">
                      <Label className="text-[10px] sm:text-sm">Start</Label>
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
                    <div className="space-y-1">
                      <Label className="text-[10px] sm:text-sm">End</Label>
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
                  className="w-full text-xs sm:text-sm h-8 sm:h-9"
                  size="sm"
                >
                  {isFetchingData ? (
                    <>
                      <Loader2 className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    "Analyze Call Transcripts"
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Analysis Ready State */}
                <div className="bg-primary/10 p-1.5 sm:p-2 rounded-lg text-center space-y-1">
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <Brain className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
                    <Phone className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
                  </div>
                  <h3 className="text-[10px] sm:text-sm font-bold">READY FOR ANALYSIS</h3>
                  <p className="text-[9px] sm:text-xs text-muted-foreground">
                    {transcriptCount} transcript(s) from {selectedCallTypes.join(", ")}
                  </p>
                  <Button variant="outline" size="sm" onClick={resetDialog} className="text-[9px] sm:text-xs h-5 sm:h-7 px-1.5 sm:px-2">
                    New Analysis
                  </Button>
                </div>

                {/* Analysis Result - Conversational */}
                {analysis && (
                  <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                    <div className="space-y-2">
                      <p className="text-xs sm:text-sm">{analysis.summary || "No summary available"}</p>
                      {analysis.conversationCount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Based on {analysis.conversationCount} call transcript{analysis.conversationCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    {analysis.topics && analysis.topics.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs sm:text-sm">
                          I found {analysis.topics.length} key topic{analysis.topics.length !== 1 ? 's' : ''} discussed across the calls:
                        </p>
                        {analysis.topics.map((topic: any, idx: number) => (
                          <div key={idx} className="bg-background p-2 rounded">
                            <p className="text-xs sm:text-sm">
                              <span className="font-medium">{topic.name}</span> was mentioned in {topic.count} call{topic.count !== 1 ? 's' : ''}.
                              {!expandedTopics.has(idx) && " Would you like to see where and when this was discussed?"}
                            </p>
                            
                            {expandedTopics.has(idx) && topic.mentions && (
                              <div className="mt-2 pl-4 space-y-2">
                                {topic.mentions.map((mention: any, mIdx: number) => (
                                  <div key={mIdx} className="border-l-2 border-primary pl-3 py-1 bg-muted/30 rounded-r">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                      <span>{new Date(mention.timestamp).toLocaleString()}</span>
                                      {mention.sender && (
                                        <>
                                          <span>•</span>
                                          <span>{mention.sender}</span>
                                        </>
                                      )}
                                    </div>
                                    <p className="text-xs">{mention.snippet}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {analysis.insights && analysis.insights.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs sm:text-sm">Here are some key insights I noticed:</p>
                        <ul className="space-y-1">
                          {analysis.insights.map((insight: string, idx: number) => (
                            <li key={idx} className="text-xs bg-background p-1.5 sm:p-2 rounded">
                              • {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground italic mt-3">
                      You can ask me more questions using the templates or type your own below.
                    </p>
                  </div>
                )}

                {/* Questions and Input Section */}
                <div className={cn("flex flex-col sm:flex-row gap-2", analysis && !questionsExpanded && "sm:items-start")}>
                  {/* Question Templates - Collapsible with manual control */}
                  <div className={cn(
                    "transition-all duration-200",
                    questionsExpanded ? "flex-1" : (analysis ? "sm:w-[45%]" : "w-auto")
                  )}>
                    {questionsExpanded ? (
                      <div className="space-y-1 sm:space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <Label className="text-[10px] sm:text-xs font-semibold">Questions</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setQuestionsExpanded(false)}
                            className="text-[9px] sm:text-[10px] h-5 sm:h-6 px-1.5 sm:px-2"
                          >
                            Minimize
                          </Button>
                        </div>
                        <div className="grid gap-1 sm:gap-1.5">
                          {questionTemplates.map((question, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              className="justify-start text-left h-auto py-1 sm:py-2 text-[10px] sm:text-xs leading-tight px-2"
                              onClick={() => handleTemplateQuestion(question)}
                              disabled={isAsking}
                            >
                              {question}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setQuestionsExpanded(true)}
                        className="h-full min-h-[80px] sm:min-h-[120px] w-full"
                      >
                        <div className="text-center">
                          <p className="text-xs sm:text-sm font-semibold mb-1">Questions</p>
                          <p className="text-xs text-muted-foreground">{questionTemplates.length} templates</p>
                        </div>
                      </Button>
                    )}
                  </div>

                {/* Custom Question Input - Always visible */}
                  <div className={cn(
                    "space-y-1 sm:space-y-1.5 transition-all duration-200 flex-1"
                  )}>
                    <Label className="text-[10px] sm:text-xs font-semibold">Your Question</Label>
                    <Textarea
                      placeholder="Type here..."
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      rows={2}
                      className="resize-none text-[10px] sm:text-sm py-1.5 px-2"
                    />
                    <Button
                      onClick={handleCustomQuestion}
                      disabled={isAsking || !customQuestion.trim()}
                      className="w-full text-[9px] sm:text-xs h-6 sm:h-8 px-2"
                      size="sm"
                    >
                      {isAsking ? (
                        <>
                          <Loader2 className="mr-1 h-2.5 w-2.5 sm:h-4 sm:w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        "Send"
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}