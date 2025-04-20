"use client";

import { useEffect, useState, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

function AuthContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");

  useEffect(() => {
    if (status === "authenticated") {
      // Check if user has confirmed role
      if (session?.user?.roleConfirmed) {
        // If role is confirmed, redirect to appropriate dashboard
        const redirectPath = session.user.role?.toLowerCase() === "teacher" 
          ? "/teacher/dashboard" 
          : "/student/dashboard";
        router.push(redirectPath);
      } else {
        // If role is not confirmed, redirect to role selection
        router.push("/auth/role-select");
      }
    }
  }, [session, status, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Set flag to indicate authentication flow has started
      // This helps track new sign ups vs returning users
      localStorage.setItem('auth_flow_started', 'true');
      
      await signIn("google", { callbackUrl });
    } catch (error) {
      console.error("Sign in error:", error);
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
            Sign in to access your notes, flashcards, and revision materials
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error && (
            <div className="bg-red-50 p-4 rounded-md mb-4 text-red-500 text-sm">
              {error === "OAuthAccountNotLinked"
                ? "Email already in use with a different provider."
                : "Authentication error. Please try again."}
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Icons.spinner className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.google className="h-4 w-4" />
            )}
            Sign in with Google
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-gray-500">
          By signing in, you agree to our terms and privacy policy.
        </CardFooter>
      </Card>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}