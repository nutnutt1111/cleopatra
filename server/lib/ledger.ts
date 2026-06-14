import type { AuditAction, Prisma } from '../../src/generated/prisma/client.js';
import { prisma } from './prisma.js';
import type { AuthUser } from './auth.js';
import { mergeAuditPayload } from './audit-context.js';
import { oppositeType, signedAmountCents, toDateOnly } from './ledger-utils.js';
import type { LedgerEntryType, PaymentChannel } from '../../src/generated/prisma/client.js';

export class LedgerError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'LedgerError';
    this.status = status;
  }
}

type Tx = Prisma.TransactionClient;

export async function assertDateNotLocked(storeId: string, entryDate: Date, tx: Tx = prisma) {
  const day = toDateOnly(entryDate);
  const close = await tx.dailyClose.findFirst({
    where: { storeId, closeDate: day, isLocked: true },
  });
  if (close) {
    throw new LedgerError(`วันที่ ${day.toISOString().slice(0, 10)} ปิดแล้ว — ไม่สามารถแก้ไขได้`, 423);
  }
}

async function writeAudit(
  tx: Tx,
  params: {
    storeId: string;
    userId: string;
    action: AuditAction;
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
      payload: JSON.stringify(mergeAuditPayload(params.payload) ?? {}),
    },
  });
}

export type PostLedgerInput = {
  storeId: string;
  userId: string;
  entryDate: string | Date;
  type: LedgerEntryType;
  channel?: PaymentChannel;
  amountCents: number;
  description: string;
  referenceType?: string;
  referenceId?: string;
};

export async function postLedgerEntry(input: PostLedgerInput, tx: Tx = prisma) {
  const entryDate = toDateOnly(input.entryDate);
  if (input.amountCents <= 0) {
    throw new LedgerError('จำนวนเงินต้องมากกว่า 0');
  }

  await assertDateNotLocked(input.storeId, entryDate, tx);

  const entry = await tx.ledgerEntry.create({
    data: {
      storeId: input.storeId,
      entryDate,
      type: input.type,
      channel: input.channel ?? 'CASH',
      amountCents: input.amountCents,
      description: input.description,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      createdById: input.userId,
    },
  });

  await writeAudit(tx, {
    storeId: input.storeId,
    userId: input.userId,
    action: 'LEDGER_POST',
    entityType: 'LedgerEntry',
    entityId: entry.id,
    payload: { type: input.type, amountCents: input.amountCents, entryDate: entryDate.toISOString() },
  });

  return entry;
}

export async function voidLedgerEntry(
  entryId: string,
  user: AuthUser,
  reason: string,
  tx?: Tx,
) {
  if (!reason.trim()) {
    throw new LedgerError('กรุณาระบุเหตุผลในการยกเลิก');
  }

  const runVoid = async (client: Tx) => {
    const original = await client.ledgerEntry.findFirst({
      where: { id: entryId, storeId: user.storeId },
    });

    if (!original) {
      throw new LedgerError('ไม่พบรายการ', 404);
    }
    if (original.isVoided) {
      throw new LedgerError('รายการนี้ถูกยกเลิกแล้ว');
    }
    if (original.reversalOfId) {
      throw new LedgerError('ไม่สามารถยกเลิกรายการกลับรายการได้');
    }

    await assertDateNotLocked(user.storeId, original.entryDate, client);

    const now = new Date();

    await client.ledgerEntry.update({
      where: { id: original.id },
      data: { isVoided: true, voidedAt: now, voidReason: reason },
    });

    const reversal = await client.ledgerEntry.create({
      data: {
        storeId: original.storeId,
        entryDate: original.entryDate,
        type: oppositeType(original.type),
        channel: original.channel,
        amountCents: original.amountCents,
        description: `ยกเลิก: ${original.description}`,
        referenceType: original.referenceType,
        referenceId: original.referenceId,
        reversalOfId: original.id,
        createdById: user.id,
      },
    });

    await writeAudit(client, {
      storeId: user.storeId,
      userId: user.id,
      action: 'LEDGER_VOID',
      entityType: 'LedgerEntry',
      entityId: original.id,
      payload: { reversalId: reversal.id, reason },
    });

    return { original, reversal };
  };

  if (tx) {
    return runVoid(tx);
  }
  return prisma.$transaction(runVoid);
}

export async function sumLedgerForDate(storeId: string, date: Date, tx: Tx = prisma) {
  const day = toDateOnly(date);
  const entries = await tx.ledgerEntry.findMany({
    where: {
      storeId,
      entryDate: day,
      isVoided: false,
      reversalOfId: null,
    },
  });

  let cashIncome = 0;
  let cashExpense = 0;
  let transferIncome = 0;
  let transferExpense = 0;

  for (const e of entries) {
    const signed = signedAmountCents(e.type, e.amountCents);
    if (e.channel === 'CASH' || e.channel === 'OTHER') {
      if (signed >= 0) cashIncome += signed;
      else cashExpense += Math.abs(signed);
    } else if (e.channel === 'TRANSFER') {
      if (signed >= 0) transferIncome += signed;
      else transferExpense += Math.abs(signed);
    }
  }

  return { cashIncome, cashExpense, transferIncome, transferExpense, net: cashIncome - cashExpense + transferIncome - transferExpense };
}

/** Void all active ledger entries for a reference (e.g. POS bill) */
export async function voidLedgerByReference(
  user: AuthUser,
  referenceType: string,
  referenceId: string,
  reason: string,
  tx?: Tx,
) {
  const client = tx ?? prisma;
  const entries = await client.ledgerEntry.findMany({
    where: {
      storeId: user.storeId,
      referenceType,
      referenceId,
      isVoided: false,
      reversalOfId: null,
    },
  });

  const results = [];
  for (const entry of entries) {
    const result = await voidLedgerEntry(entry.id, user, reason, tx);
    results.push(result);
  }
  return results;
}
