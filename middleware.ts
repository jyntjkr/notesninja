import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware for handling authentication and route protection
 * 
 * - Routes under /teacher/* require authentication and teacher role
 * - Routes under /student/* require authentication and student role
 * - Routes under /auth/* are public but redirect authenticated users with roles
 * - Other routes are public
 */
export async function middleware(request: NextRequest) {
  // The getToken function already uses the authOptions internally
  const token = await getToken({ req: request });
  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith('/auth');
  const isRoleSelectionRoute = path === '/role-selection' || path === '/auth/role-select';
  const isStudentRoute = path.startsWith('/student');
  const isTeacherRoute = path.startsWith('/teacher');
  const isPublicRoute = path === '/' || path === '/api' || path.startsWith('/api/');
  
  // If user is not logged in
  if (!token) {
    // Allow access to auth routes and public routes
    if (isAuthRoute || isPublicRoute) {
      return NextResponse.next();
    }
    
    // Redirect to login for protected routes
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  
  // User is logged in
  
  // Check if user has selected a role
  const userRole = token.role as string | undefined;
  const roleConfirmed = token.roleConfirmed as boolean | undefined;
  
  // If user hasn't selected a role yet, redirect to role selection
  // except if they're already on the role selection page
  if ((!userRole || !roleConfirmed) && !isRoleSelectionRoute && !isAuthRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/role-select', request.url));
  }
  
  // If user is already logged in and tries to access auth routes
  // except role-select when they need to select a role
  if (isAuthRoute && !(path === '/auth/role-select' && (!userRole || !roleConfirmed))) {
    // Redirect based on role if they try to access auth pages after auth
    if (userRole) {
      const dashboardPath = userRole.toLowerCase() === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // If user is already logged in and has selected a role,
  // redirect from role selection page to dashboard
  if (isRoleSelectionRoute && userRole && roleConfirmed) {
    const dashboardPath = userRole.toLowerCase() === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
    return NextResponse.redirect(new URL(dashboardPath, request.url));
  }
  
  // Role-based access control
  if (userRole === 'STUDENT' && isTeacherRoute) {
    return NextResponse.redirect(new URL('/student/dashboard', request.url));
  }
  
  if (userRole === 'TEACHER' && isStudentRoute) {
    return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
  }
  
  return NextResponse.next();
}

// Define which routes should be processed by this middleware
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api/auth/signin (NextAuth signin page)
     * 2. /api/auth/callback (NextAuth callback)
     * 3. /_next (Next.js internals)
     * 4. /_static (Static resources)
     * 5. /favicon.ico, /sitemap.xml (Static files)
     */
    '/((?!api/auth/signin|api/auth/callback|_next|_static|favicon.ico|sitemap.xml).*)',
  ],
}; 