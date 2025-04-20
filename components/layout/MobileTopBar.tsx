'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Menu, GraduationCap, Users, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MobileTopBarProps {
  userRole?: 'student' | 'teacher';
}

/**
 * MobileTopBar - Top navigation bar for mobile devices
 * Shows the current user role and provides access to user menu
 */
const MobileTopBar = ({ userRole: propUserRole }: MobileTopBarProps) => {
  const { toggleSidebar, openMobile } = useSidebar();
  const { isStudent, isTeacher, logout } = useAuth();
  const initialMountRef = useRef(true);
  
  // Determine effective role (from props or from auth state)
  const effectiveRole = propUserRole || (isTeacher ? 'teacher' : 'student');
  
  // Debug current role - only on mount to avoid spam
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      console.log('MobileTopBar - role info:', { propUserRole, isStudent, isTeacher, effectiveRole });
    }
  }, [propUserRole, isStudent, isTeacher, effectiveRole]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-14 bg-background border-b border-border shadow-sm flex items-center justify-between px-4">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={toggleSidebar}
        aria-label="Toggle Menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      
      <div className="flex-1 text-center">
        <div className="text-sm font-semibold">
          Note Companion
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <div className="rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold w-full h-full">
              {effectiveRole === 'student' ? 'S' : 'T'}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="flex items-center gap-2 p-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              {effectiveRole === 'student' ? 'S' : 'T'}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {effectiveRole === 'student' ? 'Student User' : 'Teacher User'}
              </span>
              <span className="text-xs text-muted-foreground">
                {effectiveRole === 'student' ? 'Student Account' : 'Teacher Account'}
              </span>
            </div>
          </div>
          <DropdownMenuItem asChild>
            <Link href="/profile">View Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/${effectiveRole}/settings`}>Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="text-red-500 focus:text-red-500" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default MobileTopBar; 