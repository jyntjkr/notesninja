import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { NextAuthOptions } from "next-auth";

// Create a complete adapter with all required methods
const customAdapter = {
  createUser: async (userData: any) => {
    try {
      console.log("Creating user:", userData);
      // Make sure the schema can accept null values for role
      return prisma.user.create({
        data: {
          name: userData.name || "User",
          email: userData.email,
          image: userData.image || "",
          // Temporary role assignment to prevent schema issues
          // We'll let users choose later but need a valid value for now
          role: 'STUDENT',
          roleConfirmed: false // Mark as unconfirmed initially
        },
      });
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },
  getUser: async (id: string) => {
    try {
      console.log("Getting user by ID:", id);
      return prisma.user.findUnique({ where: { id } });
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
  },
  getUserByEmail: async (email: string) => {
    try {
      console.log("Getting user by email:", email);
      return prisma.user.findUnique({ where: { email } });
    } catch (error) {
      console.error("Error getting user by email:", error);
      throw error;
    }
  },
  getUserByAccount: async ({ provider, providerAccountId }: { provider: string; providerAccountId: string }) => {
    try {
      console.log("Getting user by account:", { provider, providerAccountId });
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId,
          },
        },
        include: { user: true },
      });
      return account?.user ?? null;
    } catch (error) {
      console.error("Error getting user by account:", error);
      throw error;
    }
  },
  updateUser: async (user: any) => {
    try {
      console.log("Updating user:", user);
      return prisma.user.update({
        where: { id: user.id },
        data: {
          name: user.name,
          email: user.email,
          image: user.image,
        },
      });
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },
  linkAccount: async (account: any) => {
    try {
      console.log("Linking account:", account);
      await prisma.account.create({
        data: {
          userId: account.userId,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state: account.session_state,
        },
      });
      return account;
    } catch (error) {
      console.error("Error linking account:", error);
      throw error;
    }
  },
  createSession: async (session: any) => {
    try {
      console.log("Creating session:", session);
      return prisma.session.create({
        data: {
          userId: session.userId,
          sessionToken: session.sessionToken,
          expires: session.expires,
        },
      });
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  },
  getSessionAndUser: async (sessionToken: string) => {
    try {
      console.log("Getting session and user for token:", sessionToken);
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });
      if (!session) return null;
      return {
        session: {
          userId: session.userId,
          sessionToken: session.sessionToken,
          expires: session.expires,
        },
        user: session.user,
      };
    } catch (error) {
      console.error("Error getting session and user:", error);
      throw error;
    }
  },
  updateSession: async (session: any) => {
    try {
      console.log("Updating session:", session);
      return prisma.session.update({
        where: { sessionToken: session.sessionToken },
        data: {
          expires: session.expires,
        },
      });
    } catch (error) {
      console.error("Error updating session:", error);
      throw error;
    }
  },
  deleteSession: async (sessionToken: string) => {
    try {
      console.log("Deleting session:", sessionToken);
      await prisma.session.delete({ where: { sessionToken } });
    } catch (error) {
      console.error("Error deleting session:", error);
      throw error;
    }
  },
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  adapter: customAdapter as any,
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      console.log('JWT callback:', { token, user, account, trigger, session });
      
      // Initial sign in
      if (account && user) {
        // Ensure we have the user ID
        token.id = user.id;
        token.sub = user.id; // Adding sub for compatibility
        
        // Set role & roleConfirmed status
        token.role = user.role || 'STUDENT';
        token.roleConfirmed = user.roleConfirmed || false;
        
        console.log('JWT after initial sign in:', token);
      }
      
      // Update token when session is updated
      if (trigger === 'update' && session) {
        // Update role if it's in the session update
        if (session.role) {
          token.role = session.role.toUpperCase() === 'TEACHER' ? 'TEACHER' : 'STUDENT';
        }
        
        // Update roleConfirmed status when explicitly set
        if (session.roleConfirmed !== undefined) {
          token.roleConfirmed = session.roleConfirmed;
        }
        
        console.log('JWT updated with session data:', token);
      }
      
      // Force role to be one of the valid types
      if (token.role && typeof token.role === 'string') {
        token.role = token.role.toUpperCase() === 'TEACHER' ? 'TEACHER' : 'STUDENT';
      } else {
        token.role = 'STUDENT';
      }
      
      return token;
    },
    async session({ session, token }) {
      console.log('Session callback:', { session, token });
      
      if (session.user) {
        // Ensure user ID is in the session
        session.user.id = token.id as string;
        session.user.sub = token.sub as string; // Add sub for compatibility
        
        // Add role to session
        session.user.role = token.role as string;
        
        // Add roleConfirmed status to session for redirection logic
        session.user.roleConfirmed = token.roleConfirmed as boolean;
      }
      
      console.log('Session after modification:', session);
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log("NextAuth redirect:", { url, baseUrl });
      
      // Make sure baseUrl is correct and doesn't have trailing slash
      const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      
      // Debug the actual URLs to diagnose issues
      console.log("Normalized base URL:", normalizedBaseUrl);
      console.log("Incoming URL for redirect:", url);
      
      // Handle absolute URL that might be to a different domain
      if (url.startsWith('http') && !url.startsWith(normalizedBaseUrl)) {
        console.log("External URL detected, allowing redirect to:", url);
        return url;
      }
      
      // First time user login without role confirmation, send to role selection
      if (url.startsWith(normalizedBaseUrl) && url.includes('/auth/signin-callback')) {
        // Check if user has confirmed role by querying the database
        // We'll use the URL structure to get email from the callbackUrl param if present
        try {
          const urlObj = new URL(url);
          const callbackUrl = urlObj.searchParams.get('callbackUrl');
          const emailParam = callbackUrl ? new URL(callbackUrl).searchParams.get('email') : null;
          
          if (emailParam) {
            const user = await prisma.user.findUnique({ 
              where: { email: emailParam },
              select: { roleConfirmed: true }
            });
            
            if (user && !user.roleConfirmed) {
              console.log("New user without confirmed role, redirecting to role selection");
              return `${normalizedBaseUrl}/auth/role-select`;
            }
          }
        } catch (error) {
          console.error("Error checking role confirmation:", error);
        }
      }
      
      // Handle uppercase paths - ensure we use lowercase for routes
      if (url.includes('/STUDENT/')) {
        const newUrl = url.replace('/STUDENT/', '/student/');
        console.log("Converting to lowercase:", newUrl);
        return newUrl;
      }
      if (url.includes('/TEACHER/')) {
        const newUrl = url.replace('/TEACHER/', '/teacher/');
        console.log("Converting to lowercase:", newUrl);
        return newUrl;
      }
      
      // For errors or base path, go to auth page
      if (url.includes('error=')) {
        console.log("Error in URL, redirecting to auth page");
        return `${normalizedBaseUrl}/auth`;
      }
      
      // If URL is exactly the base URL, redirect to auth
      if (url === normalizedBaseUrl || url === `${normalizedBaseUrl}/`) {
        console.log("Base URL detected, redirecting to auth page");
        return `${normalizedBaseUrl}/auth`;
      }
      
      // If URL contains role from session, ensure it's lowercase
      if (url.includes('/dashboard')) {
        // Make sure the URL uses lowercase for student/teacher
        url = url.toLowerCase();
      }
      
      // Final URL being returned
      console.log("Final redirect URL:", url);
      return url;
    },
  },
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // Only use secure cookies in production
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  debug: process.env.NODE_ENV === "development",
}; 