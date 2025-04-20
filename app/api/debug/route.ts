import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    
    // Get database info
    const userCount = await prisma.user.count();
    const users = await prisma.user.findMany({
      include: {
        accounts: true
      }
    });
    
    // Sanitize sensitive data
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      hasAccounts: user.accounts.length > 0
    }));
    
    return NextResponse.json({
      session,
      dbConnected: true,
      userCount,
      users: sanitizedUsers
    });
  } catch (error: any) {
    console.error("Debug route error:", error);
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      dbConnected: false
    }, { status: 500 });
  }
} 