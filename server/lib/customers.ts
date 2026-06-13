import { prisma } from './prisma.js';
import type { AuthUser } from './auth.js';
import { assertAction, assertRole } from './auth.js';
import { assertDateNotLocked, postLedgerEntry } from './ledger.js';
import { toDateOnly } from './ledger-utils.js';
import type { PaymentChannel } from '../../src/generated/prisma/client.js';

export class CustomerError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'CustomerError';
    this.status = status;
  }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function nextSaleNumber(storeId: string): Promise<string> {
  const today = new Date();
  const prefix = `CR-${today.toISOString().slice(0, 10).replace(/-/g, '')}`;
  const count = await prisma.creditSale.count({
    where: { storeId, saleNumber: { startsWith: prefix } },
  });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

export async function createCustomer(
  user: AuthUser,
  input: {
    name: string;
    phone?: string;
    creditLimitCents?: number;
  },
) {
  assertRole(user, 'OWNER', 'MANAGER', 'STAFF');

  if (!input.name.trim()) throw new CustomerError('กรุณาระบุชื่อลูกค้า');
  const creditLimitCents = input.creditLimitCents ?? 0;
  if (creditLimitCents < 0) throw new CustomerError('วงเงินเครดิตต้องไม่ต่ำกว่า 0');

  return prisma.customer.create({
    data: {
      storeId: user.storeId,
      name: input.name.trim(),
      phone: input.phone?.trim() ?? null,
      creditLimitCents,
    },
  });
}

export async function createCreditSale(
  user: AuthUser,
  input: {
    customerId: string;
    description: string;
    totalCents: number;
    installmentCount?: number;
    installmentPeriodDays?: number;
  },
) {
  assertRole(user, 'OWNER', 'MANAGER', 'STAFF');

  if (!input.description.trim()) throw new CustomerError('กรุณาระบุรายละเอียด');
  if (input.totalCents <= 0) throw new CustomerError('ยอดขายต้องมากกว่า 0');

  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, storeId: user.storeId, isActive: true },
  });
  if (!customer) throw new CustomerError('ไม่พบลูกค้า', 404);

  const newBalance = customer.balanceCents + input.totalCents;
  if (customer.creditLimitCents > 0 && newBalance > customer.creditLimitCents) {
    if (user.role !== 'OWNER') {
      throw new CustomerError(
        `ยอดลูกหนี้เกินวงเงิน (${customer.creditLimitCents / 100} บาท) — ต้องเป็น Owner`,
        403,
      );
    }
    assertAction(user, 'customer:credit-override');
  }

  const entryDate = toDateOnly(new Date());
  await assertDateNotLocked(user.storeId, entryDate);

  const saleNumber = await nextSaleNumber(user.storeId);
  const installmentCount = input.installmentCount ?? 0;
  const installmentPeriodDays = input.installmentPeriodDays ?? 30;

  return prisma.$transaction(async (tx) => {
    const sale = await tx.creditSale.create({
      data: {
        storeId: user.storeId,
        customerId: customer.id,
        saleNumber,
        description: input.description.trim(),
        totalCents: input.totalCents,
        createdById: user.id,
      },
    });

    if (installmentCount >= 2) {
      const installmentAmountCents = Math.ceil(input.totalCents / installmentCount);
      await tx.installmentPlan.create({
        data: {
          creditSaleId: sale.id,
          installmentCount,
          installmentAmountCents,
          nextDueDate: addDays(entryDate, installmentPeriodDays),
        },
      });
    }

    await tx.customer.update({
      where: { id: customer.id },
      data: { balanceCents: newBalance },
    });

    await tx.auditLog.create({
      data: {
        storeId: user.storeId,
        userId: user.id,
        action: 'CREDIT_SALE',
        entityType: 'CreditSale',
        entityId: sale.id,
        payload: JSON.stringify({
          saleNumber,
          totalCents: input.totalCents,
          installmentCount,
        }),
      },
    });

    return sale;
  });
}

export async function recordCustomerPayment(
  user: AuthUser,
  input: {
    customerId: string;
    amountCents: number;
    channel?: PaymentChannel;
    transferDetail?: string;
    creditSaleId?: string;
    note?: string;
  },
) {
  assertRole(user, 'OWNER', 'MANAGER', 'STAFF');

  if (input.amountCents <= 0) throw new CustomerError('จำนวนเงินต้องมากกว่า 0');

  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, storeId: user.storeId, isActive: true },
  });
  if (!customer) throw new CustomerError('ไม่พบลูกค้า', 404);
  if (input.amountCents > customer.balanceCents) {
    throw new CustomerError('จำนวนเงินเกินยอดลูกหนี้คงค้าง');
  }

  let creditSale = null;
  if (input.creditSaleId) {
    creditSale = await prisma.creditSale.findFirst({
      where: { id: input.creditSaleId, customerId: customer.id, storeId: user.storeId },
      include: { installment: true },
    });
    if (!creditSale) throw new CustomerError('ไม่พบรายการขายเครดิต', 404);
    if (creditSale.status !== 'OPEN') throw new CustomerError('รายการขายนี้ปิดแล้ว');
    const remaining = creditSale.totalCents - creditSale.paidCents;
    if (input.amountCents > remaining) {
      throw new CustomerError('จำนวนเงินเกินยอดค้างของรายการนี้');
    }
  }

  const entryDate = toDateOnly(new Date());
  await assertDateNotLocked(user.storeId, entryDate);
  const channel = input.channel ?? 'CASH';

  return prisma.$transaction(async (tx) => {
    const payment = await tx.customerPayment.create({
      data: {
        customerId: customer.id,
        creditSaleId: input.creditSaleId ?? null,
        amountCents: input.amountCents,
        channel,
        transferDetail: input.transferDetail?.trim() ?? null,
        note: input.note?.trim() ?? null,
        createdById: user.id,
      },
    });

    await tx.customer.update({
      where: { id: customer.id },
      data: { balanceCents: customer.balanceCents - input.amountCents },
    });

    if (creditSale) {
      const newPaid = creditSale.paidCents + input.amountCents;
      const newStatus = newPaid >= creditSale.totalCents ? 'PAID' : 'OPEN';
      await tx.creditSale.update({
        where: { id: creditSale.id },
        data: { paidCents: newPaid, status: newStatus },
      });

      if (creditSale.installment) {
        const plan = creditSale.installment;
        const newPaidInstallments = plan.paidInstallments + 1;
        const completed = newPaidInstallments >= plan.installmentCount;
        await tx.installmentPlan.update({
          where: { id: plan.id },
          data: {
            paidInstallments: newPaidInstallments,
            nextDueDate: completed
              ? plan.nextDueDate
              : addDays(plan.nextDueDate, 30),
            status: completed ? 'COMPLETED' : 'ACTIVE',
          },
        });
      }
    }

    await postLedgerEntry(
      {
        storeId: user.storeId,
        userId: user.id,
        entryDate,
        type: 'INCOME',
        channel,
        amountCents: input.amountCents,
        description: `รับชำระลูกหนี้ ${customer.name}`,
        referenceType: 'CUSTOMER_PAYMENT',
        referenceId: payment.id,
      },
      tx,
    );

    await tx.auditLog.create({
      data: {
        storeId: user.storeId,
        userId: user.id,
        action: 'CUSTOMER_PAYMENT',
        entityType: 'CustomerPayment',
        entityId: payment.id,
        payload: JSON.stringify({
          customerId: customer.id,
          amountCents: input.amountCents,
          creditSaleId: input.creditSaleId,
        }),
      },
    });

    return payment;
  });
}
