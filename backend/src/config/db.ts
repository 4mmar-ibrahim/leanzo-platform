import prisma from './prisma.js';

export async function connectDB(): Promise<any> {
  try {
    await prisma.$connect();
    console.log('[Database] Connected successfully to PostgreSQL (cleanzo_db)');
    return prisma;
  } catch (err: any) {
    console.error('[Database] PostgreSQL connection failed:', err);
    throw err;
  }
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma };
export default prisma;

