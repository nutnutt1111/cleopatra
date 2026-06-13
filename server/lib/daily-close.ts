import { prisma } from './prisma.js';
import type { AuthUser } from './auth.js';
import { assertAction } from './auth.js';
import { LedgerError, assertDateNotLocked, sumLedgerForDate } from './ledger.js';
import { toDateOnly } from './ledger-utils.js';
import type { Prisma } from '../../src/generated/prisma/client.js';

type Tx = Prisma.TransactionClient;

async function writeAudit(
  tx: Tx,
  params: {
    storeId: string;
    userId: string;
    action: 'DAILY_CLOSE' | 'DAILY_CLOSE_UNLOCK';
    entityType: string;
    entityId?: string;
    payload?: Record<string, unknown>;
  },
) {
  await tx.auditLog.create({
    data: {
      storeId: params.storeId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      payload: params.payload ? JSON.stringify(params.payload) : null,
    },
  });
}

export async function closeDay(user: AuthUser, closeDateInput: string | Date, note?: string) {
  const closeDate = toDateOnly(closeDateInput);

  const existing = await prisma.dailyClose.findUnique({
    where: { storeId_closeDate: { storeId: user.storeId, closeDate } },
  });

  if (existing?.isLocked) {
    throw new LedgerError('วันนี้ปิดแล้ว', 409);
  }

  const record = await prisma.$transaction(async (tx) => {
    const totals = await sumLedgerForDate(user.storeId, closeDate, tx);

    const close = await tx.dailyClose.upsert({
      where: { storeId_closeDate: { storeId: user.storeId, closeDate } },
      update: {
        isLocked: true,
        cashIncomeCents: totals.cashIncome,
        cashExpenseCents: totals.cashExpense,
        transferIncomeCents: totals.transferIncome,
        transferExpenseCents: totals.transferExpense,
        note: note ?? null,
        closedById: user.id,
        unlockedAt: null,
        unlockedById: null,
      },
      create: {
        storeId: user.storeId,
        closeDate,
        isLocked: true,
        cashIncomeCents: totals.cashIncome,
        cashExpenseCents: totals.cashExpense,
        transferIncomeCents: totals.transferIncome,
        transferExpenseCents: totals.transferExpense,
        note: note ?? null,
        closedById: user.id,
      },
    });

    await writeAudit(tx, {
      storeId: user.storeId,
      userId: user.id,
      action: 'DAILY_CLOSE',
      entityType: 'DailyClose',
      entityId: close.id,
      payload: { closeDate: closeDate.toISOString(), totals },
    });

    return close;
  });

  const totals = {
    cashIncome: record.cashIncomeCents,
    cashExpense: record.cashExpenseCents,
    transferIncome: record.transferIncomeCents,
    transferExpense: record.transferExpenseCents,
    net:
      record.cashIncomeCents -
      record.cashExpenseCents +
      record.transferIncomeCents -
      record.transferExpenseCents,
  };

  return { close: record, totals };
}

export async function unlockDay(user: AuthUser, closeDateInput: string | Date) {
  assertAction(user, 'daily-close:unlock');

  const closeDate = toDateOnly(closeDateInput);

  const existing = await prisma.dailyClose.findUnique({
    where: { storeId_closeDate: { storeId: user.storeId, closeDate } },
  });

  if (!existing) {
    throw new LedgerError('ไม่พบการปิดวันนี้', 404);
  }
  if (!existing.isLocked) {
    throw new LedgerError('วันนี้ไม่ได้ถูกล็อกอยู่');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const close = await tx.dailyClose.update({
      where: { id: existing.id },
      data: {
        isLocked: false,
        unlockedAt: new Date(),
        unlockedById: user.id,
      },
    });

    await writeAudit(tx, {
      storeId: user.storeId,
      userId: user.id,
      action: 'DAILY_CLOSE_UNLOCK',
      entityType: 'DailyClose',
      entityId: close.id,
      payload: { closeDate: closeDate.toISOString() },
    });

    return close;
  });

  return updated;
}

export async function isDateLocked(storeId: string, date: Date): Promise<boolean> {
  const day = toDateOnly(date);
  const close = await prisma.dailyClose.findFirst({
    where: { storeId, closeDate: day, isLocked: true },
  });
  return !!close;
}

export { assertDateNotLocked };
