"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

/**
 * RoleSelectPage - Allows user to select their role (student or teacher)
 * This is shown to new users who haven't confirmed their role yet
 */
export default function RoleSelectPage() {
  const router = useRouter();
  const { user, session, update, isStudent, isTeacher, roleConfirmed } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Redirect if user already has a confirmed role
  useEffect(() => {
    if (roleConfirmed) {
      const redirectPath = isTeacher ? "/teacher/dashboard" : "/student/dashboard";
      router.push(redirectPath);
    }
  }, [roleConfirmed, isTeacher, router]);

  // Handle role selection
  const handleSelectRole = async (role: string) => {
    setIsLoading(true);
    setSelectedRole(role);

    try {
      // Call the API to set the user role
      const response = await fetch("/api/auth/set-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user?.email,
          role: role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to set role");
      }

      // Update the session with the new role and wait for it to complete
      await update({ 
        role: role, 
        roleConfirmed: true
      });

      toast.success("Role set successfully!");

      // Redirect to a processing page that will handle the final redirect
      const redirectPath = role.toLowerCase() === "teacher" ? "teacher" : "student";
      window.location.href = `/auth/processing?role=${redirectPath}`;
    } catch (error: any) {
      console.error("Role selection error:", error);
      toast.error(error.message || "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Choose Your Role</CardTitle>
          <CardDescription>
            Select your role to personalize your experience. This cannot be changed later.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button
            variant={selectedRole === "STUDENT" ? "default" : "outline"}
            className={`w-full h-24 flex flex-col justify-center items-center gap-2 ${
              selectedRole === "STUDENT" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => handleSelectRole("STUDENT")}
            disabled={isLoading}
          >
            <Icons.student className="h-6 w-6" />
            <span>Student</span>
          </Button>

          <Button
            variant={selectedRole === "TEACHER" ? "default" : "outline"}
            className={`w-full h-24 flex flex-col justify-center items-center gap-2 ${
              selectedRole === "TEACHER" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => handleSelectRole("TEACHER")}
            disabled={isLoading}
          >
            <Icons.teacher className="h-6 w-6" />
            <span>Teacher</span>
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
          {isLoading && <Icons.spinner className="h-4 w-4 animate-spin" />}
        </CardFooter>
      </Card>
    </div>
  );
} 