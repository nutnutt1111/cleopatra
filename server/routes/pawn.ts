import { Router } from 'express';
import type { AuthUser } from '../lib/auth.js';
import { assertRole } from '../lib/auth.js';
import {
  createPawnTicket,
  interestPerPeriodCents,
  payPawnInterest,
  PawnError,
  redeemPawnTicket,
  voidPawnTicket,
} from '../lib/pawn.js';
import { formatBaht } from '../lib/ledger-utils.js';
import { parsePagination } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';
import type { PaymentChannel } from '../../src/generated/prisma/client.js';

type AuthedRequest = { user: AuthUser };

export function createPawnRouter(
  requireAuth: (req: AuthedRequest, res: unknown, next: () => void) => void,
  handleError: (err: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) => void,
) {
  const router = Router();

  router.get('/tickets', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const { limit, offset } = parsePagination(req.query);
      const tickets = await prisma.pawnTicket.findMany({
        where: { storeId: user.storeId },
        include: {
          payments: { orderBy: { createdAt: 'desc' } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });

      res.json({
        tickets: tickets.map((t) => ({
          id: t.id,
          ticketNumber: t.ticketNumber,
          customerName: t.customerName,
          customerPhone: t.customerPhone,
          itemDescription: t.itemDescription,
          principalBaht: formatBaht(t.principalCents),
          principalCents: t.principalCents,
          interestRatePercent: (t.interestRateBps / 100).toFixed(2),
          interestPerPeriodBaht: formatBaht(
            interestPerPeriodCents(t.principalCents, t.interestRateBps),
          ),
          nextInterestDueAt: t.nextInterestDueAt.toISOString(),
          status: t.status,
          transferDetail: t.transferDetail,
          createdAt: t.createdAt.toISOString(),
          createdByName: t.createdBy.name,
          voidReason: t.voidReason,
          payments: t.payments.map((p) => ({
            id: p.id,
            type: p.type,
            amountBaht: formatBaht(p.amountCents),
            channel: p.channel,
            transferDetail: p.transferDetail,
            createdAt: p.createdAt.toISOString(),
          })),
        })),
        limit,
        offset,
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.get('/tickets/:id', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const ticket = await prisma.pawnTicket.findFirst({
        where: { id: req.params.id, storeId: user.storeId },
        include: {
          payments: { orderBy: { createdAt: 'desc' }, include: { createdBy: { select: { name: true } } } },
          createdBy: { select: { name: true } },
        },
      });
      if (!ticket) {
        res.status(404).json({ error: 'ไม่พบตั๋วจำนำ' });
        return;
      }

      res.json({
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          customerName: ticket.customerName,
          customerPhone: ticket.customerPhone,
          itemDescription: ticket.itemDescription,
          principalBaht: formatBaht(ticket.principalCents),
          interestPerPeriodBaht: formatBaht(
            interestPerPeriodCents(ticket.principalCents, ticket.interestRateBps),
          ),
          nextInterestDueAt: ticket.nextInterestDueAt.toISOString(),
          status: ticket.status,
          transferDetail: ticket.transferDetail,
          payments: ticket.payments.map((p) => ({
            type: p.type,
            amountBaht: formatBaht(p.amountCents),
            channel: p.channel,
            transferDetail: p.transferDetail,
            createdByName: p.createdBy.name,
            createdAt: p.createdAt.toISOString(),
          })),
        },
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/tickets', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      assertRole(user, 'OWNER', 'MANAGER', 'STAFF');

      const body = req.body as {
        customerName?: string;
        customerPhone?: string;
        customerId?: string;
        itemDescription?: string;
        principal?: number;
        interestRatePercent?: number;
        interestPeriodDays?: number;
        channel?: PaymentChannel;
        transferDetail?: string;
      };

      const ticket = await createPawnTicket(user, {
        customerName: body.customerName ?? '',
        customerPhone: body.customerPhone,
        customerId: body.customerId,
        itemDescription: body.itemDescription ?? '',
        principalCents: Math.round((body.principal ?? 0) * 100),
        interestRateBps: body.interestRatePercent
          ? Math.round(body.interestRatePercent * 100)
          : undefined,
        interestPeriodDays: body.interestPeriodDays,
        channel: body.channel,
        transferDetail: body.transferDetail,
      });

      res.status(201).json({
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          principalBaht: formatBaht(ticket.principalCents),
        },
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/tickets/:id/interest', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = req.body as { channel?: PaymentChannel; transferDetail?: string };
      const result = await payPawnInterest(user, req.params.id, body);
      res.json({
        ok: true,
        amountBaht: formatBaht(result.amountCents),
        nextInterestDueAt: result.ticket.nextInterestDueAt.toISOString(),
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/tickets/:id/redeem', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = req.body as { channel?: PaymentChannel; transferDetail?: string };
      const result = await redeemPawnTicket(user, req.params.id, body);
      res.json({
        ok: true,
        amountBaht: formatBaht(result.amountCents),
        extraInterestBaht: formatBaht(result.extraInterestCents),
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/tickets/:id/void', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const reason = (req.body as { reason?: string })?.reason ?? '';
      const ticket = await voidPawnTicket(user, req.params.id, reason);
      res.json({ ok: true, ticketNumber: ticket.ticketNumber });
    } catch (err) {
      handleError(err, res);
    }
  });

  return router;
}

export function handlePawnError(err: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) {
  if (err instanceof PawnError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}
