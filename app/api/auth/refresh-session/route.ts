import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

/**
 * API route to force a refresh of the session data
 * This is useful when session data may be stale or out of sync with the database
 */
export async function GET(request: Request) {
  try {
    // Get the current session
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    // Fetch the latest user data from the database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        roleConfirmed: true
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Return the fresh user data
    return NextResponse.json({
      success: true,
      user,
      session: {
        ...session,
        user: {
          ...session.user,
          role: user.role,
          roleConfirmed: user.roleConfirmed
        }
      }
    });
  } catch (error: any) {
    console.error("Error refreshing session:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 