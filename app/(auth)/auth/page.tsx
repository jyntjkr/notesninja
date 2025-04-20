"use client";

import { useEffect, useState, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

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
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Welcome to NoteNinja</CardTitle>
          <CardDescription>
            Sign in with your Google account to continue
          </CardDescription>
        </CardHeader>
        
        <CardContent className="grid gap-4">
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
              {error === "AccessDenied" ? (
                "You do not have permission to access this application."
              ) : (
                "An error occurred during sign in. Please try again."
              )}
            </div>
          )}

          <Button
            variant="outline"
            type="button"
            disabled={isLoading}
            onClick={handleGoogleLogin}
            className="w-full"
          >
            {isLoading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.google className="mr-2 h-4 w-4" />
            )}
            Sign in with Google
          </Button>
        </CardContent>
        
        <CardFooter>
          <p className="px-8 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <a href="/terms" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </a>
            .
          </p>
        </CardFooter>
      </Card>
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