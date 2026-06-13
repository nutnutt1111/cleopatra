import { Router } from 'express';
import type { AuthUser } from '../lib/auth.js';
import { assertRole } from '../lib/auth.js';
import {
  cancelDeliveryJob,
  createDeliveryJob,
  markDeliveryDelivered,
  markDeliveryInTransit,
  MessengerError,
} from '../lib/messenger.js';
import { formatBaht } from '../lib/ledger-utils.js';
import { prisma } from '../lib/prisma.js';
import type { PaymentChannel } from '../../src/generated/prisma/client.js';

type AuthedRequest = { user: AuthUser };

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'รอส่ง',
  IN_TRANSIT: 'กำลังส่ง',
  DELIVERED: 'ส่งสำเร็จ',
  CANCELLED: 'ยกเลิก',
};

export function createMessengerRouter(
  requireAuth: (req: AuthedRequest, res: unknown, next: () => void) => void,
  handleError: (err: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) => void,
) {
  const router = Router();

  router.get('/jobs', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const jobs = await prisma.deliveryJob.findMany({
        where: { storeId: user.storeId },
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      res.json({
        jobs: jobs.map((j) => ({
          id: j.id,
          jobNumber: j.jobNumber,
          customerName: j.customerName,
          customerPhone: j.customerPhone,
          address: j.address,
          description: j.description,
          deliveryFeeBaht: formatBaht(j.deliveryFeeCents),
          deliveryFeeCents: j.deliveryFeeCents,
          feeChannel: j.feeChannel,
          status: j.status,
          statusLabel: STATUS_LABELS[j.status] ?? j.status,
          createdAt: j.createdAt.toISOString(),
          createdByName: j.createdBy.name,
          deliveredAt: j.deliveredAt?.toISOString() ?? null,
          cancelReason: j.cancelReason,
        })),
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/jobs', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      assertRole(user, 'OWNER', 'MANAGER', 'STAFF');

      const body = req.body as {
        customerName?: string;
        customerPhone?: string;
        address?: string;
        description?: string;
        deliveryFee?: number;
        feeChannel?: PaymentChannel;
      };

      const job = await createDeliveryJob(user, {
        customerName: body.customerName ?? '',
        customerPhone: body.customerPhone,
        address: body.address ?? '',
        description: body.description,
        deliveryFeeCents: body.deliveryFee ? Math.round(body.deliveryFee * 100) : 0,
        feeChannel: body.feeChannel,
      });

      res.status(201).json({
        job: {
          id: job.id,
          jobNumber: job.jobNumber,
          deliveryFeeBaht: formatBaht(job.deliveryFeeCents),
        },
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/jobs/:id/transit', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const job = await markDeliveryInTransit(user, req.params.id);
      res.json({ ok: true, status: job.status });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/jobs/:id/deliver', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const job = await markDeliveryDelivered(user, req.params.id);
      res.json({
        ok: true,
        jobNumber: job.jobNumber,
        deliveryFeeBaht: formatBaht(job.deliveryFeeCents),
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/jobs/:id/cancel', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const reason = (req.body as { reason?: string })?.reason ?? '';
      const job = await cancelDeliveryJob(user, req.params.id, reason);
      res.json({ ok: true, jobNumber: job.jobNumber });
    } catch (err) {
      handleError(err, res);
    }
  });

  return router;
}

export function handleMessengerError(
  err: unknown,
  res: { status: (n: number) => { json: (b: unknown) => void } },
) {
  if (err instanceof MessengerError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}
