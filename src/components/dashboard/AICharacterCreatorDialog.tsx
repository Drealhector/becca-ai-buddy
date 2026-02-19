import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, User, Loader2, Copy, RefreshCw, Upload, X } from "lucide-react";

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
  const [newBusinessName, setNewBusinessName] = useState("");
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
  
  // File uploads
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [refineUploadedFiles, setRefineUploadedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const resetDialog = () => {
    setStep("choose");
    setCharacterType(null);
    setNewDescription("");
    setNewBusinessName("");
    setGeneratedCharacter("");
    setHumanName("");
    setHumanContext("");
    setHumanInfo("");
    setHumanConfirmed(false);
    setRefineTask("");
    setRefineLink("");
    setRefineBusinessInfo("");
    setUploadedFiles([]);
    setRefineUploadedFiles([]);
  };

  const handleFileUpload = async (files: FileList | null, isRefine: boolean = false) => {
    if (!files || files.length === 0) return;

    const currentFiles = isRefine ? refineUploadedFiles : uploadedFiles;
    const newFilesArray = Array.from(files);
    
    if (currentFiles.length + newFilesArray.length > 10) {
      toast.error("Maximum 10 files allowed");
      return;
    }

    // Validate file types (only documents and text)
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];

    const invalidFiles = newFilesArray.filter(file => !validTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      toast.error("Only PDF, DOCX, DOC, TXT, and MD files are allowed");
      return;
    }

    if (isRefine) {
      setRefineUploadedFiles([...currentFiles, ...newFilesArray]);
    } else {
      setUploadedFiles([...currentFiles, ...newFilesArray]);
    }
    
    toast.success(`${newFilesArray.length} file(s) added`);
  };

  const removeFile = (index: number, isRefine: boolean = false) => {
    if (isRefine) {
      setRefineUploadedFiles(refineUploadedFiles.filter((_, i) => i !== index));
    } else {
      setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
    }
  };

  const parseUploadedFiles = async (files: File[]): Promise<string[]> => {
    const parsedContents: string[] = [];
    
    for (const file of files) {
      try {
        if (file.type === 'text/plain' || file.type === 'text/markdown') {
          // Read text files directly
          const text = await file.text();
          parsedContents.push(`File: ${file.name}\n\n${text}`);
        } else {
          // For PDF/DOCX, we'll need to use the document parser
          // Create a temporary FormData to upload and parse
          const formData = new FormData();
          formData.append('file', file);
          
          // Note: In a real implementation, you'd upload to storage and use document parser
          // For now, we'll just include the filename
          parsedContents.push(`File: ${file.name} (Document - content to be parsed)`);
        }
      } catch (error) {
        console.error(`Error parsing file ${file.name}:`, error);
        toast.error(`Failed to parse ${file.name}`);
      }
    }
    
    return parsedContents;
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
    if (!newBusinessName.trim()) {
      toast.error("Please enter your business name");
      return;
    }

    setLoading(true);
    setUploadingFiles(true);
    try {
      // Parse uploaded files
      const parsedFiles = await parseUploadedFiles(uploadedFiles);
      
      const { data, error } = await supabase.functions.invoke("create-character", {
        body: { 
          type: "generate_new", 
          input: { 
            description: newDescription,
            businessName: newBusinessName.trim(),
            uploadedFiles: parsedFiles
          } 
        }
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
      setUploadingFiles(false);
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
    setUploadingFiles(true);
    try {
      // Parse uploaded files for refine
      const parsedFiles = await parseUploadedFiles(refineUploadedFiles);
      
      const { data, error } = await supabase.functions.invoke("create-character", {
        body: { 
          type: "refine", 
          input: { 
            basePersonality: generatedCharacter,
            task: refineTask,
            link: refineLink,
            businessInfo: refineBusinessInfo,
            uploadedFiles: parsedFiles
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
      setUploadingFiles(false);
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto flex-col gap-3 p-6 py-8 min-h-[140px]"
                onClick={() => handleChoose("new")}
              >
                <Sparkles className="h-8 w-8 flex-shrink-0" />
                <div className="w-full text-center">
                  <div className="font-semibold text-base">New Character</div>
                  <div className="text-sm text-muted-foreground mt-1">Create from description</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-3 p-6 py-8 min-h-[140px]"
                onClick={() => handleChoose("human")}
              >
                <User className="h-8 w-8 flex-shrink-0" />
                <div className="w-full text-center">
                  <div className="font-semibold text-base">Human Character</div>
                  <div className="text-sm text-muted-foreground mt-1">Based on real person</div>
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

            <div className="space-y-2">
              <Label>Business Name <span className="text-destructive">*</span></Label>
              <Input
                value={newBusinessName}
                onChange={(e) => setNewBusinessName(e.target.value)}
                placeholder="e.g., Mavins Real Estate, TechCo Solutions..."
              />
              <p className="text-xs text-muted-foreground">Required — used in greetings and AI Brain identity.</p>
            </div>
            
            <div className="space-y-2">
              <Label>Upload Documents (Optional - Max 10 files)</Label>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('character-file-upload')?.click()}
                  disabled={uploadedFiles.length >= 10}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documents (PDF, DOCX, TXT, MD)
                </Button>
                <input
                  id="character-file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.md"
                  onChange={(e) => handleFileUpload(e.target.files, false)}
                  className="hidden"
                />
                {uploadedFiles.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{uploadedFiles.length}/10 files</p>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-secondary p-2 rounded text-sm">
                        <span className="truncate">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index, false)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("choose")}>Back</Button>
              <Button onClick={handleGenerateNew} disabled={loading || uploadingFiles}>
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
                placeholder="e.g., Elon Musk, SpaceX CEO, American entrepreneur"
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
              <Label>Data Scraped Successfully</Label>
              <div className="p-4 bg-secondary rounded-lg border-2 border-primary">
                <p className="text-sm font-bold mb-3 text-primary uppercase">
                  I scraped all available data on this human and prepared it to train my brain with your permission.
                </p>
                <p className="text-sm whitespace-pre-wrap lowercase">{humanInfo}</p>
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
            
            <div className="space-y-2">
              <Label>Upload Business Documents (Optional - Max 10 files)</Label>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('refine-file-upload')?.click()}
                  disabled={refineUploadedFiles.length >= 10}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documents (PDF, DOCX, TXT, MD)
                </Button>
                <input
                  id="refine-file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.md"
                  onChange={(e) => handleFileUpload(e.target.files, true)}
                  className="hidden"
                />
                {refineUploadedFiles.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{refineUploadedFiles.length}/10 files</p>
                    {refineUploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-secondary p-2 rounded text-sm">
                        <span className="truncate">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index, true)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(characterType === "new" ? "new_result" : "human_result")}>
                Back
              </Button>
              <Button onClick={handleRefine} disabled={loading || uploadingFiles}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Refining...</> : "Refine Character"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
