import { prisma } from './prisma.js';
import type { AuthUser } from './auth.js';
import { assertRole } from './auth.js';
import { assertDateNotLocked, postLedgerEntry } from './ledger.js';
import { toDateOnly } from './ledger-utils.js';
import type { PaymentChannel } from '../../src/generated/prisma/client.js';

export class MessengerError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'MessengerError';
    this.status = status;
  }
}

async function nextJobNumber(storeId: string): Promise<string> {
  const today = new Date();
  const prefix = `DLV-${today.toISOString().slice(0, 10).replace(/-/g, '')}`;
  const count = await prisma.deliveryJob.count({
    where: { storeId, jobNumber: { startsWith: prefix } },
  });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

export async function createDeliveryJob(
  user: AuthUser,
  input: {
    customerName: string;
    customerPhone?: string;
    address: string;
    description?: string;
    deliveryFeeCents?: number;
    feeChannel?: PaymentChannel;
  },
) {
  assertRole(user, 'OWNER', 'MANAGER', 'STAFF');

  if (!input.customerName.trim()) throw new MessengerError('กรุณาระบุชื่อลูกค้า');
  if (!input.address.trim()) throw new MessengerError('กรุณาระบุที่อยู่จัดส่ง');

  const deliveryFeeCents = input.deliveryFeeCents ?? 0;
  if (deliveryFeeCents < 0) throw new MessengerError('ค่าจัดส่งต้องไม่ต่ำกว่า 0');

  const jobNumber = await nextJobNumber(user.storeId);

  const job = await prisma.deliveryJob.create({
    data: {
      storeId: user.storeId,
      jobNumber,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone?.trim() ?? null,
      address: input.address.trim(),
      description: input.description?.trim() ?? null,
      deliveryFeeCents,
      feeChannel: input.feeChannel ?? 'CASH',
      createdById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      storeId: user.storeId,
      userId: user.id,
      action: 'MESSENGER_CREATE',
      entityType: 'DeliveryJob',
      entityId: job.id,
      payload: JSON.stringify({ jobNumber, deliveryFeeCents }),
    },
  });

  return job;
}

export async function markDeliveryInTransit(user: AuthUser, jobId: string) {
  assertRole(user, 'OWNER', 'MANAGER', 'STAFF');

  const job = await prisma.deliveryJob.findFirst({
    where: { id: jobId, storeId: user.storeId },
  });
  if (!job) throw new MessengerError('ไม่พบงานส่ง', 404);
  if (job.status !== 'PENDING') throw new MessengerError('อัปเดตได้เฉพาะงานที่รอส่ง');

  return prisma.deliveryJob.update({
    where: { id: job.id },
    data: { status: 'IN_TRANSIT' },
  });
}

export async function markDeliveryDelivered(user: AuthUser, jobId: string) {
  assertRole(user, 'OWNER', 'MANAGER', 'STAFF');

  const job = await prisma.deliveryJob.findFirst({
    where: { id: jobId, storeId: user.storeId },
  });
  if (!job) throw new MessengerError('ไม่พบงานส่ง', 404);
  if (job.status === 'DELIVERED') throw new MessengerError('งานนี้ส่งสำเร็จแล้ว');
  if (job.status === 'CANCELLED') throw new MessengerError('งานนี้ถูกยกเลิกแล้ว');

  const entryDate = toDateOnly(new Date());
  await assertDateNotLocked(user.storeId, entryDate);

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.deliveryJob.update({
      where: { id: job.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: now,
        deliveredById: user.id,
      },
    });

    if (job.deliveryFeeCents > 0) {
      await postLedgerEntry(
        {
          storeId: user.storeId,
          userId: user.id,
          entryDate,
          type: 'EXPENSE',
          channel: job.feeChannel,
          amountCents: job.deliveryFeeCents,
          description: `ค่าจัดส่ง ${job.jobNumber} — ${job.customerName}`,
          referenceType: 'MESSENGER',
          referenceId: job.id,
        },
        tx,
      );
    }

    await tx.auditLog.create({
      data: {
        storeId: user.storeId,
        userId: user.id,
        action: 'MESSENGER_DELIVER',
        entityType: 'DeliveryJob',
        entityId: job.id,
        payload: JSON.stringify({
          jobNumber: job.jobNumber,
          deliveryFeeCents: job.deliveryFeeCents,
        }),
      },
    });

    return updated;
  });
}

export async function cancelDeliveryJob(user: AuthUser, jobId: string, reason: string) {
  assertRole(user, 'OWNER', 'MANAGER');

  if (!reason.trim()) throw new MessengerError('กรุณาระบุเหตุผลในการยกเลิก');

  const job = await prisma.deliveryJob.findFirst({
    where: { id: jobId, storeId: user.storeId },
  });
  if (!job) throw new MessengerError('ไม่พบงานส่ง', 404);
  if (job.status === 'DELIVERED') throw new MessengerError('ไม่สามารถยกเลิกงานที่ส่งสำเร็จแล้ว');
  if (job.status === 'CANCELLED') throw new MessengerError('งานนี้ถูกยกเลิกแล้ว');

  const updated = await prisma.deliveryJob.update({
    where: { id: job.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: reason,
    },
  });

  await prisma.auditLog.create({
    data: {
      storeId: user.storeId,
      userId: user.id,
      action: 'MESSENGER_CANCEL',
      entityType: 'DeliveryJob',
      entityId: job.id,
      payload: JSON.stringify({ jobNumber: job.jobNumber, reason }),
    },
  });

  return updated;
}
