"use client";

import { useAuth } from "@/hooks/use-auth";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function DebugRolePage() {
  const { data: session, status, update } = useSession();
  const { user, isAuthenticated, isStudent, isTeacher, roleConfirmed } = useAuth();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'STUDENT' | 'TEACHER' | null>(null);
  const [sessionJson, setSessionJson] = useState<string>("");
  
  // Format JSON nicely
  useEffect(() => {
    if (session) {
      setSessionJson(JSON.stringify(session, null, 2));
    }
  }, [session]);
  
  const handleRoleUpdate = async () => {
    if (!selectedRole || !session?.user?.email) return;
    
    try {
      // Update role using API
      const response = await fetch('/api/auth/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: session.user.email, 
          role: selectedRole 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update session
        await update({ role: selectedRole });
        alert(`Role updated to ${selectedRole}. Redirecting to dashboard.`);
        
        // Force a hard reload to update all components
        window.location.href = `/${selectedRole.toLowerCase()}/dashboard`;
      } else {
        alert(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role. See console for details.");
    }
  };

  const handleReload = () => {
    // Force a full page reload to refresh the session
    window.location.reload();
  };
  
  const handleForceRedirect = () => {
    if (!user?.role) return;
    
    const rolePath = user.role === 'STUDENT' ? 'student' : 'teacher';
    window.location.href = `/${rolePath}/dashboard`;
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Role Debug Page</CardTitle>
          <CardDescription>
            Use this page to diagnose and fix role-related issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <h3 className="text-lg font-medium">Current Session</h3>
            <div className="bg-muted rounded-md p-4">
              <p><strong>Status:</strong> {status}</p>
              <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
              <p><strong>User Role:</strong> {user?.role || 'None'}</p>
              <p><strong>Role Confirmed:</strong> {roleConfirmed ? 'Yes' : 'No'}</p>
              <p><strong>Email:</strong> {session?.user?.email || 'Not logged in'}</p>
            </div>
          </div>
          
          <div className="grid gap-2">
            <h3 className="text-lg font-medium">Session Data</h3>
            <pre className="bg-muted overflow-auto rounded-md p-4 text-xs">
              {sessionJson || "No session data"}
            </pre>
          </div>
          
          <div className="grid gap-2">
            <h3 className="text-lg font-medium">Update Role</h3>
            <div className="flex gap-4">
              <Button 
                variant={selectedRole === 'STUDENT' ? 'default' : 'outline'}
                onClick={() => setSelectedRole('STUDENT')}
              >
                Student
              </Button>
              <Button 
                variant={selectedRole === 'TEACHER' ? 'default' : 'outline'}
                onClick={() => setSelectedRole('TEACHER')}
              >
                Teacher
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="gap-2 flex-wrap">
          <Button onClick={handleRoleUpdate} disabled={!selectedRole}>
            Update Role
          </Button>
          <Button variant="outline" onClick={handleReload}>
            Reload Page
          </Button>
          <Button variant="outline" onClick={handleForceRedirect}>
            Force Redirect to Dashboard
          </Button>
          <Button variant="outline" onClick={() => router.refresh()}>
            Refresh Page Router
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 