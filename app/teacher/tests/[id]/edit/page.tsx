"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Save, ArrowLeft } from 'lucide-react';

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

const TestEditPage = () => {
  const [test, setTest] = useState<Test | null>(null);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

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
        setContent(data.data.test.content);
        toast.success('Test loaded successfully');
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

  const handleUpdateContent = async () => {
    if (!test) {
      toast.error('Test data is missing');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch('/api/tests/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: test.id,
          title: test.title,
          description: test.description || '',
          subject: test.subject || '',
          content: content,
          testConfig: test.testConfig,
          materialId: test.materialId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update test');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Test content updated successfully!');
        // Navigate back to tests page
        router.push('/teacher/tests');
      } else {
        throw new Error(data.error || 'Failed to update test');
      }
    } catch (error) {
      console.error('Error updating test:', error);
      toast.error('Failed to update test. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isAuthenticated || !isTeacher) {
    return null;
  }

  return (
    <>
      <PageHeader 
        title="Edit Test Content" 
        description="Edit the content of your test"
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
          <span className="ml-2">Loading test...</span>
        </div>
      ) : test ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{test.title}</CardTitle>
              {test.description && <p className="text-sm text-muted-foreground">{test.description}</p>}
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[500px] font-mono"
                placeholder="Edit test content here..."
              />
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleUpdateContent} 
                  disabled={isUpdating}
                  className="w-full md:w-auto"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Test
                    </>
                  )}
                </Button>
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

export default TestEditPage; 