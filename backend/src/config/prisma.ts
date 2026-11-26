import './env.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma, PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __cleanzo_prisma: PrismaClient | undefined;
}

const client =
  global.__cleanzo_prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__cleanzo_prisma = client;
}

const transactionContext = new AsyncLocalStorage<Prisma.TransactionClient>();

export const prisma = new Proxy(client, {
  get(target, property) {
    const active = transactionContext.getStore();
    const source = active && property in active ? active : target;
    const value = Reflect.get(source, property);
    return typeof value === 'function' ? value.bind(source) : value;
  },
});

export function inDatabaseTransaction<T>(task: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const active = transactionContext.getStore();
  if (active) return task(active);
  return client.$transaction(
    tx => transactionContext.run(tx, () => task(tx)),
    { maxWait: 10_000, timeout: 30_000 },
  );
}

export default prisma;
