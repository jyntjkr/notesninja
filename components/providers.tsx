'use client';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { SidebarProvider, SidebarInset, Sidebar } from "@/components/ui/sidebar";
import { SessionProvider } from "next-auth/react";
import AppSidebar from "@/components/layout/AppSidebar";
import MobileTopBar from "@/components/layout/MobileTopBar";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useRef, useState } from "react";

// Create a client
const queryClient = new QueryClient();

/**
 * Providers - Wraps the application with all necessary context providers
 * Sets up authentication, UI components, and global state management
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <AuthenticatedLayout>
              {children}
            </AuthenticatedLayout>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}

/**
 * AuthenticatedLayout - Conditionally renders the sidebar based on authentication status
 * Only shows the full application layout for authenticated users with confirmed roles
 */
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isStudent, isTeacher, roleConfirmed } = useAuth();
  const isMobile = useIsMobile();
  const initialMountRef = useRef(true);
  const [pathname, setPathname] = useState<string>('');
  
  // Update path on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPathname(window.location.pathname);
    }
  }, []);
  
  // Check if current path is an auth path
  const isAuthPath = pathname.startsWith('/auth');

  // Log auth status on first mount
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      console.log('AuthenticatedLayout -', { isAuthenticated, isAuthPath, pathname });
    }
  }, [isAuthenticated, pathname, isAuthPath]);

  // Determine user role from boolean flags
  const userRoleString = isTeacher ? 'teacher' : 'student';

  // Don't show sidebar on auth pages or when not authenticated
  if (isAuthPath || !isAuthenticated || !roleConfirmed) {
    return <>{children}</>;
  }

  // If authenticated and role confirmed, render the sidebar layout
  return (
    <SidebarProvider>
      {isMobile && <MobileTopBar userRole={userRoleString} />}
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <AppSidebar userRole={userRoleString} />
        </Sidebar>
        <SidebarInset className="bg-background">
          <div className="h-full max-w-7xl mx-auto">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
} 