# DonutiT Cleopatra — Parity Checklist

> Maintained by `doc-janitor`. Mark `[x]` only with code + smoke evidence.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` deferred post-MVP

## Core Platform

- [x] Prisma schema baseline (stores, users, roles)
- [x] Auth session + `assertRole` helpers
- [x] `assertCanExportReports` for export routes
- [x] Sidebar nav for all modules (`/pos`, `/pawn`, etc.)
- [x] Thai UI labels on staff-facing forms

## POS

- [x] Cash sale
- [x] Split payment (cash + transfer)
- [x] Void with stock + ledger reversal
- [x] Discount approval (Owner/Manager — Staff blocked, `api-smoke`)
- [!] Installment payment on bill — deferred; use Customers credit sale + installment
- [!] Receipt print/PDF readable — deferred post-MVP

## Pawn

- [x] New pawn ticket
- [x] Interest payment
- [x] Full redeem
- [x] Transfer detail view
- [x] Ticket void/reverse (Owner/Manager)

## Inventory

- [x] Serialized item (create, sell, void restore)
- [x] Non-serialized item (qty tracking)
- [x] Cost field hidden without permission (`api-smoke`: Staff null, Manager visible)
- [x] Status badges (available, sold, reserved)

## Cashflow

- [x] Ledger entry posting
- [x] Daily close
- [x] Locked close blocks mutations
- [x] Owner unlock daily close

## Messenger

- [x] Create delivery job
- [x] Mark delivered
- [x] Delivery fee expense posted to ledger

## Customers

- [x] Customer profile
- [x] Credit account / receivable balance
- [x] Credit sale + partial payment

## HR

- [x] Employee records (role-gated)
- [x] Payroll view (Owner/HR only)

## Permissions

- [x] POS void/delete — server guard
- [x] Export reports — `assertCanExportReports` (`api-smoke`)
- [x] Deleted record visibility — Owner only (`/api/cashflow/audit`)
- [x] Inventory cost visibility — authorized roles only (`api-smoke`)
- [x] Daily close unlock — Owner-only (`daily-close:unlock`)

## Regression Evidence

- [x] `regress-ranger` route smoke (all main routes 200)
- [x] `regress-ranger` API flow smoke (`yarn quality:api`)
- [x] `seed-smith` fixtures cover all flows (`yarn quality:seed`, `docs/seed-smith-coverage.md`)
- [x] `ux-patrol` module pass (`yarn quality:ux`)
- [x] Last regression run date: 2026-06-13 (Wave 5 — `yarn quality:hardening`)

## Deferred (post-MVP)

- [!] POS bill installment — use `/customers` credit + installment plan
- [!] Receipt print/PDF — not in scope for Wave 5
