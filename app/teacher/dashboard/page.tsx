"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/shared/PageHeader';
import MetricCard from '@/components/ui/card-metrics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileText, Users, Clipboard, GraduationCap, Clock, Download, CheckCircle, AlertCircle, Calendar, Pencil, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { Icons } from '@/components/shared/icons';
import { toast } from 'sonner';

// Define interface for material
interface Material {
  id: string;
  title: string;
  fileUrl: string;
  description: string;
  materialType: string;
  subject: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  dateDisplay: string;
  daysAgo: number;
  parseStatus?: string;
  isPending?: boolean;
  isReady?: boolean;
  hasParsedContent?: boolean;
}

// Define interface for test
interface Test {
  id: string;
  title: string;
  description?: string;
  subject: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function TeacherDashboard() {
  // Authentication check
  const { isAuthenticated, isTeacher, status, roleConfirmed } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialCount, setMaterialCount] = useState(0);
  const [tests, setTests] = useState<Test[]>([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [testCount, setTestCount] = useState(0);
  
  // Fetch materials
  const fetchMaterials = async () => {
    try {
      setMaterialsLoading(true);
      const response = await fetch('/api/materials/get-materials?limit=5&sort=latest');
      if (!response.ok) {
        throw new Error('Failed to fetch materials');
      }
      const data = await response.json();
      // Handle both data formats for backward compatibility
      const materialsData = data.materials || data.uploads || [];
      setMaterials(materialsData);
      setMaterialCount(materialsData.length);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to fetch your materials');
      // Set empty array on error
      setMaterials([]);
    } finally {
      setMaterialsLoading(false);
    }
  };
  
  // Fetch tests
  const fetchTests = async () => {
    try {
      setTestsLoading(true);
      const response = await fetch('/api/tests/get-tests');
      if (!response.ok) {
        throw new Error('Failed to fetch tests');
      }
      const data = await response.json();
      
      if (data.success && data.data.tests) {
        const testsData = data.data.tests;
        setTests(testsData.slice(0, 3)); // Get only the top 3 tests
        setTestCount(testsData.length);
      } else {
        throw new Error('Failed to fetch tests');
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast.error('Failed to fetch your tests');
      // Set empty array on error
      setTests([]);
    } finally {
      setTestsLoading(false);
    }
  };
  
  React.useEffect(() => {
    // Only run redirects after the session has loaded
    if (status !== "loading") {
      setIsLoading(false);
      
      if (!isAuthenticated) {
        router.push('/auth');
      } else if (!roleConfirmed) {
        router.push('/auth/role-select');
      } else if (!isTeacher) {
        router.push('/student/dashboard');
      } else {
        // Fetch materials and tests when authenticated
        fetchMaterials();
        fetchTests();
      }
    }
  }, [isAuthenticated, isTeacher, roleConfirmed, router, status]);

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Function to handle material download
  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Don't render until authenticated and session is loaded
  if (isLoading || !isAuthenticated || !isTeacher || !roleConfirmed) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Icons.spinner className="h-8 w-8 animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-medium">Loading dashboard...</h2>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="md:flex md:justify-between md:items-center mb-6">
        <PageHeader 
          title="Teacher Dashboard" 
          description="Welcome back! Here's an overview of your materials and student engagement."
        />
        <div className="hidden md:flex text-sm text-muted-foreground items-center mt-1">
          <Clock className="h-4 w-4 mr-1" />
          Last updated: Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      
      {materialCount === 0 && (
        <div className="bg-muted/50 rounded-lg p-4 mb-6 text-sm flex items-start md:items-center">
          <AlertCircle className="h-5 w-5 md:h-4 md:w-4 mr-2 text-primary mt-0.5 md:mt-0 flex-shrink-0" />
          <span>Get started by uploading your first teaching material to enable AI-powered test generation.</span>
        </div>
      )}
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left column with metric cards and materials */}
        <div className="space-y-6">
          {/* Metric cards */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-4 grid-cols-2"
          >
            <motion.div variants={item}>
              <MetricCard
                title="Total Materials"
                value={String(materialCount || 0)}
                icon={<FileText className="h-4 w-4" />}
                description=""
              />
            </motion.div>
            
            <motion.div variants={item}>
              <MetricCard
                title="Tests Created"
                value={String(testCount || 0)}
                icon={<Clipboard className="h-4 w-4" />}
                description=""
              />
            </motion.div>
          </motion.div>
          
          {/* Materials section */}
          <Tabs defaultValue="recent" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Materials</h2>
              <TabsList>
                <TabsTrigger value="recent">Recent</TabsTrigger>
                <TabsTrigger value="popular">Popular</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="recent" className="space-y-4 mt-0">
              {materialsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Icons.spinner className="h-6 w-6 animate-spin" />
                </div>
              ) : !materials || materials.length === 0 ? (
                <Card>
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                    <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No materials yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">Start by uploading your first teaching material</p>
                    <Button onClick={() => router.push('/teacher/upload')}>Upload Material</Button>
                  </CardContent>
                </Card>
              ) : (
                materials.map((item, i) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="hover-scale">
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{item.title}</h3>
                              <p className="text-sm text-muted-foreground">{item.dateDisplay}</p>
                            </div>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8" 
                              title="Download"
                              onClick={() => handleDownload(item.fileUrl, item.fileName)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                              {item.materialType}
                            </div>
                            <div className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                              {item.subject}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {(item.fileSize / (1024 * 1024)).toFixed(2)} MB
                            </div>
                            {item.fileUrl.toLowerCase().endsWith('.pdf') && (
                              <>
                                {item.isPending && (
                                  <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full flex items-center">
                                    <Icons.spinner className="h-3 w-3 mr-1 animate-spin" />
                                    Processing
                                  </div>
                                )}
                                {item.isReady && (
                                  <div className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Ready
                                  </div>
                                )}
                                {!item.isPending && !item.isReady && (
                                  <div className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Failed
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          
                          {item.description && (
                            <p className="text-sm mt-2 line-clamp-2">{item.description}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
              
              {materials && materials.length > 0 && (
                <div className="text-center pt-2">
                  <Button variant="outline" onClick={() => router.push('/teacher/upload')}>
                    Upload More
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="popular" className="space-y-4 mt-0">
              {materialsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Icons.spinner className="h-6 w-6 animate-spin" />
                </div>
              ) : !materials || materials.length === 0 ? (
                <Card>
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                    <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No materials yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">Start by uploading your first teaching material</p>
                    <Button onClick={() => router.push('/teacher/upload')}>Upload Material</Button>
                  </CardContent>
                </Card>
              ) : (
                materials.map((item, i) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="hover-scale">
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{item.title}</h3>
                              <p className="text-sm text-muted-foreground">{item.dateDisplay}</p>
                            </div>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8" 
                              title="Download"
                              onClick={() => handleDownload(item.fileUrl, item.fileName)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                              {item.materialType}
                            </div>
                            <div className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                              {item.subject}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {(item.fileSize / (1024 * 1024)).toFixed(2)} MB
                            </div>
                            {item.fileUrl.toLowerCase().endsWith('.pdf') && (
                              <>
                                {item.isPending && (
                                  <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full flex items-center">
                                    <Icons.spinner className="h-3 w-3 mr-1 animate-spin" />
                                    Processing
                                  </div>
                                )}
                                {item.isReady && (
                                  <div className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Ready
                                  </div>
                                )}
                                {!item.isPending && !item.isReady && (
                                  <div className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Failed
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          
                          {item.description && (
                            <p className="text-sm mt-2 line-clamp-2">{item.description}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Right column with recent tests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Recent Tests</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            {testsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Icons.spinner className="h-6 w-6 animate-spin" />
              </div>
            ) : !tests || tests.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-4">
                <Clipboard className="h-8 w-8 text-muted-foreground mb-3" />
                <h3 className="text-base font-medium mb-2">No tests created yet</h3>
                <p className="text-sm text-muted-foreground mb-3">Start by creating your first test for students</p>
                <Button size="sm" onClick={() => router.push('/teacher/test-generator')}>Create New Test</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {tests.map((test, index) => (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="border rounded-md p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-base">{test.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3.5 w-3.5 mr-1" />
                            <span>{formatDate(test.createdAt)}</span>
                            {test.subject && (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-secondary">
                                {test.subject}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7" 
                            title="View Test"
                            onClick={() => router.push(`/teacher/tests/${test.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7" 
                            title="Edit Test"
                            onClick={() => router.push(`/teacher/tests/${test.id}/edit`)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2">
                        {/* Subject tag moved up to be with date */}
                      </div>
                    </div>
                  </motion.div>
                ))}
                <div className="pt-2 text-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => router.push('/teacher/tests')}
                  >
                    View All Tests
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Last updated line for mobile */}
      <div className="md:hidden text-sm text-muted-foreground flex items-center justify-center mt-8 mb-4">
        <Clock className="h-4 w-4 mr-1" />
        Last updated: Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </>
  );
}
