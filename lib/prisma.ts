import { PrismaClient } from '../lib/generated/prisma';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

// Create or reuse Prisma client instance
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Add error handling middleware if this is a new instance
if (!globalForPrisma.prisma) {
  // Add middleware for handling prepared statement errors
  prisma.$use(async (params, next) => {
    try {
      return await next(params);
    } catch (error: any) {
      // Check if it's a prepared statement error
      if (
        error.message?.includes('prepared statement') || 
        error.code === '42P05'
      ) {
        console.error('Prisma prepared statement error detected, attempting to recover');
        
        // Try to disconnect and let next request create a fresh connection
        try {
          await prisma.$disconnect();
        } catch (disconnectError) {
          console.error('Error disconnecting Prisma client:', disconnectError);
        }
      }
      throw error;
    }
  });
}

// Save client to global object in development to reuse connections
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma; 