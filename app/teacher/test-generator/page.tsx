"use client";

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { FlaskConical, Plus, Minus, FileText, FileCheck, Download, AlarmCheck, Loader2, FileDown, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SimplePDFDownloadButton } from '@/components/test/SimplePDFRenderer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

const TeacherTestGenerator = () => {
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testSubject, setTestSubject] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedTest, setGeneratedTest] = useState('');
  const [materials, setMaterials] = useState<Upload[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  
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
  const fetchMaterials = async (): Promise<Upload[]> => {
    setIsLoadingMaterials(true);
    try {
      const response = await fetch('/api/materials/get-materials');
      
      if (!response.ok) {
        throw new Error('Failed to fetch materials');
      }

      const data = await response.json();
      
      // Set materials state (this assumes you have a setMaterials function)
      const transformedMaterials = data.uploads.map((material: any) => ({
        id: material.id,
        title: material.title,
        fileUrl: material.fileUrl,
        fileType: material.fileType,
        materialType: material.materialType,
        subject: material.subject,
        createdAt: material.createdAt,
        updatedAt: material.updatedAt,
        hasParsedContent: material.hasParsedContent,
        parseStatus: material.parseStatus,
        isPending: material.isPending,
        isReady: material.isReady
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

      const data = await response.json();
      
      if (!response.ok) {
        // Handle specific error cases
        if (data.code === 'CONTENT_NOT_PARSED') {
          toast.error('This material has not been processed yet. Please wait a moment and try again, or select a different material.');
          
          // Show a more informative message to the user
          toast.info('Materials are processed in the background after upload. This may take a few moments depending on the file size.');
        } else {
          // General error handling
          throw new Error(data.error || 'Failed to generate test');
        }
        return;
      }
      
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
                            <p>Refresh material list to see newly processed materials</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select 
                      value={selectedMaterial} 
                      onValueChange={setSelectedMaterial}
                      disabled={isLoadingMaterials}
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
                              className={material.isReady ? "" : "text-gray-400"}
                              disabled={material.isPending}
                            >
                              {material.title}
                              {material.isPending && " (Processing...)"}
                              {!material.isPending && !material.isReady && " (Not parsed)"}
                              {material.isReady && " (✓)"}
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
                      Materials with "✓" are ready for test generation. If you've recently uploaded materials, they may still be processing. Use the refresh button to check their status.
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
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-medium">Question Configuration</h3>
                  <div className="text-sm text-muted-foreground">
                    Total Questions: {getQuestionTotal()}
                  </div>
                </div>
                
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <div key={index} className="flex items-start gap-4 p-3 border rounded-md">
                      <div className="grid flex-1 grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor={`type-${index}`} className="text-xs">Question Type</Label>
                          <Select 
                            value={question.type} 
                            onValueChange={(value) => handleQuestionTypeChange(value, index)}
                          >
                            <SelectTrigger id={`type-${index}`}>
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
                        
                        <div className="space-y-1">
                          <Label htmlFor={`quantity-${index}`} className="text-xs">Number of Questions</Label>
                          <Select 
                            value={question.quantity.toString()} 
                            onValueChange={(value) => handleQuestionQuantityChange(value, index)}
                          >
                            <SelectTrigger id={`quantity-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor={`difficulty-${index}`} className="text-xs">Difficulty Level</Label>
                          <Select 
                            value={question.difficulty} 
                            onValueChange={(value) => handleQuestionDifficultyChange(value, index)}
                          >
                            <SelectTrigger id={`difficulty-${index}`}>
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
                      
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveQuestion(index)}
                        disabled={questions.length === 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={handleAddQuestion}
                  >
                    <Plus className="h-4 w-4 mr-2" />
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
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadMarkdown}
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        Download MD
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
    </>
  );
};

export default TeacherTestGenerator;
