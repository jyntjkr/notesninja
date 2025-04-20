"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import type { Session, DefaultSession } from 'next-auth';

// Define the UserRole enum to match the Prisma schema
export type UserRole = 'STUDENT' | 'TEACHER' | null;

// Define the extended user type
interface AuthUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  roleConfirmed?: boolean;
}

// Extend the Session interface from next-auth
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      roleConfirmed?: boolean;
      sub?: string;
    } & DefaultSession["user"]
  }
}

interface AuthContextType {
  isAuthenticated: boolean;
  isStudent: boolean;
  isTeacher: boolean;
  roleConfirmed: boolean;
  status: "authenticated" | "loading" | "unauthenticated";
  login: (provider: string) => void;
  logout: () => void;
  isLoading: boolean;
  user: AuthUser | null;
  session: Session | null;
  update: any;
  forceRefresh: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status, update } = useSession();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const initialMountRef = useRef(true);
  
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const isStudent = session?.user?.role === 'STUDENT';
  const isTeacher = session?.user?.role === 'TEACHER';
  const roleConfirmed = !!session?.user?.roleConfirmed;
  
  // Debug log to see what role we have - but only log after mount to prevent spam
  useEffect(() => {
    if (isAuthenticated && session?.user && !initialMountRef.current) {
      console.log('Current session user role:', session?.user?.role);
      console.log('Full session data:', session);
    }
  }, [isAuthenticated, session]);

  // Track initial mount
  useEffect(() => {
    // Only run on mount
    if (initialMountRef.current) {
      initialMountRef.current = false;
    }
  }, []);
  
  // Force a context refresh
  const forceRefresh = () => {
    setRefreshCounter(prev => prev + 1);
  };
  
  // Check for auth flow state - this is the new auth flow where we authenticate first then set role if needed
  useEffect(() => {
    // Check if we're in the process of setting up a new account
    const authFlowStarted = localStorage.getItem('auth_flow_started');
    
    if (isAuthenticated && session?.user && session.user.email && authFlowStarted) {
      // Clear the auth flow flag
      localStorage.removeItem('auth_flow_started');
      
      // Check if user has a role
      if (!session?.user?.role) {
        console.log('User authenticated but no role assigned - redirecting to role selection');
        // Redirect to auth page so they can select a role
        router.push('/auth');
      }
    }
  }, [isAuthenticated, session, router]);
  
  // Helper function to convert role to URL-safe path
  const getRolePath = (role: string | undefined): string => {
    if (role === 'STUDENT') return 'student';
    if (role === 'TEACHER') return 'teacher';
    return '';
  };
  
  // Redirect logic - don't include refreshCounter in deps
  useEffect(() => {
    if (!isLoading) {
      // Fix URL if we detect uppercase in the pathname
      const currentPath = window.location.pathname;
      if (currentPath.includes('/STUDENT/')) {
        window.location.replace(currentPath.replace('/STUDENT/', '/student/'));
        return;
      }
      if (currentPath.includes('/TEACHER/')) {
        window.location.replace(currentPath.replace('/TEACHER/', '/teacher/'));
        return;
      }

      // Check if role is confirmed - redirect to role selection if not
      if (isAuthenticated && !roleConfirmed) {
        // Only allow role-select page when role is not confirmed
        if (pathname !== '/auth/role-select') {
          console.log('User authenticated but role not confirmed - redirecting to role selection');
          router.push('/auth/role-select');
          return;
        }
      }

      // Check if the user is on the wrong role path
      if (isAuthenticated && roleConfirmed && session?.user?.role) {
        const rolePath = getRolePath(session.user.role);
        const wrongRolePath = session.user.role === 'STUDENT' ? '/teacher/' : '/student/';
        
        if (pathname.includes(wrongRolePath)) {
          console.log('User on wrong role path, redirecting');
          const correctPath = pathname.replace(wrongRolePath, `/${rolePath}/`);
          window.location.replace(correctPath);
          return;
        }

        // Standard auth redirects
        if (pathname === '/auth') {
          if (rolePath) {
            // Force a hard navigation with lowercase path
            window.location.replace(`/${rolePath}/dashboard`);
          }
        }
      } else if (!isAuthenticated && 
                !pathname.startsWith('/auth') && 
                !pathname.includes('/_not-found') && 
                !pathname.includes('/debug-role')) {
        router.push('/auth');
      }
    }
  }, [isAuthenticated, isLoading, roleConfirmed, pathname, router, session]);

  const login = (provider: string) => {
    // Simply sign in without a callback URL, we'll handle redirects manually
    signIn(provider);
  };

  const logout = () => {
    signOut({ callbackUrl: '/auth' });
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isStudent,
      isTeacher,
      roleConfirmed,
      status,
      login, 
      logout, 
      isLoading,
      user: session?.user as AuthUser | null,
      session,
      update,
      forceRefresh
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 