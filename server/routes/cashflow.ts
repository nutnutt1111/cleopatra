import { Router } from 'express';
import type { AuthUser } from '../lib/auth.js';
import { assertAction, assertRole } from '../lib/auth.js';
import { closeDay, unlockDay } from '../lib/daily-close.js';
import { LedgerError, postLedgerEntry, voidLedgerEntry } from '../lib/ledger.js';
import { formatBaht, parseBahtToCents, toDateOnly, LedgerParseError } from '../lib/ledger-utils.js';
import { prisma } from '../lib/prisma.js';
import type { LedgerEntryType, PaymentChannel } from '../../src/generated/prisma/client.js';

type AuthedRequest = { user: AuthUser } & Parameters<Parameters<typeof Router>[0]>[0];

function serializeEntry(e: {
  id: string;
  entryDate: Date;
  type: LedgerEntryType;
  channel: PaymentChannel;
  amountCents: number;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  isVoided: boolean;
  voidReason: string | null;
  reversalOfId: string | null;
  createdAt: Date;
  createdBy: { name: string };
}) {
  return {
    id: e.id,
    entryDate: e.entryDate.toISOString().slice(0, 10),
    type: e.type,
    channel: e.channel,
    amountCents: e.amountCents,
    amountBaht: formatBaht(e.amountCents),
    description: e.description,
    referenceType: e.referenceType,
    referenceId: e.referenceId,
    isVoided: e.isVoided,
    voidReason: e.voidReason,
    isReversal: !!e.reversalOfId,
    createdAt: e.createdAt.toISOString(),
    createdByName: e.createdBy.name,
  };
}

export function createCashflowRouter(
  requireAuth: (req: AuthedRequest, res: unknown, next: () => void) => void,
  handleError: (err: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) => void,
) {
  const router = Router();

  router.get('/ledger', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const from = req.query.from ? toDateOnly(String(req.query.from)) : undefined;
      const to = req.query.to ? toDateOnly(String(req.query.to)) : undefined;

      const entries = await prisma.ledgerEntry.findMany({
        where: {
          storeId: user.storeId,
          ...(from || to
            ? {
                entryDate: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : {}),
        },
        include: { createdBy: { select: { name: true } } },
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        take: 200,
      });

      res.json({ entries: entries.map(serializeEntry) });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/ledger', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      assertRole(user, 'OWNER', 'MANAGER', 'STAFF');

      const body = req.body as {
        entryDate?: string;
        type?: LedgerEntryType;
        channel?: PaymentChannel;
        amount?: number;
        description?: string;
      };

      if (!body.entryDate || !body.type || !body.amount || !body.description?.trim()) {
        res.status(400).json({ error: 'กรุณากรอกวันที่ ประเภท จำนวนเงิน และรายละเอียด' });
        return;
      }

      const entry = await postLedgerEntry({
        storeId: user.storeId,
        userId: user.id,
        entryDate: body.entryDate,
        type: body.type,
        channel: body.channel ?? 'CASH',
        amountCents: parseBahtToCents(body.amount),
        description: body.description.trim(),
        referenceType: 'MANUAL',
      });

      const full = await prisma.ledgerEntry.findUniqueOrThrow({
        where: { id: entry.id },
        include: { createdBy: { select: { name: true } } },
      });

      res.status(201).json({ entry: serializeEntry(full) });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/ledger/:id/void', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      assertRole(user, 'OWNER', 'MANAGER');

      const reason = (req.body as { reason?: string })?.reason ?? '';
      const result = await voidLedgerEntry(req.params.id, user, reason);

      res.json({
        ok: true,
        originalId: result.original.id,
        reversalId: result.reversal.id,
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.get('/daily-close', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const closes = await prisma.dailyClose.findMany({
        where: { storeId: user.storeId },
        include: {
          closedBy: { select: { name: true } },
          unlockedBy: { select: { name: true } },
        },
        orderBy: { closeDate: 'desc' },
        take: 30,
      });

      res.json({
        closes: closes.map((c) => ({
          id: c.id,
          closeDate: c.closeDate.toISOString().slice(0, 10),
          isLocked: c.isLocked,
          cashIncomeBaht: formatBaht(c.cashIncomeCents),
          cashExpenseBaht: formatBaht(c.cashExpenseCents),
          transferIncomeBaht: formatBaht(c.transferIncomeCents),
          transferExpenseBaht: formatBaht(c.transferExpenseCents),
          note: c.note,
          closedByName: c.closedBy.name,
          unlockedByName: c.unlockedBy?.name ?? null,
          unlockedAt: c.unlockedAt?.toISOString() ?? null,
        })),
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/daily-close', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      assertRole(user, 'OWNER', 'MANAGER');

      const { closeDate, note } = req.body as { closeDate?: string; note?: string };
      if (!closeDate) {
        res.status(400).json({ error: 'กรุณาระบุวันที่ปิด' });
        return;
      }

      const result = await closeDay(user, closeDate, note);
      res.status(201).json({
        close: {
          id: result.close.id,
          closeDate: result.close.closeDate.toISOString().slice(0, 10),
          isLocked: result.close.isLocked,
        },
        totals: {
          netBaht: formatBaht(result.totals.net),
          cashIncomeBaht: formatBaht(result.totals.cashIncome),
          cashExpenseBaht: formatBaht(result.totals.cashExpense),
        },
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/daily-close/unlock', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const { closeDate } = req.body as { closeDate?: string };
      if (!closeDate) {
        res.status(400).json({ error: 'กรุณาระบุวันที่' });
        return;
      }

      const close = await unlockDay(user, closeDate);
      res.json({
        ok: true,
        closeDate: close.closeDate.toISOString().slice(0, 10),
        isLocked: close.isLocked,
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.get('/audit', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      assertRole(user, 'OWNER', 'MANAGER');

      const logs = await prisma.auditLog.findMany({
        where: { storeId: user.storeId },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      res.json({
        logs: logs.map((l) => ({
          id: l.id,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          userName: l.user.name,
          createdAt: l.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  return router;
}

export function handleLedgerError(err: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) {
  if (err instanceof LedgerError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  if (err && typeof err === 'object' && 'name' in err && err.name === 'LedgerParseError') {
    res.status(400).json({ error: (err as Error).message });
    return true;
  }
  return false;
}
