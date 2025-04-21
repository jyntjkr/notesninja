"use client";

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { ClipboardList, Search, Filter, Download, Share2, Edit, Calendar, Users, Timer, Eye, Pencil, Copy, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Define types for tests
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

const TeacherTests = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [shareCode, setShareCode] = useState('TEST-2438-ABCD');
  const [shareUrl, setShareUrl] = useState('https://smartnote.companion/test/2438abcd');
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Authentication check
  const { isAuthenticated, isTeacher } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
    } else if (!isTeacher) {
      router.push('/student/dashboard');
    } else {
      // Fetch tests when authenticated
      fetchTests();
    }
  }, [isAuthenticated, isTeacher, router]);

  const fetchTests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tests/get-tests');
      
      if (!response.ok) {
        throw new Error('Failed to fetch tests');
      }

      const data = await response.json();
      
      if (data.success) {
        setTests(data.data.tests);
      } else {
        throw new Error(data.error || 'Failed to fetch tests');
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast.error('Failed to load tests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render until authenticated
  if (!isAuthenticated || !isTeacher) {
    return null;
  }

  // Format date to readable format
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredTests = tests
    .filter(test => test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    test.subject.toLowerCase().includes(searchQuery.toLowerCase()));

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleCreateNewTest = () => {
    router.push('/teacher/test-generator');
  };

  return (
    <>
      <PageHeader 
        title="My Tests" 
        description="View, manage, and share your generated tests."
      >
        <Button onClick={handleCreateNewTest}>
          <ClipboardList className="h-4 w-4 mr-2" />
          Create New Test
        </Button>
      </PageHeader>
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tests by title or subject"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select defaultValue="newest">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="sm:w-auto">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
        
        <div className="mt-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading tests...</span>
              </div>
            ) : filteredTests.length > 0 ? (
              filteredTests.map((test, index) => (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover-scale">
                    <CardContent className="p-0">
                      <div className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex gap-4 items-start">
                            <div className="rounded-full p-3 bg-blue-100 text-blue-600">
                              <ClipboardList className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                              <h3 className="font-medium text-lg">{test.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>Created: {formatDate(test.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/teacher/tests/${test.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => router.push(`/teacher/test-generator?edit=${test.id}`)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            {test.subject || "General"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center border rounded-lg border-dashed">
                <ClipboardList className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Tests Found</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  {searchQuery ? 
                    "No tests match your search query. Try a different search term." : 
                    "You haven't created any tests yet. Click 'Create New Test' to get started."}
                </p>
                <Button onClick={handleCreateNewTest}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Test
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default TeacherTests;
