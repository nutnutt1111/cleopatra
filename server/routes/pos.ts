import { Router } from 'express';
import type { AuthUser } from '../lib/auth.js';
import { assertRole } from '../lib/auth.js';
import { canViewCost, InventoryError } from '../lib/inventory.js';
import { createPosBill, PosError, voidPosBill } from '../lib/pos.js';
import { formatBaht } from '../lib/ledger-utils.js';
import { parsePagination } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';
import type { PaymentChannel } from '../../src/generated/prisma/client.js';

type AuthedRequest = { user: AuthUser };

export function createPosRouter(
  requireAuth: (req: AuthedRequest, res: unknown, next: () => void) => void,
  handleError: (err: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) => void,
) {
  const router = Router();

  router.get('/bills', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const { limit, offset } = parsePagination(req.query);
      const bills = await prisma.posBill.findMany({
        where: { storeId: user.storeId },
        include: {
          lines: { include: { product: true, serialItem: true } },
          payments: true,
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });

      res.json({
        bills: bills.map((b) => ({
          id: b.id,
          billNumber: b.billNumber,
          status: b.status,
          subtotalBaht: formatBaht(b.subtotalCents),
          discountBaht: formatBaht(b.discountCents),
          totalBaht: formatBaht(b.totalCents),
          totalCents: b.totalCents,
          createdAt: b.createdAt.toISOString(),
          createdByName: b.createdBy.name,
          voidReason: b.voidReason,
          lines: b.lines.map((l) => ({
            productName: l.product.name,
            serialNumber: l.serialItem?.serialNumber ?? null,
            qty: l.qty,
            lineTotalBaht: formatBaht(l.lineTotalCents),
          })),
          payments: b.payments.map((p) => ({
            channel: p.channel,
            amountBaht: formatBaht(p.amountCents),
            transferDetail: p.transferDetail,
          })),
        })),
        limit,
        offset,
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/bills', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      assertRole(user, 'OWNER', 'MANAGER', 'STAFF');

      const body = req.body as {
        lines?: { productId: string; serialItemId?: string; qty?: number }[];
        payments?: { channel: PaymentChannel; amount: number; transferDetail?: string }[];
        discount?: number;
      };

      const bill = await createPosBill(user, {
        lines: body.lines ?? [],
        payments: (body.payments ?? []).map((p) => ({
          channel: p.channel,
          amountCents: Math.round(p.amount * 100),
          transferDetail: p.transferDetail,
        })),
        discountCents: body.discount ? Math.round(body.discount * 100) : 0,
      });

      res.status(201).json({
        bill: {
          id: bill.id,
          billNumber: bill.billNumber,
          totalBaht: formatBaht(bill.totalCents),
        },
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/bills/:id/void', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const reason = (req.body as { reason?: string })?.reason ?? '';
      const bill = await voidPosBill(user, req.params.id, reason);
      res.json({ ok: true, billNumber: bill.billNumber });
    } catch (err) {
      handleError(err, res);
    }
  });

  return router;
}

export function handlePosError(err: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) {
  if (err instanceof PosError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  if (err instanceof InventoryError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}
