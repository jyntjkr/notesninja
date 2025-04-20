import NextAuth, { DefaultSession } from "next-auth";
import { UserRole } from "@/hooks/use-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's unique identifier */
      id: string;
      /** The user's subject identifier - same as id but named differently */
      sub: string;
      /** The user's chosen role */
      role: string;
      /** Whether the user has confirmed their role */
      roleConfirmed: boolean;
    } & DefaultSession["user"];
  }

  /**
   * Interface for user object in database
   */
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
    roleConfirmed?: boolean;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback in `NextAuth`, when using JWT sessions */
  interface JWT {
    /** The user's unique identifier */
    id: string;
    /** The user's subject identifier - same as id but named differently */
    sub: string;
    /** The user's chosen role */
    role: string;
    /** Whether the user has confirmed their role */
    roleConfirmed: boolean;
  }
} 