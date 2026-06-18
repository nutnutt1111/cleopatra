import { prisma } from './prisma.js';
import type { AuthUser } from './auth.js';
import { assertRole } from './auth.js';
import { deductStockForSale, restoreStockOnVoid } from './inventory.js';
import { assertDateNotLocked, LedgerError, postLedgerEntry, voidLedgerByReference } from './ledger.js';
import { toDateOnly } from './ledger-utils.js';
import { todayDocPrefix } from './date-utils.js';
import { withUniqueRetry, nextDailySequence } from './sequence.js';
import type { PaymentChannel } from '../../src/generated/prisma/client.js';
import type { Prisma } from '../../src/generated/prisma/client.js';

type Tx = Prisma.TransactionClient;

export class PosError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PosError';
    this.status = status;
  }
}

export type BillLineInput = {
  productId: string;
  serialItemId?: string;
  qty?: number;
};

export type PaymentInput = {
  channel: PaymentChannel;
  amountCents: number;
  transferDetail?: string;
};

async function nextBillNumber(tx: Tx, storeId: string): Promise<string> {
  const prefix = todayDocPrefix('POS');
  return nextDailySequence(tx, prefix, async (t) =>
    t.posBill.count({ where: { storeId, billNumber: { startsWith: prefix } } }),
  );
}

export async function createPosBill(
  user: AuthUser,
  input: {
    lines: BillLineInput[];
    payments: PaymentInput[];
    discountCents?: number;
  },
) {
  if (!input.lines?.length) throw new PosError('ต้องมีรายการสินค้าอย่างน้อย 1 รายการ');
  if (!input.payments?.length) throw new PosError('ต้องมีการชำระเงินอย่างน้อย 1 รายการ');

  const discountCents = input.discountCents ?? 0;
  if (discountCents < 0) throw new PosError('ส่วนลดต้องไม่ต่ำกว่า 0');
  if (discountCents > 0 && user.role === 'STAFF') {
    throw new PosError('พนักงานไม่มีสิทธิ์ให้ส่วนลด — ต้องเป็น Manager/Owner', 403);
  }

  const lineRows: { productId: string; serialItemId?: string; qty: number; unitPriceCents: number; lineTotalCents: number }[] = [];

  for (const line of input.lines) {
    const product = await prisma.product.findFirst({
      where: { id: line.productId, storeId: user.storeId, isActive: true },
    });
    if (!product) throw new PosError(`ไม่พบสินค้า ${line.productId}`, 404);

    const qty = line.qty ?? 1;
    lineRows.push({
      productId: product.id,
      serialItemId: line.serialItemId,
      qty,
      unitPriceCents: product.priceCents,
      lineTotalCents: product.priceCents * qty,
    });
  }

  const subtotalCents = lineRows.reduce((s, l) => s + l.lineTotalCents, 0);
  const totalCents = subtotalCents - discountCents;
  if (totalCents <= 0) throw new PosError('ยอดรวมต้องมากกว่า 0');

  const paymentSum = input.payments.reduce((s, p) => s + p.amountCents, 0);
  if (paymentSum !== totalCents) {
    throw new PosError(`ยอดชำระ (${paymentSum / 100} บาท) ไม่ตรงยอดบิล (${totalCents / 100} บาท)`);
  }

  const entryDate = toDateOnly(new Date());
  await assertDateNotLocked(user.storeId, entryDate);

  return withUniqueRetry(() =>
    prisma.$transaction(async (tx) => {
      const billNumber = await nextBillNumber(tx, user.storeId);

      const bill = await tx.posBill.create({
      data: {
        storeId: user.storeId,
        billNumber,
        subtotalCents,
        discountCents,
        totalCents,
        createdById: user.id,
        lines: {
          create: lineRows.map((l) => ({
            productId: l.productId,
            serialItemId: l.serialItemId ?? null,
            qty: l.qty,
            unitPriceCents: l.unitPriceCents,
            lineTotalCents: l.lineTotalCents,
          })),
        },
        payments: {
          create: input.payments.map((p) => ({
            channel: p.channel,
            amountCents: p.amountCents,
            transferDetail: p.transferDetail ?? null,
          })),
        },
      },
      include: { lines: true, payments: true },
    });

    for (const line of bill.lines) {
      await deductStockForSale(
        tx,
        user,
        { productId: line.productId, serialItemId: line.serialItemId, qty: line.qty },
        bill.id,
      );
    }

    for (const payment of bill.payments) {
      await postLedgerEntry(
        {
          storeId: user.storeId,
          userId: user.id,
          entryDate,
          type: 'INCOME',
          channel: payment.channel,
          amountCents: payment.amountCents,
          description: `ขาย POS ${bill.billNumber}`,
          referenceType: 'POS',
          referenceId: bill.id,
        },
        tx,
      );
    }

    await tx.auditLog.create({
      data: {
        storeId: user.storeId,
        userId: user.id,
        action: 'POS_SALE',
        entityType: 'PosBill',
        entityId: bill.id,
        payload: JSON.stringify({ billNumber, totalCents, payments: input.payments.length }),
      },
    });

    return bill;
    }),
  );
}

export async function voidPosBill(user: AuthUser, billId: string, reason: string) {
  assertRole(user, 'OWNER', 'MANAGER');

  if (!reason.trim()) throw new PosError('กรุณาระบุเหตุผลในการยกเลิกบิล');

  const bill = await prisma.posBill.findFirst({
    where: { id: billId, storeId: user.storeId },
    include: { lines: true },
  });

  if (!bill) throw new PosError('ไม่พบบิล', 404);
  if (bill.status === 'VOIDED') throw new PosError('บิลนี้ถูกยกเลิกแล้ว', 409);

  await assertDateNotLocked(user.storeId, bill.createdAt);

  return prisma.$transaction(async (tx) => {
    await tx.posBill.update({
      where: { id: bill.id },
      data: {
        status: 'VOIDED',
        voidedAt: new Date(),
        voidReason: reason,
        voidedById: user.id,
      },
    });

    for (const line of bill.lines) {
      await restoreStockOnVoid(
        tx,
        user,
        { productId: line.productId, serialItemId: line.serialItemId, qty: line.qty },
        bill.id,
      );
    }

    await voidLedgerByReference(user, 'POS', bill.id, reason, tx);

    await tx.auditLog.create({
      data: {
        storeId: user.storeId,
        userId: user.id,
        action: 'POS_VOID',
        entityType: 'PosBill',
        entityId: bill.id,
        payload: JSON.stringify({ billNumber: bill.billNumber, reason }),
      },
    });

    return bill;
  });
}
