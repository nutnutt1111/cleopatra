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

- [ ] POS bill, payments, void
- [ ] Split payment
- [ ] Inventory serialized / non-serialized
- [ ] Stock movement on sale/void

**Depends on:** Wave 1 (ledger), Wave 0 (auth)

**Conflict risk:** POS payment routes + inventory stock — `DO NOT RUN IN PARALLEL` with pawn redeem work.

## Wave 3 — Pawn + Customers

- [ ] Pawn tickets, interest, redeem
- [ ] Customer credit / receivables
- [ ] Installments

**Depends on:** Wave 1, Wave 2 (shared stock/ledger)

## Wave 4 — Messenger + HR

- [ ] Messenger jobs + delivery fee expense
- [ ] HR employee + payroll (gated)

**Depends on:** Wave 1 (ledger for fees)

## Wave 5 — Hardening

- [ ] Full `seed-smith` coverage
- [ ] `regress-ranger` automated smoke
- [ ] `ux-patrol` tablet pass on all modules
- [ ] Parity checklist fully `[x]`

## Parallel Safe (after Wave 0)

| Track A | Track B |
|---------|---------|
| Messenger UI | HR UI |
| Customer profile UI | Inventory status UI |

## Sequential Required

1. Schema → ledger → POS/pawn payment logic
2. Permission helpers → any export or void endpoint
3. Seed data → regression runs
