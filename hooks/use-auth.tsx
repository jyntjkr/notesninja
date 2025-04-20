"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import type { Session, DefaultSession } from 'next-auth';

// Define the UserRole enum to match the Prisma schema
export type UserRole = 'STUDENT' | 'TEACHER' | null;

// Define the extended user type
export interface AuthUser {
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

// Define the auth context type with complete types
export interface AuthContextType {
  isAuthenticated: boolean;
  isStudent: boolean;
  isTeacher: boolean;
  roleConfirmed: boolean;
  status: "authenticated" | "loading" | "unauthenticated";
  login: (provider: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  user: AuthUser | null;
  session: Session | null;
  update: (data?: any) => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - Context provider that wraps the application to provide authentication state
 * and functionality to all child components.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const [isDebug, setIsDebug] = useState(false);
  const initialMountRef = useRef(true);
  
  // Derived authentication states
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const isStudent = session?.user?.role === 'STUDENT';
  const isTeacher = session?.user?.role === 'TEACHER';
  const roleConfirmed = !!session?.user?.roleConfirmed;
  
  // Debug log to see what role we have - but only log after mount to prevent spam
  useEffect(() => {
    // Enable debug mode if query param is present
    if (typeof window !== 'undefined') {
      setIsDebug(window.location.search.includes('debug=true'));
    }
    
    if (isDebug && isAuthenticated && session?.user && !initialMountRef.current) {
      console.log('Auth Debug - Session:', {
        role: session?.user?.role,
        roleConfirmed: session?.user?.roleConfirmed,
        fullSession: session
      });
    }
  }, [isAuthenticated, session, isDebug]);

  // Track initial mount
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
    }
  }, []);
  
  // Login function - returns a promise for better handling
  const login = async (provider: string) => {
    // Set a flag in localStorage to track new sign ups
    localStorage.setItem('auth_flow_started', 'true');
    
    // Sign in without a callback URL, middleware will handle redirects
    await signIn(provider);
  };

  // Logout function - returns a promise for better handling
  const logout = async () => {
    await signOut({ callbackUrl: '/auth' });
  };

  const contextValue: AuthContextType = {
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
    update
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth - Custom hook to access authentication context throughout the application
 * Provides user data, authentication status, and authentication methods.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 