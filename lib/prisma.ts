import { PrismaClient } from '../lib/generated/prisma';

/**
 * PrismaClient is attached to the `global` object in development to prevent
 * exhausting your database connection limit.
 * 
 * Configure with specific connection settings to prevent prepared statement conflicts
 * when multiple deployments use the same database.
 */

// Generate a random identifier for this instance to avoid conflicts
const instanceId = Math.random().toString(36).substring(2, 10);

const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    
    // Apply connection pool settings to prevent conflicts
    datasourceUrl: process.env.DATABASE_URL ? 
      // Add connection parameters to prevent prepared statement conflicts
      `${process.env.DATABASE_URL}?pgbouncer=true&connection_limit=5&pool_timeout=10&statement_cache_size=0&application_name=noteninja_${instanceId}` : 
      undefined,
  });
};

// Reusable client with proper typing
type PrismaClientSingleton = ReturnType<typeof createPrismaClient>;

// Define properly on global scope
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// Only create a new client if one doesn't exist already
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Save the client instance to avoid multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Properly handle connection shutdown to avoid connection leaks
process.on('beforeExit', async () => {
  await prisma.$disconnect();
}); 