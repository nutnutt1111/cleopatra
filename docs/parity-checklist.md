# DonutiT Cleopatra — Parity Checklist

> Maintained by `doc-janitor`. Mark `[x]` only with code + smoke evidence.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked/regressed

## Core Platform

- [ ] Prisma schema baseline (stores, users, roles)
- [ ] Auth session + `assertRole` helpers
- [ ] `assertCanExportReports` for export routes
- [ ] Sidebar nav for all modules (`/pos`, `/pawn`, etc.)
- [ ] Thai UI labels on staff-facing forms

## POS

- [ ] Cash sale
- [ ] Split payment (cash + transfer)
- [ ] Void with stock + ledger reversal
- [ ] Discount approval (Owner-gated)
- [ ] Installment payment on bill
- [ ] Receipt print/PDF readable

## Pawn

- [ ] New pawn ticket
- [ ] Interest payment
- [ ] Full redeem
- [ ] Transfer detail view
- [ ] Ticket void/reverse (if applicable)

## Inventory

- [ ] Serialized item (create, sell, void restore)
- [ ] Non-serialized item (qty tracking)
- [ ] Cost field hidden without permission
- [ ] Status badges (available, sold, pawned, etc.)

## Cashflow

- [ ] Ledger entry posting
- [ ] Daily close
- [ ] Locked close blocks mutations
- [ ] Owner unlock daily close

## Messenger

- [ ] Create delivery job
- [ ] Mark delivered
- [ ] Delivery fee expense posted to ledger

## Customers

- [ ] Customer profile
- [ ] Credit account / receivable balance
- [ ] Credit sale + partial payment

## HR

- [ ] Employee records (role-gated)
- [ ] Payroll view (Owner/HR only)

## Permissions

- [ ] POS void/delete — server guard
- [ ] Export reports — `assertCanExportReports`
- [ ] Deleted record visibility — Owner only
- [ ] Inventory cost visibility — authorized roles only

## Regression Evidence

- [ ] `regress-ranger` route smoke (all main routes 200)
- [ ] `seed-smith` fixtures cover all flows above
- [ ] Last regression run date: _not yet run_
