import 'dotenv/config';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { resolve } from 'path';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function databaseUrl(): string {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  if (url.startsWith('file:./') && !url.includes('/prisma/')) {
    const filePath = url.replace('file:', '');
    return `file:${resolve(process.cwd(), filePath)}`;
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl() });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
