"use client";

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { FlaskConical, Plus, Minus, FileText, FileCheck, Download, AlarmCheck, Loader2, FileDown, RefreshCw, AlertCircle, CheckCircle, CheckIcon, Pencil, Save } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SimplePDFDownloadButton } from '@/components/test/SimplePDFRenderer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FormControl } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';

// Interface for upload data
interface Upload {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  description: string;
  materialType: string;
  subject: string;
  fileName: string;
  isParsed?: boolean;
  hasParsedContent: boolean;
  parseStatus?: string;
  isPending?: boolean;
  isReady?: boolean;
}

// Update the Material type to include parseStatus
interface Material {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
  parsedContent?: string | null;
  parseStatus?: string;
  isReady: boolean;
  isPending: boolean;
}

const TeacherTestGenerator = () => {
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testSubject, setTestSubject] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedTest, setGeneratedTest] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [questions, setQuestions] = useState([
    { type: 'mcq', quantity: 5, difficulty: 'medium' },
    { type: 'short', quantity: 3, difficulty: 'easy' },
    { type: 'long', quantity: 2, difficulty: 'hard' },
  ]);

  // Authentication check
  const { isAuthenticated, isTeacher } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
    } else if (!isTeacher) {
      router.push('/student/dashboard');
    } else {
      // Fetch materials
      fetchMaterials();
    }
  }, [isAuthenticated, isTeacher, router]);

  // Fetch materials from the API
  const fetchMaterials = async (): Promise<Material[]> => {
    setIsLoadingMaterials(true);
    try {
      const response = await fetch('/api/materials/get-materials');
      
      if (!response.ok) {
        throw new Error('Failed to fetch materials');
      }

      const data = await response.json();
      
      // Set materials state with the returned uploads array (API returns uploads, not materials)
      const transformedMaterials = data.uploads.map((material: any): Material => ({
        id: material.id,
        title: material.title,
        description: material.description,
        fileUrl: material.fileUrl,
        fileType: material.fileType,
        uploadedAt: new Date(material.createdAt).toLocaleDateString(),
        parsedContent: material.parsedContent,
        parseStatus: material.parseStatus,
        isReady: material.parseStatus === "COMPLETED" && material.hasParsedContent,
        isPending: material.parseStatus === "PROCESSING" || material.parseStatus === "PENDING",
      }));
      
      // Update state with the fetched materials
      setMaterials(transformedMaterials);
      
      return transformedMaterials;
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to load materials. Please try again.');
      return [];
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  // Don't render until authenticated
  if (!isAuthenticated || !isTeacher) {
    return null;
  }

  const handleAddQuestion = () => {
    setQuestions([...questions, { type: 'mcq', quantity: 1, difficulty: 'medium' }]);
  };

  const handleRemoveQuestion = (index: number) => {
    const newQuestions = [...questions];
    newQuestions.splice(index, 1);
    setQuestions(newQuestions);
  };

  const handleQuestionTypeChange = (value: string, index: number) => {
    const newQuestions = [...questions];
    newQuestions[index].type = value;
    setQuestions(newQuestions);
  };

  const handleQuestionQuantityChange = (value: string, index: number) => {
    const newQuestions = [...questions];
    newQuestions[index].quantity = parseInt(value, 10);
    setQuestions(newQuestions);
  };

  const handleQuestionDifficultyChange = (value: string, index: number) => {
    const newQuestions = [...questions];
    newQuestions[index].difficulty = value;
    setQuestions(newQuestions);
  };

  const handleGenerateTest = async () => {
    // Validate required fields
    if (!testTitle) {
      toast.error('Please enter a test title');
      return;
    }

    if (!testSubject) {
      toast.error('Please select a subject');
      return;
    }

    if (!selectedMaterial) {
      toast.error('Please select a source material');
      return;
    }

    setIsGenerating(true);
    try {
      // Call the API to generate the test
      const response = await fetch('/api/tests/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materialId: selectedMaterial,
          testConfig: {
            testTitle,
            testSubject,
            testDescription,
            questions,
          },
        }),
      });

      // Check for timeout or network error
      if (!response.ok) {
        // Try to parse the JSON response
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          // If we can't parse JSON, it might be a gateway timeout or network error
          if (response.status === 504) {
            throw new Error('The test generation timed out. This PDF is too large or complex. Try using a smaller document or fewer questions.');
          } else {
            throw new Error(`Request failed with status: ${response.status}`);
          }
        }
        
        // Handle specific error cases
        if (errorData.code === 'CONTENT_NOT_PARSED') {
          toast.error('This material has not been processed yet. Please wait a moment and try again, or select a different material.');
          
          // Show a more informative message to the user
          toast.info('Materials are processed in the background after upload. This may take a few moments depending on the file size.');
        } else if (errorData.code === 'GENERATION_TIMEOUT') {
          toast.error('The test generation timed out. This PDF is too large or complex.');
          toast.info('Try using a smaller document or reducing the number of questions.');
        } else {
          // General error handling
          throw new Error(errorData.error || 'Failed to generate test');
        }
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.data.test) {
        setGeneratedTest(data.data.test);
        setIsGenerated(true);
        toast.success('Test generated successfully!');
      } else {
        throw new Error(data.error || 'Failed to generate test');
      }
    } catch (error) {
      console.error('Error generating test:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate test. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadMarkdown = () => {
    // Create a blob from the generated test
    const blob = new Blob([generatedTest], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    // Create a link and click it to download
    const a = document.createElement('a');
    a.href = url;
    a.download = `${testTitle.replace(/\s+/g, '_').toLowerCase()}_test.md`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Test downloaded as Markdown!');
  };

  const getPdfFileName = () => {
    return `${testTitle.replace(/\s+/g, '_').toLowerCase()}_test.pdf`;
  };

  const getQuestionTotal = () => {
    return questions.reduce((total, question) => total + question.quantity, 0);
  };

  // Add a function to trigger re-parsing of a failed PDF
  const retryParsePdf = async (materialId: string) => {
    if (!materialId) return;
    
    try {
      toast.info("Starting PDF parsing...");
      const response = await fetch("/api/materials/parse-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uploadId: materialId }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to start parsing");
      }
      
      toast.success("PDF parsing started, please wait a moment and refresh");
      // Refresh materials list after a delay
      setTimeout(() => {
        fetchMaterials();
      }, 5000);
    } catch (error) {
      console.error("Error retrying PDF parsing:", error);
      toast.error("Failed to start PDF parsing");
    }
  };

  // Add function to save test to database
  const handleSaveTest = async () => {
    // Validate required fields
    if (!testTitle) {
      toast.error('Please enter a test title');
      return;
    }

    if (!selectedMaterial) {
      toast.error('Please select a source material');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/tests/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: testTitle,
          description: testDescription,
          subject: testSubject,
          content: generatedTest,
          testConfig: {
            testTitle,
            testSubject,
            testDescription,
            questions,
          },
          materialId: selectedMaterial,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save test');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Test saved successfully!');
      } else {
        throw new Error(data.error || 'Failed to save test');
      }
    } catch (error) {
      console.error('Error saving test:', error);
      toast.error('Failed to save test. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingMaterials) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Loading materials...</p>
      </div>
    )
  }

  return (
    <>
      <PageHeader 
        title="Test Generator" 
        description="Create AI-generated tests and exams based on your uploaded materials."
      />
      
      <div className="grid md:grid-cols-5 gap-6">
        <motion.div 
          className="md:col-span-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Test Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Test Title</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g., Midterm Exam: Physics Mechanics"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select 
                      value={testSubject} 
                      onValueChange={setTestSubject}
                    >
                      <SelectTrigger id="subject">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="physics">Physics</SelectItem>
                        <SelectItem value="chemistry">Chemistry</SelectItem>
                        <SelectItem value="biology">Biology</SelectItem>
                        <SelectItem value="mathematics">Mathematics</SelectItem>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="history">History</SelectItem>
                        <SelectItem value="geography">Geography</SelectItem>
                        <SelectItem value="computer_science">Computer Science</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="source">Source Material</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => fetchMaterials()}
                              disabled={isLoadingMaterials}
                              className="h-8 w-8 p-0"
                            >
                              <RefreshCw className={`h-4 w-4 ${isLoadingMaterials ? 'animate-spin' : ''}`} />
                              <span className="sr-only">Refresh materials</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Refresh to see newly processed materials</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select
                      value={selectedMaterial}
                      onValueChange={setSelectedMaterial}
                      disabled={isLoadingMaterials || isGenerating}
                    >
                      <SelectTrigger id="source">
                        <SelectValue placeholder={isLoadingMaterials ? "Loading materials..." : "Select material"} />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.length > 0 ? (
                          materials.map((material) => (
                            <SelectItem 
                              key={material.id}
                              value={material.id}
                              disabled={!material.isReady}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="truncate mr-2">{material.title}</span>
                                {material.isPending && (
                                  <span className="ml-auto flex items-center text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    <span className="text-xs">Processing</span>
                                  </span>
                                )}
                                {material.parseStatus === "FAILED" && (
                                  <span className="ml-auto text-destructive">
                                    <AlertCircle className="h-4 w-4" />
                                  </span>
                                )}
                                {material.isReady && (
                                  <span className="ml-auto text-green-500">
                                    <CheckCircle className="h-4 w-4" />
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no_materials" disabled>
                            {isLoadingMaterials ? "Loading materials..." : "No materials found"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground mt-1">
                      {isLoadingMaterials 
                        ? "Loading materials..." 
                        : materials.length === 0 
                          ? "No materials available" 
                          : "Select a material. Items that are still being processed or failed parsing are disabled."}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Test Description or Instructions (Optional)</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Add instructions for students taking this test..."
                    rows={3}
                    value={testDescription}
                    onChange={(e) => setTestDescription(e.target.value)}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Question Configuration
                  </h3>
                  <div className="text-sm font-medium px-3 py-1.5 bg-primary/10 text-primary rounded-md inline-flex items-center self-start sm:self-center">
                    <span>Total Questions: {getQuestionTotal()}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <div key={index} className="border rounded-md overflow-hidden">
                      {/* Question header with remove button */}
                      <div className="bg-muted px-3 py-2 flex items-center justify-between">
                        <span className="font-medium text-sm">{question.type === 'mcq' ? 'Multiple Choice' : 
                            question.type === 'short' ? 'Short Answer' : 
                            question.type === 'long' ? 'Long Answer' : 
                            question.type === 'true_false' ? 'True/False' : 'Matching'}</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveQuestion(index)}
                          disabled={questions.length === 1}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </div>
                      
                      {/* Question content */}
                      <div className="p-3 space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor={`type-${index}`} className="text-sm">Question Type</Label>
                          <Select 
                            value={question.type} 
                            onValueChange={(value) => handleQuestionTypeChange(value, index)}
                          >
                            <SelectTrigger id={`type-${index}`} className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mcq">Multiple Choice</SelectItem>
                              <SelectItem value="short">Short Answer</SelectItem>
                              <SelectItem value="long">Long Answer</SelectItem>
                              <SelectItem value="true_false">True/False</SelectItem>
                              <SelectItem value="matching">Matching</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor={`quantity-${index}`} className="text-sm">Number</Label>
                            <Select 
                              value={question.quantity.toString()} 
                              onValueChange={(value) => handleQuestionQuantityChange(value, index)}
                            >
                              <SelectTrigger id={`quantity-${index}`} className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                  <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`difficulty-${index}`} className="text-sm">Difficulty</Label>
                            <Select 
                              value={question.difficulty} 
                              onValueChange={(value) => handleQuestionDifficultyChange(value, index)}
                            >
                              <SelectTrigger id={`difficulty-${index}`} className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full flex items-center justify-center gap-2 h-12"
                    onClick={handleAddQuestion}
                  >
                    <Plus className="h-5 w-5" />
                    Add Question Type
                  </Button>
                </div>
              </div>
              
              <div className="pt-2">
                <Button 
                  type="button" 
                  className="w-full"
                  onClick={handleGenerateTest}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Test...
                    </>
                  ) : (
                    <>
                      <FlaskConical className="h-4 w-4 mr-2" />
                      Generate Test
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div 
          className="md:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Test Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isGenerated ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center border rounded-md border-dashed bg-muted/40">
                  <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Test Generated Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md">
                    Configure your test settings on the left and click "Generate Test" to create an AI-generated test based on your uploaded material.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border rounded-md p-4 relative bg-card">
                    <div className="flex justify-end gap-2 mb-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toast.info('Edit functionality will be implemented soon')}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={isSaving}
                        onClick={handleSaveTest}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                      <SimplePDFDownloadButton
                        title={testTitle}
                        description={testDescription}
                        content={generatedTest}
                        fileName={getPdfFileName()}
                        onStart={() => {
                          setIsPdfLoading(true);
                          toast.info('Preparing PDF for download...');
                        }}
                        onComplete={(success) => {
                          setIsPdfLoading(false);
                          if (success) {
                            toast.success('PDF downloaded successfully!');
                          } else {
                            toast.error('Failed to download PDF. Please try again.');
                          }
                        }}
                      >
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={isPdfLoading}
                          onClick={() => {}}
                        >
                          {isPdfLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Preparing PDF...
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-2" />
                              Download PDF
                            </>
                          )}
                        </Button>
                      </SimplePDFDownloadButton>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-center">{testTitle}</h3>
                      {testDescription && <p className="text-sm italic text-center">{testDescription}</p>}
                      
                      <div className="mt-4 prose-sm max-h-[600px] overflow-y-auto p-2">
                        <pre className="text-sm whitespace-pre-wrap">{generatedTest}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Add a retry button for failed materials */}
      {materials.some(m => m.parseStatus === "FAILED") && (
        <div className="mt-4 p-4 border rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground mb-2">
            Some materials failed to process. You can try parsing them again:
          </p>
          <div className="flex flex-wrap gap-2">
            {materials
              .filter(m => m.parseStatus === "FAILED")
              .map(material => (
                <Button
                  key={material.id}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => retryParsePdf(material.id)}
                >
                  <RefreshCw className="h-3 w-3" />
                  <span className="truncate max-w-[150px]">{material.title}</span>
                </Button>
              ))}
          </div>
        </div>
      )}
    </>
  );
};

export default TeacherTestGenerator;
