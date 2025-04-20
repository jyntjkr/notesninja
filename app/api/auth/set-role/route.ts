import { NextResponse } from "next/server";
import { updateUserRole } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, role } = await request.json();
    
    if (!email || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    console.log(`API Request to set role for ${email} to ${role}`);
    
    // Force role to be uppercase for consistency with database
    const normalizedRole = role.toUpperCase() === 'TEACHER' ? 'TEACHER' : 'STUDENT';
    
    // Check if user already has a role that's different from the default
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, roleConfirmed: true }
    });
    
    // Skip role validation for new users or users who haven't confirmed their role yet
    if (existingUser && existingUser.role && existingUser.roleConfirmed === true) {
      // User has a confirmed role already - don't allow changes
      console.log(`User ${email} already has confirmed role ${existingUser.role}. Role changes are not allowed.`);
      return NextResponse.json(
        { 
          error: "Role changes are not allowed once confirmed", 
          currentRole: existingUser.role 
        },
        { status: 403 }
      );
    }
    
    console.log(`Setting role to ${normalizedRole} for ${email}`);
    
    // Use the direct function to update role
    const result = await updateUserRole(email, normalizedRole);
    
    // Get current session to verify the user
    const session = await getServerSession();
    if (!session?.user) {
      console.log('No session user found, but role update succeeded');
    } else if (session.user.email !== email) {
      console.log('Session email does not match updated email - session may need manual refresh');
    } else {
      console.log('Session email matches updated email - should see updated role after session refresh');
    }
    
    return NextResponse.json({ 
      success: true, 
      user: result,
      message: "Role set successfully. This role cannot be changed in the future."
    });
  } catch (error: any) {
    console.error("Error setting role:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 