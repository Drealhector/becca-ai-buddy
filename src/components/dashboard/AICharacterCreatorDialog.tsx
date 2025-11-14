import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, User, Loader2, Copy, RefreshCw } from "lucide-react";

type Step = "choose" | "new_input" | "new_result" | "human_name" | "human_confirm" | "human_result" | "refine";

interface AICharacterCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCopyToPersonality: (text: string) => void;
}

export const AICharacterCreatorDialog = ({ open, onOpenChange, onCopyToPersonality }: AICharacterCreatorDialogProps) => {
  const [step, setStep] = useState<Step>("choose");
  const [loading, setLoading] = useState(false);
  const [characterType, setCharacterType] = useState<"new" | "human" | null>(null);
  
  // New character fields
  const [newDescription, setNewDescription] = useState("");
  const [generatedCharacter, setGeneratedCharacter] = useState("");
  
  // Human character fields
  const [humanName, setHumanName] = useState("");
  const [humanContext, setHumanContext] = useState("");
  const [humanInfo, setHumanInfo] = useState("");
  const [humanConfirmed, setHumanConfirmed] = useState(false);
  
  // Refine fields
  const [refineTask, setRefineTask] = useState("");
  const [refineLink, setRefineLink] = useState("");
  const [refineBusinessInfo, setRefineBusinessInfo] = useState("");

  const resetDialog = () => {
    setStep("choose");
    setCharacterType(null);
    setNewDescription("");
    setGeneratedCharacter("");
    setHumanName("");
    setHumanContext("");
    setHumanInfo("");
    setHumanConfirmed(false);
    setRefineTask("");
    setRefineLink("");
    setRefineBusinessInfo("");
  };

  const handleChoose = (type: "new" | "human") => {
    setCharacterType(type);
    setStep(type === "new" ? "new_input" : "human_name");
  };

  const handleGenerateNew = async () => {
    if (!newDescription.trim()) {
      toast.error("Please describe the character");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-character", {
        body: { type: "generate_new", input: { description: newDescription } }
      });

      if (error) throw error;
      setGeneratedCharacter(data.result);
      setStep("new_result");
      toast.success("Character created!");
    } catch (error) {
      console.error("Error generating character:", error);
      toast.error("Failed to generate character");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchHuman = async () => {
    if (!humanName.trim()) {
      toast.error("Please enter a name");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-character", {
        body: { 
          type: "search_human", 
          input: { name: humanName, context: humanContext } 
        }
      });

      if (error) throw error;
      setHumanInfo(data.result);
      setStep("human_confirm");
      toast.success("Person found!");
    } catch (error) {
      console.error("Error searching person:", error);
      toast.error("Failed to search person");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmHuman = async (confirmed: boolean) => {
    if (!confirmed) {
      setHumanConfirmed(false);
      setStep("human_name");
      setHumanContext(""); // Clear for new input
      toast.info("Please provide more details");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-character", {
        body: { 
          type: "create_human_character", 
          input: { name: humanName, info: humanInfo } 
        }
      });

      if (error) throw error;
      setGeneratedCharacter(data.result);
      setHumanConfirmed(true);
      setStep("human_result");
      toast.success("Character created!");
    } catch (error) {
      console.error("Error creating human character:", error);
      toast.error("Failed to create character");
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!refineTask.trim() || !refineBusinessInfo.trim()) {
      toast.error("Please fill in task and business information");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-character", {
        body: { 
          type: "refine", 
          input: { 
            basePersonality: generatedCharacter,
            task: refineTask,
            link: refineLink,
            businessInfo: refineBusinessInfo
          } 
        }
      });

      if (error) throw error;
      setGeneratedCharacter(data.result);
      toast.success("Character refined!");
      setStep(characterType === "new" ? "new_result" : "human_result");
    } catch (error) {
      console.error("Error refining character:", error);
      toast.error("Failed to refine character");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    onCopyToPersonality(generatedCharacter);
    toast.success("Character copied to personality field!");
    onOpenChange(false);
    resetDialog();
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetDialog, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create AI Character
          </DialogTitle>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Choose how you want to create your AI character:</p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto flex-col gap-3 p-6"
                onClick={() => handleChoose("new")}
              >
                <Sparkles className="h-8 w-8" />
                <div>
                  <div className="font-semibold">New Character</div>
                  <div className="text-xs text-muted-foreground">Create from description</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-3 p-6"
                onClick={() => handleChoose("human")}
              >
                <User className="h-8 w-8" />
                <div>
                  <div className="font-semibold">Human Character</div>
                  <div className="text-xs text-muted-foreground">Based on real person</div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {step === "new_input" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Describe Your Character</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g., A friendly and professional sales assistant who loves helping customers find the perfect product. Should be enthusiastic but not pushy..."
                className="min-h-[150px]"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("choose")}>Back</Button>
              <Button onClick={handleGenerateNew} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</> : "Generate Character"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "new_result" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Generated Character</Label>
              <Textarea
                value={generatedCharacter}
                readOnly
                className="min-h-[200px]"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("refine")}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refine
              </Button>
              <Button onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Personality
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "human_name" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Person's Name</Label>
              <Input
                value={humanName}
                onChange={(e) => setHumanName(e.target.value)}
                placeholder="e.g., Elon Musk"
              />
            </div>
            {humanContext && (
              <div className="space-y-2">
                <Label>Additional Details (Optional)</Label>
                <Input
                  value={humanContext}
                  onChange={(e) => setHumanContext(e.target.value)}
                  placeholder="e.g., CEO of Tesla and SpaceX"
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("choose")}>Back</Button>
              <Button onClick={handleSearchHuman} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Searching...</> : "Search Person"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "human_confirm" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Is this the person you're looking for?</Label>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{humanInfo}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleConfirmHuman(false)}>
                No, Try Again
              </Button>
              <Button onClick={() => handleConfirmHuman(true)} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : "Yes, Create Character"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "human_result" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Generated Character (Based on {humanName})</Label>
              <Textarea
                value={generatedCharacter}
                readOnly
                className="min-h-[200px]"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("refine")}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refine
              </Button>
              <Button onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Personality
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "refine" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task for AI</Label>
              <Textarea
                value={refineTask}
                onChange={(e) => setRefineTask(e.target.value)}
                placeholder="What should this AI help users with?"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Link to Share (Optional)</Label>
              <Input
                value={refineLink}
                onChange={(e) => setRefineLink(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Business Information</Label>
              <Textarea
                value={refineBusinessInfo}
                onChange={(e) => setRefineBusinessInfo(e.target.value)}
                placeholder="Tell us about your business, products, services, target audience..."
                className="min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(characterType === "new" ? "new_result" : "human_result")}>
                Back
              </Button>
              <Button onClick={handleRefine} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Refining...</> : "Refine Character"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
