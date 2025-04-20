import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for handling authentication and route protection
 * 
 * - Routes under /teacher/* require authentication and teacher role
 * - Routes under /student/* require authentication and student role
 * - Routes under /auth/* are public but redirect authenticated users with roles
 * - Other routes are public
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get the token from the session
  const token = await getToken({ req: request });
  const isAuthenticated = !!token;

  const isTeacher = token?.role === 'TEACHER';
  const isStudent = token?.role === 'STUDENT';
  const roleConfirmed = token?.roleConfirmed === true;
  
  // Define areas that need protection
  const isTeacherArea = pathname.startsWith('/teacher/');
  const isStudentArea = pathname.startsWith('/student/');
  const isAuthArea = pathname.startsWith('/auth/');
  const isRoleSelect = pathname === '/auth/role-select';
  
  // Handle auth areas specially - redirect to dashboard if already authenticated with role
  if (isAuthArea && isAuthenticated && roleConfirmed && !isRoleSelect) {
    const redirectPath = isTeacher ? '/teacher/dashboard' : '/student/dashboard';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }
  
  // If on role select page and role is already confirmed, redirect to appropriate dashboard
  if (isRoleSelect && isAuthenticated && roleConfirmed) {
    const redirectPath = isTeacher ? '/teacher/dashboard' : '/student/dashboard';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }
  
  // If authenticated but role not confirmed, redirect to role selection
  if (isAuthenticated && !roleConfirmed && !isRoleSelect) {
    return NextResponse.redirect(new URL('/auth/role-select', request.url));
  }
  
  // Protect teacher areas
  if (isTeacherArea) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
    
    if (!isTeacher) {
      return NextResponse.redirect(new URL('/student/dashboard', request.url));
    }
  }
  
  // Protect student areas
  if (isStudentArea) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
    
    if (!isStudent) {
      return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
    }
  }
  
  return NextResponse.next();
}

// Define which routes should be processed by this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}; 