"use client";

import { useEffect, useState, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";
import { motion } from "framer-motion";
import { NotebookPen, GitBranch, Sparkles } from "lucide-react";

function AuthContent() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");

  // Force session update on mount
  useEffect(() => {
    if (status === "loading") {
      update(); // Ensure session is up-to-date
    }
  }, [status, update]);

  useEffect(() => {
    console.log("Auth state:", { status, session, callbackUrl, error });
    
    if (status === "authenticated") {
      // Check if user has confirmed role
      if (session?.user?.roleConfirmed) {
        // If role is confirmed, redirect to appropriate dashboard
        const redirectPath = session.user.role?.toUpperCase() === "TEACHER" 
          ? "/teacher/dashboard" 
          : "/student/dashboard";
        console.log(`Redirecting to ${redirectPath}`);
        
        // Use router for SPA navigation
        router.push(redirectPath);
      } else {
        // If role is not confirmed, redirect to role selection
        console.log("Redirecting to role selection");
        router.push("/auth/role-select");
      }
    }
  }, [session, status, router]);

  // Handler for Google login
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await signIn("google", { callbackUrl });
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid place-items-center h-screen bg-blue-50 dark:bg-slate-900">
      <motion.div 
        className="gradient-border w-full max-w-md p-[1px] mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
      >
        <Card className="w-full border-none">
          <CardHeader className="space-y-1">
            <div className="flex justify-center">
              <motion.div 
                className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200"
                animate={{ rotate: [0, 10, 0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
              >
                <NotebookPen className="h-6 w-6" />
              </motion.div>
            </div>
            <CardTitle className="text-center text-2xl">Welcome to NotesNinja</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account to continue
            </CardDescription>
            {error && (
              <p className="text-center text-sm text-red-500">
                {error === "OAuthAccountNotLinked"
                  ? "Email already exists with different provider."
                  : "Something went wrong. Please try again."}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button 
                variant="outline" 
                type="button" 
                className="w-full justify-center gap-2 transition-all hover:scale-[1.02]"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                ) : (
                  <Icons.google className="h-5 w-5" />
                )}
                Sign in with Google
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-700"></span>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-slate-500 dark:bg-slate-800 dark:text-slate-400">Coming soon</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                type="button" 
                className="w-full justify-center gap-2 transition-all hover:scale-[1.02]"
                disabled={true}
              >
                <GitBranch className="h-5 w-5" />
                Sign in with GitHub
              </Button>
            </div>
            
            <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/30">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
                <Sparkles className="h-4 w-4" />
                Try our new features
              </h4>
              <p className="text-xs text-blue-600 dark:text-blue-200">Sign in today to access our new AI test generator and improved note organization tools.</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-2 px-8 text-center text-xs text-slate-500 dark:text-slate-400">
            <p>
              By signing in, you agree to our{" "}
              <a href="/terms" className="underline underline-offset-4 hover:text-primary">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
                Privacy Policy
              </a>.
            </p>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-green-600 dark:text-green-400">Trusted by teachers and students worldwide</span>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Icons.spinner className="h-10 w-10 animate-spin" /></div>}>
      <AuthContent />
    </Suspense>
  );
}