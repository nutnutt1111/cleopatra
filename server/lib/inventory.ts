import type { Prisma } from '../../src/generated/prisma/client.js';
import { prisma } from './prisma.js';
import type { AuthUser } from './auth.js';
import { assertRole } from './auth.js';
import type { StockMoveReason } from '../../src/generated/prisma/client.js';
import { parseBahtToCents } from './ledger-utils.js';

type Tx = Prisma.TransactionClient;

export class InventoryError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'InventoryError';
    this.status = status;
  }
}

async function auditStock(
  tx: Tx,
  params: {
    storeId: string;
    userId: string;
    entityId?: string;
    payload?: Record<string, unknown>;
  },
) {
  await tx.auditLog.create({
    data: {
      storeId: params.storeId,
      userId: params.userId,
      action: 'STOCK_MOVE',
      entityType: 'StockMovement',
      entityId: params.entityId,
      payload: params.payload ? JSON.stringify(params.payload) : null,
    },
  });
}

export async function recordStockMove(
  tx: Tx,
  params: {
    storeId: string;
    userId: string;
    productId: string;
    serialItemId?: string | null;
    qtyDelta: number;
    reason: StockMoveReason;
    referenceType?: string;
    referenceId?: string;
    note?: string;
  },
) {
  const move = await tx.stockMovement.create({
    data: {
      storeId: params.storeId,
      productId: params.productId,
      serialItemId: params.serialItemId ?? null,
      qtyDelta: params.qtyDelta,
      reason: params.reason,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      note: params.note,
      createdById: params.userId,
    },
  });

  await auditStock(tx, {
    storeId: params.storeId,
    userId: params.userId,
    entityId: move.id,
    payload: { qtyDelta: params.qtyDelta, reason: params.reason, productId: params.productId },
  });

  return move;
}

/** Deduct stock for sale */
export async function deductStockForSale(
  tx: Tx,
  user: AuthUser,
  line: { productId: string; serialItemId?: string | null; qty: number },
  referenceId: string,
) {
  const product = await tx.product.findFirst({
    where: { id: line.productId, storeId: user.storeId, isActive: true },
  });
  if (!product) throw new InventoryError('ไม่พบสินค้า', 404);

  if (product.trackingType === 'SERIALIZED') {
    if (!line.serialItemId) throw new InventoryError(`สินค้า ${product.name} ต้องระบุ serial`);
    const serial = await tx.serialItem.findFirst({
      where: { id: line.serialItemId, storeId: user.storeId, productId: product.id },
    });
    if (!serial || serial.status !== 'AVAILABLE') {
      throw new InventoryError(`Serial ${serial?.serialNumber ?? '?'} ไม่พร้อมขาย`);
    }
    await tx.serialItem.update({
      where: { id: serial.id },
      data: { status: 'SOLD' },
    });
    await recordStockMove(tx, {
      storeId: user.storeId,
      userId: user.id,
      productId: product.id,
      serialItemId: serial.id,
      qtyDelta: -1,
      reason: 'SALE',
      referenceType: 'POS',
      referenceId,
    });
  } else {
    if (line.qty <= 0) throw new InventoryError('จำนวนต้องมากกว่า 0');
    if (product.qtyOnHand < line.qty) {
      throw new InventoryError(`สต็อก ${product.name} ไม่พอ (คงเหลือ ${product.qtyOnHand})`);
    }
    await tx.product.update({
      where: { id: product.id },
      data: { qtyOnHand: { decrement: line.qty } },
    });
    await recordStockMove(tx, {
      storeId: user.storeId,
      userId: user.id,
      productId: product.id,
      qtyDelta: -line.qty,
      reason: 'SALE',
      referenceType: 'POS',
      referenceId,
    });
  }
}

/** Restore stock on void */
export async function restoreStockOnVoid(
  tx: Tx,
  user: AuthUser,
  line: { productId: string; serialItemId?: string | null; qty: number },
  referenceId: string,
) {
  const product = await tx.product.findFirst({
    where: { id: line.productId, storeId: user.storeId },
  });
  if (!product) return;

  if (product.trackingType === 'SERIALIZED' && line.serialItemId) {
    await tx.serialItem.update({
      where: { id: line.serialItemId },
      data: { status: 'AVAILABLE' },
    });
    await recordStockMove(tx, {
      storeId: user.storeId,
      userId: user.id,
      productId: product.id,
      serialItemId: line.serialItemId,
      qtyDelta: 1,
      reason: 'VOID_RESTORE',
      referenceType: 'POS',
      referenceId,
    });
  } else if (product.trackingType === 'QUANTITY') {
    await tx.product.update({
      where: { id: product.id },
      data: { qtyOnHand: { increment: line.qty } },
    });
    await recordStockMove(tx, {
      storeId: user.storeId,
      userId: user.id,
      productId: product.id,
      qtyDelta: line.qty,
      reason: 'VOID_RESTORE',
      referenceType: 'POS',
      referenceId,
    });
  }
}

export function canViewCost(role: AuthUser['role']): boolean {
  return role === 'OWNER' || role === 'MANAGER';
}

export async function createProduct(
  user: AuthUser,
  input: {
    sku: string;
    name: string;
    trackingType: 'SERIALIZED' | 'QUANTITY';
    price: number;
    cost?: number;
    qtyOnHand?: number;
    serialNumbers?: string[];
  },
) {
  assertRole(user, 'OWNER', 'MANAGER');

  const sku = input.sku.trim();
  const name = input.name.trim();
  if (!sku || !name) throw new InventoryError('กรุณากรอก SKU และชื่อสินค้า');

  const priceCents = parseBahtToCents(input.price);
  const costCents = input.cost != null ? parseBahtToCents(input.cost) : 0;
  if (priceCents <= 0) throw new InventoryError('ราคาขายต้องมากกว่า 0');

  return prisma.$transaction(async (tx) => {
    const dup = await tx.product.findUnique({
      where: { storeId_sku: { storeId: user.storeId, sku } },
    });
    if (dup) throw new InventoryError('SKU นี้มีแล้ว', 409);

    const qty = input.trackingType === 'QUANTITY' ? Math.max(0, input.qtyOnHand ?? 0) : 0;

    const product = await tx.product.create({
      data: {
        storeId: user.storeId,
        sku,
        name,
        trackingType: input.trackingType,
        priceCents,
        costCents,
        qtyOnHand: qty,
      },
    });

    if (input.trackingType === 'SERIALIZED') {
      const serials = (input.serialNumbers ?? []).map((s) => s.trim()).filter(Boolean);
      if (!serials.length) throw new InventoryError('สินค้า Serial ต้องระบุหมายเลขอย่างน้อย 1 รายการ');
      for (const serialNumber of serials) {
        const serial = await tx.serialItem.create({
          data: {
            storeId: user.storeId,
            productId: product.id,
            serialNumber,
            status: 'AVAILABLE',
          },
        });
        await recordStockMove(tx, {
          storeId: user.storeId,
          userId: user.id,
          productId: product.id,
          serialItemId: serial.id,
          qtyDelta: 1,
          reason: 'RECEIVE',
          referenceType: 'INVENTORY',
          referenceId: product.id,
        });
      }
    } else if (qty > 0) {
      await recordStockMove(tx, {
        storeId: user.storeId,
        userId: user.id,
        productId: product.id,
        qtyDelta: qty,
        reason: 'RECEIVE',
        referenceType: 'INVENTORY',
        referenceId: product.id,
      });
    }

    return product;
  });
}
