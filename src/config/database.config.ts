import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

export interface DatabaseConfig {
  url: string;
  poolSize: number;
}

export const databaseConfig: DatabaseConfig = {
  url: process.env.DATABASE_URL || '',
  poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10)
};

// Singleton Prisma client instance
let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: databaseConfig.url
        }
      },
      log: process.env.LOG_LEVEL === 'DEBUG' ? ['query', 'error', 'warn'] : ['error']
    });
  }
  return prismaInstance;
}

export async function connectDatabase(): Promise<void> {
  const prisma = getPrismaClient();
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
    console.log('Database disconnected');
  }
}
