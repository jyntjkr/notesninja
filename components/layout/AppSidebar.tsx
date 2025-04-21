'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  BookOpenText,
  GraduationCap,
  Home,
  Menu,
  NotebookPen,
  Settings,
  Users,
  Calendar,
  Search,
  ClipboardList,
  FlaskConical,
  Library,
  X,
  LogOut
} from 'lucide-react';

interface AppSidebarProps {
  userRole?: 'student' | 'teacher';
}

/**
 * AppSidebar - Main sidebar component for the application
 * Shows different navigation links based on user role
 */
const AppSidebar = ({ userRole: propUserRole }: AppSidebarProps) => {
  const { state, toggleSidebar, isMobile, openMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed' && !isMobile;
  const pathname = usePathname();
  const router = useRouter();
  const { isStudent, isTeacher, logout } = useAuth();
  const initialMountRef = useRef(true);
  
  // Determine effective role (from props or from auth state)
  const effectiveRole = propUserRole || (isTeacher ? 'teacher' : 'student');
  
  // Debug current role - only on mount to prevent spam
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      console.log('AppSidebar - role info:', { propUserRole, isStudent, isTeacher, effectiveRole });
    }
  }, [propUserRole, isStudent, isTeacher, effectiveRole]);

  const studentLinks = [
    { name: 'Dashboard', icon: <Home className="h-5 w-5" />, path: '/student/dashboard' },
    { name: 'Upload Notes', icon: <NotebookPen className="h-5 w-5" />, path: '/student/upload' },
    { name: 'Flashcards & Quizzes', icon: <BookOpenText className="h-5 w-5" />, path: '/student/flashcards' },
    { name: 'Revision Tracker', icon: <Calendar className="h-5 w-5" />, path: '/student/revision' },
    { name: 'My Notes', icon: <Search className="h-5 w-5" />, path: '/student/notes' },
    { name: 'Settings', icon: <Settings className="h-5 w-5" />, path: '/student/settings' },
  ];

  const teacherLinks = [
    { name: 'Dashboard', icon: <Home className="h-5 w-5" />, path: '/teacher/dashboard' },
    { name: 'Upload Material', icon: <Library className="h-5 w-5" />, path: '/teacher/upload' },
    { name: 'Test Generator', icon: <FlaskConical className="h-5 w-5" />, path: '/teacher/test-generator' },
    { name: 'My Tests', icon: <ClipboardList className="h-5 w-5" />, path: '/teacher/tests' },
    { name: 'Settings', icon: <Settings className="h-5 w-5" />, path: '/teacher/settings' },
  ];

  const links = effectiveRole === 'student' ? studentLinks : teacherLinks;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // On mobile, always show the full sidebar content when opened
  const showFullContent = isMobile ? true : !isCollapsed;

  return (
    <div 
      className={cn(
        "h-full bg-card flex flex-col",
        "overflow-hidden"
      )}
    >
      {/* Header - shown differently on desktop vs mobile */}
      {!isMobile && (
        <div className={cn(
          "px-4 py-4 flex items-center",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              {effectiveRole === 'student' ? 
                <GraduationCap className="h-6 w-6 text-primary" /> : 
                <Users className="h-6 w-6 text-primary" />
              }
              <span className="font-bold text-lg">Note Companion</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="h-8 w-8"
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </Button>
        </div>
      )}
      
      {/* Mobile header - adds some padding at the top */}
      {isMobile && (
        <div className="h-14"></div>
      )}
      
      <Separator />
      
      {/* Navigation Links */}
      <ScrollArea className="flex-1 px-3">
        <div className="py-4">
          {showFullContent && (
            <div className="text-xs font-medium text-muted-foreground mb-4 px-1">
              {effectiveRole === 'student' ? 'STUDENT' : 'TEACHER'} MENU
            </div>
          )}
          
          <nav className="space-y-2">
            {links.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => isMobile && openMobile && setOpenMobile(false)}
                className={cn(
                  "flex items-center py-2.5 rounded-md text-sm font-medium transition-colors",
                  showFullContent ? "px-3" : "justify-center px-2",
                  pathname === link.path
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {link.icon}
                {showFullContent && <span className="ml-3">{link.name}</span>}
              </Link>
            ))}
          </nav>
        </div>
      </ScrollArea>
      
      <Separator className="mt-auto" />
      
      {/* User Profile */}
      <div className={cn(
        "p-4 flex items-center",
        isCollapsed ? "justify-center" : ""
      )}>
        {isCollapsed ? (
          <div className="flex flex-col gap-3 items-center">
            <Button variant="outline" size="icon" asChild className="rounded-full w-9 h-9 p-0">
              <Link href="/profile">
                <div className="rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold w-full h-full">
                  {effectiveRole === 'student' ? 'S' : 'T'}
                </div>
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-foreground w-8 h-8"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
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
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppSidebar;
