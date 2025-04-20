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
import { FileText, Users, Clipboard, GraduationCap, Clock, Download } from 'lucide-react';
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
}

export default function TeacherDashboard() {
  // Authentication check
  const { isAuthenticated, isTeacher, status, roleConfirmed } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialCount, setMaterialCount] = useState(0);
  
  // Fetch materials
  const fetchMaterials = async () => {
    try {
      setMaterialsLoading(true);
      const response = await fetch('/api/materials/get-materials?limit=5&sort=latest');
      if (!response.ok) {
        throw new Error('Failed to fetch materials');
      }
      const data = await response.json();
      setMaterials(data.materials);
      setMaterialCount(data.materials.length);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to fetch your materials');
    } finally {
      setMaterialsLoading(false);
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
        // Fetch materials when authenticated
        fetchMaterials();
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
      <PageHeader 
        title="Teacher Dashboard" 
        description="Welcome back! Here's an overview of your materials and student engagement."
      />
      
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={item}>
          <MetricCard
            title="Total Materials"
            value={String(materialCount || 0)}
            icon={<FileText className="h-4 w-4" />}
            description={materialCount === 0 ? "Upload your first material" : ""}
          />
        </motion.div>
        
        <motion.div variants={item}>
          <MetricCard
            title="Tests Created"
            value="0"
            icon={<Clipboard className="h-4 w-4" />}
            description="Create your first test"
          />
        </motion.div>
        
        <motion.div variants={item}>
          <MetricCard
            title="Active Students"
            value="0"
            icon={<GraduationCap className="h-4 w-4" />}
            description="Invite students to join"
          />
        </motion.div>
        
        <motion.div variants={item}>
          <MetricCard
            title="Average Engagement"
            value="0%"
            icon={<Users className="h-4 w-4" />}
            description="Track student engagement"
          />
        </motion.div>
      </motion.div>
      
      <div className="mt-8 grid gap-6 md:grid-cols-2">
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
            ) : materials.length === 0 ? (
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
            
            {materials.length > 0 && (
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
            ) : materials.length === 0 ? (
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
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="flex flex-col items-center justify-center text-center p-8">
                <Clipboard className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No tests created yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Start by creating your first test for students</p>
                <Button>Create New Test</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-sm text-muted-foreground flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          Last updated: Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Import Materials</Button>
          <Button onClick={() => router.push('/teacher/upload')}>Upload Material</Button>
        </div>
      </div>
    </>
  );
}
