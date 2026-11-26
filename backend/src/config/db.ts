import { ENV } from './env.js';
import prisma from './prisma.js';

export async function connectDB(): Promise<any> {
  if (!ENV.DATABASE_URL || !/^postgres(?:ql)?:\/\//i.test(ENV.DATABASE_URL)) {
    throw new Error('DATABASE_URL must point to the configured PostgreSQL database.');
  }
  try {
    await prisma.$connect();
    console.log('[Database] Connected successfully to PostgreSQL (cleanzo_db)');
    return prisma;
  } catch (err: any) {
    throw new Error('Could not connect to the configured PostgreSQL database.');
  }
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma };
export default prisma;

