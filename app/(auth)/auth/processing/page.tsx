"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAuth } from "@/hooks/use-auth";
import { Icons } from "@/components/shared/icons";

function ProcessingContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role");
  const { data: session, status, update } = useSession();
  const { isAuthenticated, isStudent, isTeacher, roleConfirmed } = useAuth();
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState("Setting up your account...");

  useEffect(() => {
    // First, request a session update to ensure we have the latest data
    const refreshSession = async () => {
      setMessage(`Refreshing session data (attempt ${attempts + 1})...`);
      
      try {
        // Call our custom refresh endpoint
        const response = await fetch("/api/auth/refresh-session");
        if (response.ok) {
          // If we got fresh data, update the local session
          const data = await response.json();
          console.log("Refresh response:", data);
          
          // Force a session update with the latest user data
          await update(data.session);
        }
      } catch (error) {
        console.error("Error refreshing session:", error);
      }
      
      // Increment attempt counter regardless of success/failure
      setAttempts(prev => prev + 1);
    };

    // Only run this logic if the session is fully loaded
    if (status !== "loading") {
      console.log("Processing page - session status:", status);
      console.log("Processing role:", role);
      console.log("Session data:", session);
      console.log("Auth state:", { isAuthenticated, isStudent, isTeacher, roleConfirmed });
      
      if (roleConfirmed) {
        // Role is confirmed, proceed with redirect
        const dashboardPath = role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
        setMessage(`Role confirmed! Redirecting to your dashboard...`);
        console.log("Redirecting to dashboard:", dashboardPath);
        
        // Short delay for UX before redirect
        setTimeout(() => {
          window.location.href = dashboardPath;
        }, 500);
      } else if (attempts < 5) {
        // Try refreshing the session a few times
        console.log("Role not confirmed yet, refreshing session (attempt", attempts + 1, ")");
        const timer = setTimeout(refreshSession, 1000);
        return () => clearTimeout(timer);
      } else {
        // After 5 attempts, try forcing a path redirect anyway
        setMessage(`Session update complete. Redirecting to your dashboard...`);
        console.log("Max attempts reached, forcing redirect to dashboard");
        const dashboardPath = role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
        
        setTimeout(() => {
          window.location.href = dashboardPath;
        }, 1000);
      }
    }
  }, [status, session, role, isAuthenticated, isStudent, isTeacher, roleConfirmed, attempts, update]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Icons.spinner className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Setting up your account</h1>
        <p className="text-gray-600 mb-4">{message}</p>
        <p className="text-sm text-muted-foreground">
          Please wait while we prepare your {role === "teacher" ? "teacher" : "student"} dashboard...
        </p>
      </div>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Icons.spinner className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Loading...</h1>
        </div>
      </div>
    }>
      <ProcessingContent />
    </Suspense>
  );
} 