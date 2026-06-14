import type { Prisma } from '../../src/generated/prisma/client.js';
import { prisma } from './prisma.js';

type Tx = Prisma.TransactionClient;

function isInteractiveTransaction(tx: Tx | typeof prisma): tx is Tx {
  return tx !== prisma;
}

/** Generate a daily-prefixed sequence number inside a transaction */
export async function nextDailySequence(
  tx: Tx,
  prefix: string,
  countWhere: (tx: Tx) => Promise<number>,
): Promise<string> {
  const count = await countWhere(tx);
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

/** Retry on Prisma unique constraint violation (P2002) */
export async function withUniqueRetry<T>(fn: () => Promise<T>, maxAttempts = 5): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === 'P2002' &&
        attempt < maxAttempts - 1
      ) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export { isInteractiveTransaction, prisma };
