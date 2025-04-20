import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/**
 * Update a user's role in the database
 */
export async function updateUserRole(email: string, role: string) {
  if (!email) {
    throw new Error("Email is required to update user role");
  }

  // Normalize role to uppercase
  const normalizedRole = role.toUpperCase() === "TEACHER" ? "TEACHER" : "STUDENT";

  try {
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        role: normalizedRole,
        roleConfirmed: true
      },
    });

    console.log(`Updated user ${email} role to ${normalizedRole}`);
    return updatedUser;
  } catch (error) {
    console.error("Error updating user role:", error);
    throw new Error(`Failed to update user role: ${(error as Error).message}`);
  }
}

/**
 * Get the current authenticated user from the server session
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return null;
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    return user;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

/**
 * Check if a user has confirmed their role
 */
export async function hasConfirmedRole(email: string) {
  if (!email) return false;
  
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { roleConfirmed: true }
    });
    
    return !!user?.roleConfirmed;
  } catch (error) {
    console.error("Error checking role confirmation:", error);
    return false;
  }
} 