# DonutiT Cleopatra — Parity Checklist

> Maintained by `doc-janitor`. Mark `[x]` only with code + smoke evidence.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked/regressed

## Core Platform

- [x] Prisma schema baseline (stores, users, roles)
- [x] Auth session + `assertRole` helpers
- [x] `assertCanExportReports` for export routes
- [x] Sidebar nav for all modules (`/pos`, `/pawn`, etc.)
- [~] Thai UI labels on staff-facing forms

## POS

- [x] Cash sale
- [x] Split payment (cash + transfer)
- [x] Void with stock + ledger reversal
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

- [x] Serialized item (create, sell, void restore)
- [x] Non-serialized item (qty tracking)
- [x] Cost field hidden without permission
- [x] Status badges (available, sold, pawned, etc.)

## Cashflow

- [x] Ledger entry posting
- [x] Daily close
- [x] Locked close blocks mutations
- [x] Owner unlock daily close

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

- [x] POS void/delete — server guard
- [ ] Export reports — `assertCanExportReports`
- [ ] Deleted record visibility — Owner only
- [ ] Inventory cost visibility — authorized roles only
- [x] Daily close unlock — Owner-only (`daily-close:unlock`)

## Regression Evidence

- [x] `regress-ranger` route smoke (all main routes 200)
- [~] `seed-smith` fixtures cover all flows above (ledger + daily close seeded)
- [x] Last regression run date: 2026-06-13 (Wave 1 — ledger API verified)
