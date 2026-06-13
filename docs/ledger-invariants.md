# Ledger Invariants — ledger-hawk

> DonutiT Cleopatra Wave 1. Rerun these scenarios after any financial change.

## Invariants

| ID | Invariant | Enforcement |
|----|-----------|-------------|
| L1 | `amountCents > 0` on every entry | `postLedgerEntry()` |
| L2 | Locked close date blocks new posts | `assertDateNotLocked()` → HTTP 423 |
| L3 | Locked close date blocks voids | `voidLedgerEntry()` calls assertDateNotLocked |
| L4 | Void marks original `isVoided=true` | `voidLedgerEntry()` transaction |
| L5 | Void creates reversal with `reversalOfId` | opposite type, same amount |
| L6 | Reversal entries cannot be voided again | `voidLedgerEntry()` guard |
| L7 | Daily close sums match ledger for that date | `sumLedgerForDate()` at close time |
| L8 | Unlock requires Owner | `assertAction('daily-close:unlock')` |
| L9 | Every money action writes AuditLog | `writeAudit()` on post/void/close/unlock |

## Manual Test Scenarios

### 1. Post on open day
```bash
# Login as owner, POST /api/cashflow/ledger
# Expect: 201, audit log LEDGER_POST
```

### 2. Post on locked day (2 days ago in seed)
```bash
# POST entry with entryDate = 2 days ago
# Expect: 423 วันที่นี้ปิดแล้ว
```

### 3. Void with reversal
```bash
# POST /api/cashflow/ledger/:id/void { reason: "ทดสอบ" }
# Expect: original isVoided, new reversal entry exists
```

### 4. Daily close
```bash
# POST /api/cashflow/daily-close { closeDate: "YYYY-MM-DD" }
# Expect: 201, isLocked true
# Retry → 409 วันนี้ปิดแล้ว
```

### 5. Owner unlock
```bash
# POST /api/cashflow/daily-close/unlock as staff → 403
# POST as owner → 200, isLocked false
# Post new entry on unlocked date → 201
```

## Seed Evidence

After `yarn db:seed`:
- 4 ledger entries across 3 days
- 1 locked daily close (2 days ago)
- 2 products (serialized phone + qty cable)
- 1 POS bill with split payment (cash + transfer)
- 2 customers, 1 pawn ticket, 1 credit sale with installment

## Wave 2 — POS Invariants

| ID | Invariant | Enforcement |
|----|-----------|-------------|
| P1 | Payment sum = bill total | `createPosBill()` |
| P2 | Sale deducts stock / marks serial SOLD | `deductStockForSale()` |
| P3 | Void restores stock / serial AVAILABLE | `restoreStockOnVoid()` |
| P4 | Void reverses POS ledger entries | `voidLedgerByReference('POS', billId)` |
| P5 | Staff cannot apply discount | role check in `createPosBill()` |
| P6 | Cost hidden from Staff | `canViewCost()` in inventory API |

## Wave 3 — Pawn Invariants

| ID | Invariant | Enforcement |
|----|-----------|-------------|
| W3-P1 | Pawn create posts EXPENSE for principal | `createPawnTicket()` |
| W3-P2 | Interest posts INCOME, extends due date | `payPawnInterest()` |
| W3-P3 | Redeem posts INCOME (principal + overdue interest) | `redeemPawnTicket()` |
| W3-P4 | Void reverses PAWN ledger entry | `voidLedgerByReference('PAWN', ticketId)` |
| W3-C1 | Credit sale increases customer balance | `createCreditSale()` |
| W3-C2 | Payment decreases balance, posts INCOME | `recordCustomerPayment()` |
| W3-C3 | Credit limit enforced (Owner override) | `createCreditSale()` role check |
| W3-C4 | Installment plan tracks paid installments | `InstallmentPlan.paidInstallments` |

## Seed Evidence (Wave 3)

After `yarn db:seed`:
- 2 customers with credit limits
- 1 active pawn ticket with 1 interest payment (transfer detail)
- 1 credit sale with 3-installment plan + 1 partial payment
