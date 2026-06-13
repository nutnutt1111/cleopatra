import type { AuditAction, LedgerEntryType, PaymentChannel } from '../../src/generated/prisma/client.js';

/** Normalize to UTC midnight for date-only comparisons */
export function toDateOnly(input: string | Date): Date {
  const d = typeof input === 'string' ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function formatBaht(cents: number): string {
  return (cents / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseBahtToCents(value: number | string): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(num) || num <= 0) {
    throw new LedgerParseError('จำนวนเงินต้องมากกว่า 0');
  }
  return Math.round(num * 100);
}

export class LedgerParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerParseError';
  }
}

export const LEDGER_TYPE_LABELS: Record<LedgerEntryType, string> = {
  INCOME: 'รายรับ',
  EXPENSE: 'รายจ่าย',
  TRANSFER_IN: 'โอนเข้า',
  TRANSFER_OUT: 'โอนออก',
};

export const CHANNEL_LABELS: Record<PaymentChannel, string> = {
  CASH: 'เงินสด',
  TRANSFER: 'โอน',
  CREDIT: 'เครดิต',
  OTHER: 'อื่นๆ',
};

export const AUDIT_LABELS: Record<AuditAction, string> = {
  LEDGER_POST: 'บันทึกรายการ',
  LEDGER_VOID: 'ยกเลิกรายการ',
  DAILY_CLOSE: 'ปิดวัน',
  DAILY_CLOSE_UNLOCK: 'ปลดล็อกปิดวัน',
  POS_SALE: 'ขาย POS',
  POS_VOID: 'ยกเลิก POS',
  STOCK_MOVE: 'เคลื่อนไหวสต็อก',
  PAWN_CREATE: 'เปิดตั๋วจำนำ',
  PAWN_INTEREST: 'รับดอกเบี้ยจำนำ',
  PAWN_REDEEM: 'ไถ่ถอนจำนำ',
  PAWN_VOID: 'ยกเลิกตั๋วจำนำ',
  CREDIT_SALE: 'ขายเครดิต',
  CUSTOMER_PAYMENT: 'รับชำระลูกหนี้',
};

/** Signed amount for balance: income/transfer_in positive, expense/transfer_out negative */
export function signedAmountCents(type: LedgerEntryType, amountCents: number): number {
  switch (type) {
    case 'INCOME':
    case 'TRANSFER_IN':
      return amountCents;
    case 'EXPENSE':
    case 'TRANSFER_OUT':
      return -amountCents;
    default:
      return amountCents;
  }
}

export function oppositeType(type: LedgerEntryType): LedgerEntryType {
  switch (type) {
    case 'INCOME':
      return 'EXPENSE';
    case 'EXPENSE':
      return 'INCOME';
    case 'TRANSFER_IN':
      return 'TRANSFER_OUT';
    case 'TRANSFER_OUT':
      return 'TRANSFER_IN';
    default:
      return 'EXPENSE';
  }
}
