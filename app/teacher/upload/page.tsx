"use client";

import React, { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { FileText, PlusCircle, Check, X, AlertTriangle } from 'lucide-react';
import { UploadDropzone } from '@/utils/uploadthing';
import type { UploadFileResponse } from 'uploadthing/client';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useParseStatus } from '@/hooks/use-parse-status';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define types for the upload response
interface UploadedFile {
  fileUrl: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

const TeacherUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDescription, setMaterialDescription] = useState('');
  const [materialType, setMaterialType] = useState('notes');
  const [materialSubject, setMaterialSubject] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  // Authentication check
  const { isAuthenticated, isTeacher } = useAuth();
  const router = useRouter();

  // Parse status monitoring
  const {
    status: parseStatus,
    isPolling,
    isPending,
    isProcessing,
    isCompleted,
    isFailed,
  } = useParseStatus({
    uploadId: uploadedId || '',
    onComplete: () => {
      toast.success('PDF processing completed successfully!');
    },
    onError: () => {
      toast.error('PDF processing failed. The material can still be used, but AI features may be limited.');
    }
  });

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
    } else if (!isTeacher) {
      router.push('/student/dashboard');
    }
  }, [isAuthenticated, isTeacher, router]);

  // Don't render until authenticated
  if (!isAuthenticated || !isTeacher) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadedFile || !materialTitle || !materialSubject) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Upload the file details to our API
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: materialTitle,
          description: materialDescription,
          type: materialType,
          subject: materialSubject,
          fileUrl: uploadedFile.fileUrl,
          fileType: uploadedFile.fileType,
          fileName: uploadedFile.fileName,
          fileSize: uploadedFile.fileSize,
          fileKey: uploadedFile.fileKey,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload material');
      }
      
      const data = await response.json();
      
      // If successful, mark as submitted and show success message
      setIsSubmitted(true);
      setUploadedId(data.uploadId);
      setIsPdf(data.isPdf);
      
      toast.success('Material uploaded successfully!');
      
      // Redirect after a delay
      setTimeout(() => {
        router.push('/teacher/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Error uploading material:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while uploading');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUploaded = (file: UploadedFile) => {
    setUploadedFile(file);
    setIsPdf(file.fileType === 'application/pdf' || file.fileName.toLowerCase().endsWith('.pdf'));
  };

  return (
    <>
      <PageHeader 
        title="Upload Teaching Material" 
        description="Share notes, slides, worksheets, and other resources with your students."
      />
      
      <form onSubmit={handleSubmit} className="w-full max-w-full overflow-hidden px-0">
        <div className="grid md:grid-cols-2 gap-6 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <div className="space-y-6 w-full">
              <h2 className="text-lg font-medium">1. Select File</h2>
              
              <Card className="w-full">
                <CardContent className="pt-6 px-3 sm:px-6">
                  {!uploadedFile ? (
                    <div className="min-h-[200px] max-h-[300px] w-full">
                      <UploadDropzone 
                        endpoint="teacherDocumentUploader"
                        onUploadBegin={() => setIsUploading(true)}
                        onClientUploadComplete={(res) => {
                          if (res && res.length > 0) {
                            // Determine file type from extension
                            const fileName = res[0].name;
                            let fileType = 'application/octet-stream';
                            
                            if (fileName) {
                              const extension = fileName.split('.').pop()?.toLowerCase();
                              if (extension === 'pdf') {
                                fileType = 'application/pdf';
                              } else if (['doc', 'docx'].includes(extension || '')) {
                                fileType = 'application/msword';
                              } else if (['jpg', 'jpeg', 'png'].includes(extension || '')) {
                                fileType = `image/${extension}`;
                              } else if (extension === 'txt') {
                                fileType = 'text/plain';
                              }
                            }
                            
                            handleFileUploaded({
                              fileUrl: res[0].url,
                              fileKey: res[0].key,
                              fileName: res[0].name,
                              fileSize: res[0].size,
                              fileType: fileType
                            });
                          }
                        }}
                        onUploadError={(error) => {
                          toast.error(`Upload error: ${error.message}`);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="border rounded-md p-4 relative">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        type="button"
                        className="absolute top-2 right-2"
                        onClick={() => setUploadedFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex items-center space-x-4">
                        <FileText className="h-10 w-10 text-primary flex-shrink-0" />
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="font-medium truncate">{uploadedFile.fileName}</div>
                          <div className="text-xs text-muted-foreground">
                            {uploadedFile.fileType} • {(uploadedFile.fileSize / (1024 * 1024)).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <h2 className="text-lg font-medium">2. Material Details</h2>
              
              <Card className="w-full">
                <CardContent className="pt-6 space-y-4 px-3 sm:px-6">
                  <div className="space-y-2 w-full">
                    <Label htmlFor="title">Title</Label>
                    <Input 
                      id="title" 
                      placeholder="e.g., Physics: Laws of Motion"
                      value={materialTitle}
                      onChange={(e) => setMaterialTitle(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Material Type</Label>
                      <Select 
                        value={materialType} 
                        onValueChange={setMaterialType}
                        required
                      >
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notes">Lecture Notes</SelectItem>
                          <SelectItem value="slides">Presentation Slides</SelectItem>
                          <SelectItem value="handout">Handout</SelectItem>
                          <SelectItem value="worksheet">Worksheet</SelectItem>
                          <SelectItem value="resource">Additional Resource</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Select 
                        value={materialSubject} 
                        onValueChange={setMaterialSubject}
                        required
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
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Briefly describe what this material covers..."
                      rows={4}
                      value={materialDescription}
                      onChange={(e) => setMaterialDescription(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (optional)</Label>
                    <Input id="tags" placeholder="e.g., kinematics, forces, energy (comma-separated)" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="w-full"
        >
          <Separator className="my-6" />
          
          {isSubmitted && isPdf && (
            <Alert className="my-4" variant={isFailed ? "destructive" : isCompleted ? "default" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>PDF Processing {isCompleted ? "Complete" : isFailed ? "Failed" : "In Progress"}</AlertTitle>
              <AlertDescription>
                {isPending && "Your PDF is queued for processing. This will enable AI features like test generation."}
                {isProcessing && "Your PDF is being processed. This may take a few minutes depending on the file size."}
                {isCompleted && "Your PDF has been successfully processed and is ready for AI features."}
                {isFailed && "PDF processing failed. The material can still be used, but AI features may be limited."}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="mt-6 flex justify-center sm:justify-end">
            <Button 
              type="submit" 
              disabled={!uploadedFile || !materialTitle || !materialDescription || !materialSubject || isSubmitting || isSubmitted}
              className="gap-2 w-full sm:w-auto"
            >
              {isSubmitting ? (
                "Uploading..."
              ) : isSubmitted ? (
                <>
                  <Check className="h-4 w-4" />
                  Material Uploaded
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  Upload Material
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </form>
    </>
  );
};

export default TeacherUpload;
