# DonutiT Cleopatra — Roadmap

> Maintained by `doc-janitor` and `map-master`. Do not mark phases complete without parity evidence.

## Vision

Store-management platform for Thai retail + pawn operations: POS, inventory, pawn, delivery, cashflow, customers, and HR — with strict ledger correctness and role-based access.

## Wave 0 — Foundation

**Status:** Complete (Wave 0 foundation)

- [x] Prisma + SQLite dev (Postgres-ready schema)
- [x] Auth API + JWT session (`server/lib/auth.ts`)
- [x] Permission helpers (`assertRole`, `assertCanExportReports`)
- [x] Module routes and sidebar navigation (`/pos`, `/pawn`, etc.)
- [x] Quality subagent definitions

**Blockers for Wave 1:** Schema + auth must complete first (`map-master` dependency).

## Wave 1 — Ledger Core

**Status:** Complete

- [x] Cashflow ledger model + posting service
- [x] Daily close + lock semantics
- [x] Audit trail for money actions
- [x] `ledger-hawk` invariant tests documented (`docs/ledger-invariants.md`)

## Wave 2 — POS + Inventory

**Status:** Complete

- [x] POS bill, payments, void
- [x] Split payment
- [x] Inventory serialized / non-serialized
- [x] Stock movement on sale/void

## Wave 3 — Pawn + Customers

**Status:** Complete

- [x] Pawn tickets, interest, redeem
- [x] Customer credit / receivables
- [x] Installments

**Depends on:** Wave 1, Wave 2 (shared stock/ledger)

## Wave 4 — Messenger + HR

**Status:** Complete

- [x] Messenger jobs + delivery fee **INCOME** (fee collected from customer)
- [x] HR employee + payroll (gated)

**Depends on:** Wave 1 (ledger for fees)

## Wave 5 — Hardening

**Status:** Complete (merged via [PR #7](https://github.com/nutnutt1111/cleopatra/pull/7), 2026-06-14)

- [x] Full `seed-smith` coverage (`yarn quality:seed`, `docs/seed-smith-coverage.md`)
- [x] `regress-ranger` automated smoke (`yarn quality:api` + `yarn quality:smoke`)
- [x] `ux-patrol` tablet pass on all modules (`yarn quality:ux`)
- [x] Grumpy HARDTEST (`yarn quality:hardtest`) — pawn race, credit limit, CORS
- [x] Extended review scripts (`review-audit.sh`, `money-audit.sh`)
- [x] Parity checklist evidence-complete (2 items deferred post-MVP)

## Parallel Safe (after Wave 0)

| Track A | Track B |
|---------|---------|
| Messenger UI | HR UI |
| Customer profile UI | Inventory status UI |

## Sequential Required

1. Schema → ledger → POS/pawn payment logic
2. Permission helpers → any export or void endpoint
3. Seed data → regression runs

## Post-merge follow-ups (PR #7)

**PR #7 merged:** 2026-06-14 → `cursor/wave-4-messenger-hr-e20d` @ `ab71b59`

**Follow-up work:** ✅ Complete — Phase E5 (2026-06-16). See [follow-ups-pr7.md](./follow-ups-pr7.md).

- [x] **FU-1 (P1)** Do not trust JWT role claims — reload user from DB per request
- [x] **FU-2 (P1)** CSRF protection for cookie-auth mutating routes
- [x] **FU-3 (P2)** Normalize race-conflict HTTP status codes to 409
