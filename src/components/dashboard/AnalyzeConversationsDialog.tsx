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
  const [analysis, setAnalysis] = useState<string>("");
  const [isAsking, setIsAsking] = useState(false);

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
    setAnalysis("");

    try {
      const { data, error } = await supabase.functions.invoke("analyze-conversations", {
        body: { messages, question },
      });

      if (error) throw error;

      setAnalysis(data.analysis);
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
    setAnalysis("");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetDialog();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-[calc(100vw-2rem)] md:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
            <Brain className="h-4 w-4 md:h-5 md:w-5" />
            Analyze Conversations
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-2 md:pr-4">
          <div className="space-y-4 md:space-y-6">
            {!analysisReady ? (
              <>
                {/* Platform Selection */}
                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm md:text-base font-semibold">Select Platforms</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-8 text-xs md:text-sm"
                    >
                      {selectedPlatforms.length === platforms.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    {platforms.map((platform) => (
                      <div key={platform.id} className="flex items-center space-x-2 touch-manipulation">
                        <Checkbox
                          id={platform.id}
                          checked={selectedPlatforms.includes(platform.id)}
                          onCheckedChange={() => handlePlatformToggle(platform.id)}
                          className="h-5 w-5 md:h-4 md:w-4"
                        />
                        <Label htmlFor={platform.id} className="cursor-pointer text-sm md:text-base">
                          {platform.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                <div className="space-y-2 md:space-y-3">
                  <Label className="text-sm md:text-base font-semibold">Select Time Window (Max 24 hours)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {/* Start DateTime */}
                    <div className="space-y-2">
                      <Label className="text-sm md:text-base">Start</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-10 md:h-auto text-sm md:text-base touch-manipulation",
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
                        className="w-full px-3 py-2.5 md:py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-base md:text-sm touch-manipulation"
                      />
                    </div>

                    {/* End DateTime */}
                    <div className="space-y-2">
                      <Label className="text-sm md:text-base">End</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-10 md:h-auto text-sm md:text-base touch-manipulation",
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
                        className="w-full px-3 py-2.5 md:py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-base md:text-sm touch-manipulation"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={fetchMessages}
                  disabled={isFetchingData}
                  className="w-full touch-manipulation h-11 md:h-10"
                  size="lg"
                >
                  {isFetchingData ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="text-sm md:text-base">Fetching Messages...</span>
                    </>
                  ) : (
                    <span className="text-sm md:text-base">Analyze Conversations</span>
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Analysis Ready State */}
                <div className="bg-primary/10 p-3 md:p-4 rounded-lg text-center space-y-2">
                  <Brain className="h-10 w-10 md:h-12 md:w-12 mx-auto text-primary" />
                  <h3 className="text-base md:text-lg font-bold">THE BRAIN IS READY FOR ANALYSIS</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Analyzing {messageCount} messages from {selectedPlatforms.length} platform(s)
                  </p>
                  <Button variant="outline" size="sm" onClick={resetDialog} className="h-9 text-xs md:text-sm touch-manipulation">
                    Start New Analysis
                  </Button>
                </div>

                {/* Question Templates */}
                <div className="space-y-2 md:space-y-3">
                  <Label className="text-sm md:text-base font-semibold">Popular Questions</Label>
                  <div className="grid gap-2">
                    {questionTemplates.map((question, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="justify-start text-left h-auto py-3 md:py-3 text-sm md:text-base touch-manipulation"
                        onClick={() => handleTemplateQuestion(question)}
                        disabled={isAsking}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Question */}
                <div className="space-y-2 md:space-y-3">
                  <Label className="text-sm md:text-base font-semibold">Ask Your Own Question</Label>
                  <Textarea
                    placeholder="Type your custom question here..."
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    rows={3}
                    className="text-sm md:text-base touch-manipulation"
                  />
                  <Button
                    onClick={handleCustomQuestion}
                    disabled={isAsking || !customQuestion.trim()}
                    className="w-full h-11 md:h-10 text-sm md:text-base touch-manipulation"
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
                    <Label className="text-sm md:text-base font-semibold">Analysis Result</Label>
                    <div className="bg-muted p-3 md:p-4 rounded-lg whitespace-pre-wrap text-sm md:text-base">
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
