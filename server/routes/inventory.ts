import { Router } from 'express';
import type { AuthUser } from '../lib/auth.js';
import { canViewCost, createProduct, InventoryError } from '../lib/inventory.js';
import { formatBaht } from '../lib/ledger-utils.js';
import { prisma } from '../lib/prisma.js';

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'พร้อมขาย',
  SOLD: 'ขายแล้ว',
  RESERVED: 'จอง',
};

type AuthedRequest = { user: AuthUser };

export function createInventoryRouter(
  requireAuth: (req: AuthedRequest, res: unknown, next: () => void) => void,
  handleError: (err: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) => void,
) {
  const router = Router();

  router.get('/products', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const showCost = canViewCost(user.role);

      const products = await prisma.product.findMany({
        where: { storeId: user.storeId, isActive: true },
        include: {
          serialItems: { where: { status: 'AVAILABLE' }, orderBy: { serialNumber: 'asc' } },
        },
        orderBy: { name: 'asc' },
      });

      res.json({
        products: products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          trackingType: p.trackingType,
          priceBaht: formatBaht(p.priceCents),
          priceCents: p.priceCents,
          costBaht: showCost ? formatBaht(p.costCents) : null,
          qtyOnHand: p.trackingType === 'QUANTITY' ? p.qtyOnHand : null,
          serials: p.serialItems.map((s) => ({
            id: s.id,
            serialNumber: s.serialNumber,
            status: s.status,
            statusLabel: STATUS_LABELS[s.status] ?? s.status,
          })),
        })),
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/products', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = req.body as {
        sku?: string;
        name?: string;
        trackingType?: 'SERIALIZED' | 'QUANTITY';
        price?: number;
        cost?: number;
        qtyOnHand?: number;
        serialNumbers?: string[];
      };
      const product = await createProduct(user, {
        sku: body.sku ?? '',
        name: body.name ?? '',
        trackingType: body.trackingType ?? 'QUANTITY',
        price: Number(body.price ?? 0),
        cost: body.cost != null ? Number(body.cost) : undefined,
        qtyOnHand: body.qtyOnHand != null ? Number(body.qtyOnHand) : undefined,
        serialNumbers: body.serialNumbers,
      });
      res.status(201).json({ ok: true, product: { id: product.id, sku: product.sku, name: product.name } });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.get('/serials', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const serials = await prisma.serialItem.findMany({
        where: { storeId: user.storeId },
        include: { product: { select: { name: true, sku: true } } },
        orderBy: { serialNumber: 'asc' },
        take: 100,
      });

      res.json({
        serials: serials.map((s) => ({
          id: s.id,
          serialNumber: s.serialNumber,
          productName: s.product.name,
          sku: s.product.sku,
          status: s.status,
          statusLabel: STATUS_LABELS[s.status] ?? s.status,
        })),
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.get('/movements', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      const moves = await prisma.stockMovement.findMany({
        where: { storeId: user.storeId },
        include: {
          product: { select: { name: true } },
          serialItem: { select: { serialNumber: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      res.json({
        movements: moves.map((m) => ({
          id: m.id,
          productName: m.product.name,
          serialNumber: m.serialItem?.serialNumber ?? null,
          qtyDelta: m.qtyDelta,
          reason: m.reason,
          referenceType: m.referenceType,
          createdByName: m.createdBy.name,
          createdAt: m.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  return router;
}

export function handleInventoryError(err: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) {
  if (err instanceof InventoryError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}
