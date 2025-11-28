import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Loader2, Brain } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnalyzeConversationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const platforms = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "telegram", label: "Telegram" },
  { id: "web", label: "Web Chat" },
];

const questionTemplates = [
  "What did people talk about most?",
  "Which product or service is most popular?",
  "What common questions or concerns were raised?",
  "What time of day has the most customer engagement?",
  "Are there any trending topics or issues I should know about?",
];

export function AnalyzeConversationsDialog({ open, onOpenChange }: AnalyzeConversationsDialogProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPlatforms.length === platforms.length) {
      setSelectedPlatforms([]);
    } else {
      setSelectedPlatforms(platforms.map(p => p.id));
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

  const fetchMessages = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
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

      const { data: conversationData, error } = await supabase
        .from("conversations")
        .select(`
          id,
          platform,
          start_time,
          messages (
            id,
            content,
            role,
            timestamp,
            sender_name,
            platform
          )
        `)
        .in("platform", selectedPlatforms)
        .gte("start_time", start.toISOString())
        .lte("start_time", end.toISOString())
        .order("start_time", { ascending: false });

      if (error) throw error;

      // Flatten all messages from all conversations
      const allMessages = conversationData?.flatMap(conv => 
        conv.messages.map(msg => ({
          ...msg,
          conversation_platform: conv.platform,
          conversation_start: conv.start_time,
        }))
      ) || [];

      setMessages(allMessages);
      setMessageCount(allMessages.length);
      setAnalysisReady(true);
      toast.success(`Ready! Found ${allMessages.length} messages from selected platforms`);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to fetch messages");
    } finally {
      setIsFetchingData(false);
    }
  };

  const askQuestion = async (question: string) => {
    if (messages.length === 0) {
      toast.error("No messages to analyze");
      return;
    }

    setIsAsking(true);
    setExpandedTopics(new Set());

    try {
      const { data, error } = await supabase.functions.invoke("analyze-conversations", {
        body: { messages, question },
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      setCustomQuestion(""); // Clear the input after successful question
    } catch (error) {
      console.error("Error analyzing conversations:", error);
      toast.error("Failed to analyze conversations");
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
    setSelectedPlatforms([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setStartTime("00:00");
    setEndTime("23:59");
    setAnalysisReady(false);
    setMessages([]);
    setMessageCount(0);
    setCustomQuestion("");
    setAnalysis(null);
    setExpandedTopics(new Set());
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
            <span className="text-[11px] sm:text-sm">Analyze Conversations</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-5rem)] pr-1 sm:pr-2">
          <div className="space-y-1.5 sm:space-y-2">
            {!analysisReady ? (
              <>
                {/* Platform Selection */}
                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <Label className="text-[10px] sm:text-sm font-semibold">Select Platforms</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-[9px] sm:text-xs h-5 sm:h-7 px-1.5 sm:px-2"
                    >
                      {selectedPlatforms.length === platforms.length ? "Deselect" : "Select All"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 sm:gap-2">
                    {platforms.map((platform) => (
                      <div key={platform.id} className="flex items-center space-x-1 sm:space-x-1.5">
                        <Checkbox
                          id={platform.id}
                          checked={selectedPlatforms.includes(platform.id)}
                          onCheckedChange={() => handlePlatformToggle(platform.id)}
                          className="h-3 w-3 sm:h-4 sm:w-4"
                        />
                        <Label htmlFor={platform.id} className="cursor-pointer text-[10px] sm:text-sm">
                          {platform.label}
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
                  onClick={fetchMessages}
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
                    "Analyze Conversations"
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Analysis Ready State */}
                <div className="bg-primary/10 p-1.5 sm:p-2 rounded-lg text-center space-y-1">
                  <Brain className="h-5 w-5 sm:h-7 sm:w-7 mx-auto text-primary" />
                  <h3 className="text-[10px] sm:text-sm font-bold">READY FOR ANALYSIS</h3>
                  <p className="text-[9px] sm:text-xs text-muted-foreground">
                    {messageCount} message(s) from {selectedPlatforms.length} platform(s)
                  </p>
                  <Button variant="outline" size="sm" onClick={resetDialog} className="text-[9px] sm:text-xs h-5 sm:h-7 px-1.5 sm:px-2">
                    New Analysis
                  </Button>
                </div>

                {/* Question Templates */}
                <div className="space-y-1 sm:space-y-1.5">
                  <Label className="text-[10px] sm:text-xs font-semibold">Questions</Label>
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

                {/* Custom Question */}
                <div className="space-y-1 sm:space-y-1.5">
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

                {/* Analysis Result */}
                {analysis && (
                  <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                    <div className="space-y-2">
                      <p className="text-xs sm:text-sm">{analysis.summary || "No summary available"}</p>
                      {analysis.conversationCount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Based on {analysis.conversationCount} conversation{analysis.conversationCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    {/* Topics */}
                    {analysis.topics && analysis.topics.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs sm:text-sm">
                          I found {analysis.topics.length} key topic{analysis.topics.length !== 1 ? 's' : ''}:
                        </p>
                        {analysis.topics.map((topic: any, idx: number) => (
                          <div key={idx} className="bg-background p-2 rounded">
                            <p className="text-xs sm:text-sm">
                              <span className="font-medium">{topic.name}</span> - {topic.count} conversation{topic.count !== 1 ? 's' : ''}.
                            </p>
                            
                            {expandedTopics.has(idx) && topic.mentions && (
                              <div className="mt-2 pl-4 space-y-2">
                                {topic.mentions.map((mention: any, mIdx: number) => (
                                  <div key={mIdx} className="border-l-2 border-primary pl-3 py-1 bg-muted/30 rounded-r">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                      <span className="capitalize">{mention.platform}</span>
                                      <span>•</span>
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

                    {/* Insights */}
                    {analysis.insights && analysis.insights.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs sm:text-sm">Key insights:</p>
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
                      You can ask me more questions using the templates or type your own above.
                    </p>
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
