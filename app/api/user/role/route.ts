import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    console.log("Session in role update API:", JSON.stringify(session, null, 2));
    
    if (!session || !session.user) {
      console.error("Role update failed: No authenticated session");
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { role } = data;
    
    // Try to get user ID from various possible locations
    const userId = session.user.id || (session.user as any).sub;
    
    if (!userId) {
      console.error("Role update failed: No user ID found in session");
      console.log("Session user object:", session.user);
      return NextResponse.json(
        { error: "No user ID found in session" },
        { status: 400 }
      );
    }
    
    console.log(`Updating role for user ${userId} to ${role}`);
    
    // Check if role is valid
    if (role !== 'STUDENT' && role !== 'TEACHER') {
      console.error(`Role update failed: Invalid role ${role}`);
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // First check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!existingUser) {
      console.error(`User with ID ${userId} not found in database`);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update user role in the database
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role },
      });
      
      console.log("Role updated successfully:", updatedUser);
      return NextResponse.json({ success: true, user: updatedUser });
    } catch (dbError: any) {
      console.error("Database error during role update:", dbError);
      
      // Check for specific Prisma errors
      if (dbError.code) {
        console.error("Prisma error code:", dbError.code);
        console.error("Prisma error meta:", dbError.meta);
      }
      
      return NextResponse.json(
        { error: "Database error during role update", details: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Failed to update user role", details: error.message },
      { status: 500 }
    );
  }
} 