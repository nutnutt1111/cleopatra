import { Router } from 'express';
import type { AuthUser } from '../lib/auth.js';
import { assertRole } from '../lib/auth.js';
import {
  createCreditSale,
  createCustomer,
  CustomerError,
  recordCustomerPayment,
} from '../lib/customers.js';
import { formatBaht } from '../lib/ledger-utils.js';
import { prisma } from '../lib/prisma.js';
import type { PaymentChannel } from '../../src/generated/prisma/client.js';

type AuthedRequest = { user: AuthUser };

export function createCustomersRouter(
  requireAuth: (req: AuthedRequest, res: unknown, next: () => void) => void,
  handleError: (err: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) => void,
) {
  const router = Router();

  router.get('/', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const customers = await prisma.customer.findMany({
        where: { storeId: user.storeId, isActive: true },
        include: {
          creditSales: {
            where: { status: 'OPEN' },
            include: { installment: true },
            orderBy: { createdAt: 'desc' },
          },
          payments: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        orderBy: { name: 'asc' },
      });

      res.json({
        customers: customers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          creditLimitBaht: formatBaht(c.creditLimitCents),
          balanceBaht: formatBaht(c.balanceCents),
          balanceCents: c.balanceCents,
          openSales: c.creditSales.map((s) => ({
            id: s.id,
            saleNumber: s.saleNumber,
            description: s.description,
            totalBaht: formatBaht(s.totalCents),
            paidBaht: formatBaht(s.paidCents),
            remainingBaht: formatBaht(s.totalCents - s.paidCents),
            installment: s.installment
              ? {
                  installmentCount: s.installment.installmentCount,
                  paidInstallments: s.installment.paidInstallments,
                  installmentAmountBaht: formatBaht(s.installment.installmentAmountCents),
                  nextDueDate: s.installment.nextDueDate.toISOString(),
                  status: s.installment.status,
                }
              : null,
          })),
          recentPayments: c.payments.map((p) => ({
            amountBaht: formatBaht(p.amountCents),
            channel: p.channel,
            createdAt: p.createdAt.toISOString(),
          })),
        })),
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      assertRole(user, 'OWNER', 'MANAGER', 'STAFF');

      const body = req.body as {
        name?: string;
        phone?: string;
        creditLimit?: number;
      };

      const customer = await createCustomer(user, {
        name: body.name ?? '',
        phone: body.phone,
        creditLimitCents: body.creditLimit ? Math.round(body.creditLimit * 100) : 0,
      });

      res.status(201).json({
        customer: {
          id: customer.id,
          name: customer.name,
          creditLimitBaht: formatBaht(customer.creditLimitCents),
        },
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/credit-sales', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = req.body as {
        customerId?: string;
        description?: string;
        total?: number;
        installmentCount?: number;
        installmentPeriodDays?: number;
      };

      const sale = await createCreditSale(user, {
        customerId: body.customerId ?? '',
        description: body.description ?? '',
        totalCents: Math.round((body.total ?? 0) * 100),
        installmentCount: body.installmentCount,
        installmentPeriodDays: body.installmentPeriodDays,
      });

      res.status(201).json({
        sale: {
          id: sale.id,
          saleNumber: sale.saleNumber,
          totalBaht: formatBaht(sale.totalCents),
        },
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/payments', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = req.body as {
        customerId?: string;
        amount?: number;
        channel?: PaymentChannel;
        transferDetail?: string;
        creditSaleId?: string;
        note?: string;
      };

      const payment = await recordCustomerPayment(user, {
        customerId: body.customerId ?? '',
        amountCents: Math.round((body.amount ?? 0) * 100),
        channel: body.channel,
        transferDetail: body.transferDetail,
        creditSaleId: body.creditSaleId,
        note: body.note,
      });

      res.status(201).json({
        payment: {
          id: payment.id,
          amountBaht: formatBaht(payment.amountCents),
        },
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  return router;
}

export function handleCustomerError(
  err: unknown,
  res: { status: (n: number) => { json: (b: unknown) => void } },
) {
  if (err instanceof CustomerError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}
