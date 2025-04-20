"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isAuthenticated, user, isLoading, isStudent, isTeacher } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    // Only redirect if authentication check is complete
    if (!isLoading) {
      if (isAuthenticated && user?.role) {
        // Redirect to the appropriate dashboard based on user role
        console.log('Home: redirecting based on role:', user.role);
        if (isStudent) {
          router.push('/student/dashboard');
        } else if (isTeacher) {
          router.push('/teacher/dashboard');
        }
      } else {
        // Not authenticated, redirect to auth page
        router.push('/auth');
      }
    }
  }, [isAuthenticated, user, isLoading, router, isStudent, isTeacher]);

  // Show simple loading indicator while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-center">
        <h2 className="text-2xl font-semibold mb-2">Smart Note Companion</h2>
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>
  );
}