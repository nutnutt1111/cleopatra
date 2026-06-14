import { prisma } from './prisma.js';
import type { AuthUser } from './auth.js';
import { assertRole } from './auth.js';
import {
  assertDateNotLocked,
  LedgerError,
  postLedgerEntry,
  voidLedgerByReference,
} from './ledger.js';
import { toDateOnly } from './ledger-utils.js';
import { todayDocPrefix } from './date-utils.js';
import { withUniqueRetry, nextDailySequence } from './sequence.js';
import type { PaymentChannel, Prisma } from '../../src/generated/prisma/client.js';

type Tx = Prisma.TransactionClient;

/** Reject overlapping interest payments on the same ticket (double-click / parallel tabs). */
const pawnInterestInFlight = new Set<string>();
const pawnInterestCooldownUntil = new Map<string, number>();
const PAWN_INTEREST_COOLDOWN_MS = 2_000;

export function overdueInterestPeriods(ticket: { nextInterestDueAt: Date; interestPeriodDays: number }, now: Date): number {
  if (now <= ticket.nextInterestDueAt) return 0;
  const msPerDay = 86_400_000;
  const daysLate = Math.max(0, Math.floor((now.getTime() - ticket.nextInterestDueAt.getTime()) / msPerDay));
  return Math.max(1, Math.ceil(daysLate / ticket.interestPeriodDays));
}

export class PawnError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PawnError';
    this.status = status;
  }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function interestPerPeriodCents(principalCents: number, interestRateBps: number): number {
  return Math.round((principalCents * interestRateBps) / 10000);
}

async function nextTicketNumber(tx: Tx, storeId: string): Promise<string> {
  const prefix = todayDocPrefix('PAWN');
  return nextDailySequence(tx, prefix, async (t) =>
    t.pawnTicket.count({ where: { storeId, ticketNumber: { startsWith: prefix } } }),
  );
}

export async function createPawnTicket(
  user: AuthUser,
  input: {
    customerName: string;
    customerPhone?: string;
    customerId?: string;
    itemDescription: string;
    principalCents: number;
    interestRateBps?: number;
    interestPeriodDays?: number;
    channel?: PaymentChannel;
    transferDetail?: string;
  },
) {
  assertRole(user, 'OWNER', 'MANAGER', 'STAFF');

  if (!input.customerName.trim()) throw new PawnError('กรุณาระบุชื่อลูกค้า');
  if (!input.itemDescription.trim()) throw new PawnError('กรุณาระบุรายละเอียดสิ่งของ');
  if (input.principalCents <= 0) throw new PawnError('เงินต้นต้องมากกว่า 0');

  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, storeId: user.storeId, isActive: true },
    });
    if (!customer) throw new PawnError('ไม่พบลูกค้า', 404);
  }

  const entryDate = toDateOnly(new Date());
  await assertDateNotLocked(user.storeId, entryDate);

  const interestRateBps = input.interestRateBps ?? 200;
  const interestPeriodDays = input.interestPeriodDays ?? 30;
  const channel = input.channel ?? 'CASH';
  const nextInterestDueAt = addDays(entryDate, interestPeriodDays);

  return withUniqueRetry(() =>
    prisma.$transaction(async (tx) => {
      const ticketNumber = await nextTicketNumber(tx, user.storeId);

      const ticket = await tx.pawnTicket.create({
      data: {
        storeId: user.storeId,
        ticketNumber,
        customerId: input.customerId ?? null,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone?.trim() ?? null,
        itemDescription: input.itemDescription.trim(),
        principalCents: input.principalCents,
        interestRateBps,
        interestPeriodDays,
        nextInterestDueAt,
        transferDetail: input.transferDetail?.trim() ?? null,
        createdById: user.id,
      },
    });

    await postLedgerEntry(
      {
        storeId: user.storeId,
        userId: user.id,
        entryDate,
        type: 'EXPENSE',
        channel,
        amountCents: input.principalCents,
        description: `จำนำ ${ticket.ticketNumber} — ${ticket.itemDescription}`,
        referenceType: 'PAWN',
        referenceId: ticket.id,
      },
      tx,
    );

    await tx.auditLog.create({
      data: {
        storeId: user.storeId,
        userId: user.id,
        action: 'PAWN_CREATE',
        entityType: 'PawnTicket',
        entityId: ticket.id,
        payload: JSON.stringify({
          ticketNumber,
          principalCents: input.principalCents,
          channel,
        }),
      },
    });

    return ticket;
    }),
  );
}

export async function payPawnInterest(
  user: AuthUser,
  ticketId: string,
  input: {
    channel?: PaymentChannel;
    transferDetail?: string;
  },
) {
  assertRole(user, 'OWNER', 'MANAGER', 'STAFF');

  if (pawnInterestInFlight.has(ticketId)) {
    throw new PawnError('รับดอกเบี้ยงวดนี้แล้วหรือกำลังประมวลผล', 409);
  }
  const cooldownUntil = pawnInterestCooldownUntil.get(ticketId);
  if (cooldownUntil !== undefined && Date.now() < cooldownUntil) {
    throw new PawnError('รับดอกเบี้ยงวดนี้แล้วหรือกำลังประมวลผล', 409);
  }
  pawnInterestInFlight.add(ticketId);

  const entryDate = toDateOnly(new Date());
  const channel = input.channel ?? 'CASH';

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.pawnTicket.findFirst({
        where: { id: ticketId, storeId: user.storeId, status: 'ACTIVE' },
      });
      if (!ticket) {
        throw new PawnError('ไม่พบตั๋วจำนำหรือไม่สามารถรับดอกเบี้ยได้', 404);
      }

      await assertDateNotLocked(user.storeId, entryDate, tx);

      const amountCents = interestPerPeriodCents(ticket.principalCents, ticket.interestRateBps);
      const dueSnapshot = ticket.nextInterestDueAt;
      const nextDue = addDays(dueSnapshot, ticket.interestPeriodDays);
      const periodKey = `interest:${ticket.id}:${dueSnapshot.getTime()}`;

      const claimed = await tx.pawnTicket.updateMany({
        where: {
          id: ticket.id,
          status: 'ACTIVE',
          nextInterestDueAt: dueSnapshot,
        },
        data: { nextInterestDueAt: nextDue },
      });
      if (claimed.count === 0) {
        throw new PawnError('รับดอกเบี้ยงวดนี้แล้วหรือกำลังประมวลผล', 409);
      }

      try {
        const payment = await tx.pawnPayment.create({
          data: {
            ticketId: ticket.id,
            type: 'INTEREST',
            amountCents,
            channel,
            transferDetail: input.transferDetail?.trim() ?? null,
            periodKey,
            createdById: user.id,
          },
        });

        await postLedgerEntry(
          {
            storeId: user.storeId,
            userId: user.id,
            entryDate,
            type: 'INCOME',
            channel,
            amountCents,
            description: `ดอกเบี้ยจำนำ ${ticket.ticketNumber}`,
            referenceType: 'PAWN_INTEREST',
            referenceId: payment.id,
          },
          tx,
        );

        await tx.auditLog.create({
          data: {
            storeId: user.storeId,
            userId: user.id,
            action: 'PAWN_INTEREST',
            entityType: 'PawnPayment',
            entityId: payment.id,
            payload: JSON.stringify({ ticketNumber: ticket.ticketNumber, amountCents }),
          },
        });

        return { ticket: { ...ticket, nextInterestDueAt: nextDue }, payment, amountCents };
      } catch (err) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
          throw new PawnError('รับดอกเบี้ยงวดนี้แล้ว', 409);
        }
        throw err;
      }
    });
    markPawnInterestCooldown(ticketId);
    return result;
  } finally {
    pawnInterestInFlight.delete(ticketId);
  }
}

function markPawnInterestCooldown(ticketId: string): void {
  pawnInterestCooldownUntil.set(ticketId, Date.now() + PAWN_INTEREST_COOLDOWN_MS);
}

export async function redeemPawnTicket(
  user: AuthUser,
  ticketId: string,
  input: {
    channel?: PaymentChannel;
    transferDetail?: string;
  },
) {
  assertRole(user, 'OWNER', 'MANAGER', 'STAFF');

  const entryDate = toDateOnly(new Date());
  const channel = input.channel ?? 'CASH';

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.pawnTicket.findFirst({
      where: { id: ticketId, storeId: user.storeId, status: 'ACTIVE' },
    });
    if (!ticket) {
      throw new PawnError('ไม่พบตั๋วจำนำหรือไถ่ถอนแล้ว', 404);
    }

    await assertDateNotLocked(user.storeId, entryDate, tx);

    const now = new Date();
    const overduePeriods = overdueInterestPeriods(ticket, now);
    const extraInterestCents =
      overduePeriods * interestPerPeriodCents(ticket.principalCents, ticket.interestRateBps);
    const amountCents = ticket.principalCents + extraInterestCents;

    const claimed = await tx.pawnTicket.updateMany({
      where: { id: ticket.id, status: 'ACTIVE', updatedAt: ticket.updatedAt },
      data: {
        status: 'REDEEMED',
        redeemedAt: now,
        redeemedById: user.id,
      },
    });
    if (claimed.count === 0) {
      throw new PawnError('ตั๋วนี้ไถ่ถอนแล้วหรือถูกยกเลิก', 409);
    }

    const payment = await tx.pawnPayment.create({
      data: {
        ticketId: ticket.id,
        type: 'REDEEM',
        amountCents,
        channel,
        transferDetail: input.transferDetail?.trim() ?? null,
        createdById: user.id,
      },
    });

    await postLedgerEntry(
      {
        storeId: user.storeId,
        userId: user.id,
        entryDate,
        type: 'INCOME',
        channel,
        amountCents,
        description: `ไถ่ถอนจำนำ ${ticket.ticketNumber}`,
        referenceType: 'PAWN_REDEEM',
        referenceId: payment.id,
      },
      tx,
    );

    await tx.auditLog.create({
      data: {
        storeId: user.storeId,
        userId: user.id,
        action: 'PAWN_REDEEM',
        entityType: 'PawnPayment',
        entityId: payment.id,
        payload: JSON.stringify({
          ticketNumber: ticket.ticketNumber,
          principalCents: ticket.principalCents,
          extraInterestCents,
          amountCents,
        }),
      },
    });

    return { ticket, payment, amountCents, extraInterestCents };
  });
}

export async function voidPawnTicket(user: AuthUser, ticketId: string, reason: string) {
  assertRole(user, 'OWNER', 'MANAGER');

  if (!reason.trim()) throw new PawnError('กรุณาระบุเหตุผลในการยกเลิกตั๋ว');

  const ticket = await prisma.pawnTicket.findFirst({
    where: { id: ticketId, storeId: user.storeId },
  });
  if (!ticket) throw new PawnError('ไม่พบตั๋วจำนำ', 404);
  if (ticket.status !== 'ACTIVE') throw new PawnError('ยกเลิกได้เฉพาะตั๋วที่ยังใช้งานอยู่');

  await assertDateNotLocked(user.storeId, ticket.createdAt);

  return prisma.$transaction(async (tx) => {
    await tx.pawnTicket.update({
      where: { id: ticket.id },
      data: {
        status: 'VOIDED',
        voidedAt: new Date(),
        voidReason: reason,
        voidedById: user.id,
      },
    });

    await voidLedgerByReference(user, 'PAWN', ticket.id, reason, tx);

    await tx.auditLog.create({
      data: {
        storeId: user.storeId,
        userId: user.id,
        action: 'PAWN_VOID',
        entityType: 'PawnTicket',
        entityId: ticket.id,
        payload: JSON.stringify({ ticketNumber: ticket.ticketNumber, reason }),
      },
    });

    return ticket;
  });
}
