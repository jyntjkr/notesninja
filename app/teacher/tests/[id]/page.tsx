"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, ArrowLeft, Calendar, Pencil, Download, FileText } from 'lucide-react';
import { SimplePDFDownloadButton } from '@/components/test/SimplePDFRenderer';
import { EnhancedPDFDownloadButton } from '@/components/test/EnhancedPDFRenderer';
import { SimplerPDFDownloadButton } from '@/components/test/SimplerPDFRenderer';
import TestPreview from '@/components/test/TestPreview';

interface Test {
  id: string;
  title: string;
  description?: string;
  subject: string;
  content: string;
  testConfig: any;
  createdAt: string;
  updatedAt: string;
  userId: string;
  materialId: string;
}

const TestViewPage = () => {
  const [test, setTest] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const { isAuthenticated, isTeacher } = useAuth();
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
    } else if (!isTeacher) {
      router.push('/student/dashboard');
    } else {
      fetchTest();
    }
  }, [isAuthenticated, isTeacher, testId, router]);

  const fetchTest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tests/get-test?id=${testId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch test');
      }

      const data = await response.json();
      
      if (data.success && data.data.test) {
        setTest(data.data.test);
      } else {
        throw new Error(data.error || 'Failed to fetch test');
      }
    } catch (error) {
      console.error('Error fetching test:', error);
      toast.error('Failed to load test. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPdfFileName = () => {
    if (!test) return 'test.pdf';
    return `${test.title.replace(/\s+/g, '_').toLowerCase()}_test.pdf`;
  };

  if (!isAuthenticated || !isTeacher) {
    return null;
  }

  return (
    <>
      <PageHeader 
        title="Test Details" 
        description="View your test details and content"
      >
        <Button 
          variant="outline" 
          onClick={() => router.push('/teacher/tests')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tests
        </Button>
      </PageHeader>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading test details...</span>
        </div>
      ) : test ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">{test.title}</CardTitle>
                  {test.description && <p className="text-muted-foreground mt-1">{test.description}</p>}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push(`/teacher/tests/${test.id}/edit`)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <SimplerPDFDownloadButton
                    title={test.title}
                    description={test.description || ''}
                    content={test.content}
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
                    >
                      {isPdfLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Preparing...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Download PDF
                        </>
                      )}
                    </Button>
                  </SimplerPDFDownloadButton>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="secondary">
                  {test.subject || 'General'}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {formatDate(test.createdAt)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md p-4 bg-muted/30">
                <div className="prose-sm max-h-[600px] overflow-y-auto p-2">
                  <TestPreview 
                    content={test.content} 
                    className="border-0 shadow-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12">
          <p>Test not found or unable to load test data.</p>
          <Button 
            variant="outline" 
            onClick={() => router.push('/teacher/tests')}
            className="mt-4"
          >
            Go Back to Tests
          </Button>
        </div>
      )}
    </>
  );
};

export default TestViewPage; 