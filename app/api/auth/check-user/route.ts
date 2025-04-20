import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    
    console.log(`API Request to check user with email: ${email}`);
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true
      }
    });
    
    if (!user) {
      return NextResponse.json({ 
        exists: false,
        role: null
      });
    }
    
    // Return whether the user exists and their current role
    return NextResponse.json({ 
      exists: true,
      role: user.role,
      userId: user.id
    });
    
  } catch (error: any) {
    console.error("Error checking user:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 