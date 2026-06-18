# DonutiT — Project Status

> **Primary app:** `localhost:3005` · [PRIMARY-APP.md](./PRIMARY-APP.md)

> Last updated: **2026-06-16** after Phase E5 (FU-1–3) on `main`.

## Summary

Store-management platform for Thai retail + pawn: POS, inventory, pawn, messenger, cashflow, customers, HR — with ledger correctness, role-based access, and automated quality gates.

| Milestone | Status | Branch / PR |
|-----------|--------|-------------|
| Quality subagents (7 agents) | ✅ Complete | `cursor/quality-subagents-e20d` · PR #1 |
| Wave 0 — Foundation | ✅ Complete | PR #2 |
| Wave 1 — Ledger | ✅ Complete | PR #3 |
| Wave 2 — POS + Inventory | ✅ Complete | PR #4 |
| Wave 3 — Pawn + Customers | ✅ Complete | PR #5 |
| Wave 4 — Messenger + HR | ✅ Complete | PR #6 |
| Wave 5 — Hardening | ✅ Complete | PR #7 (merged) |
| Hardtest + security review | ✅ Complete | included in PR #7 |
| Production hardening (FU-1–3) | ✅ Complete | Phase E5 · [follow-ups-pr7.md](./follow-ups-pr7.md) |

**Integration branch:** `main` — DonutiT E1–E5 (nav, dashboard, ponytail, hardening)  
**Upstream template:** Legacy Cleopatra v2 (reference only — not the product)

---

## Architecture

| Layer | Stack | Port |
|-------|-------|------|
| Frontend | Vite + Tailwind v4 + DonutiT widgets | **3005** |
| API | Express + Prisma + SQLite (Postgres-ready) | **3004** |
| Auth | httpOnly cookie JWT + optional Bearer | — |
| DB | `prisma/dev.db` (7 migrations) | — |

### Modules (UI + API)

| Module | Route | API prefix |
|--------|-------|------------|
| POS | `/pos` | `/api/pos` |
| Inventory | `/inventory` | `/api/inventory` |
| Pawn | `/pawn` | `/api/pawn` |
| Messenger | `/messenger` | `/api/messenger` |
| Cashflow | `/cashflow-ledger` | `/api/cashflow` |
| Customers | `/customers` | `/api/customers` |
| HR | `/hr` | `/api/hr` |
| Settings | `/settings` | `/api/auth` |

---

## Wave delivery log

### Wave 0 — Foundation
- Prisma schema (stores, users, roles)
- Auth API (`login`, `me`, `logout`) + permission helpers
- DonutiT sidebar + 9 module pages
- 7 quality subagent definitions

### Wave 1 — Ledger
- `LedgerEntry` posting, void, reversal
- Daily close + lock (`423` on locked day)
- Audit log for money actions

### Wave 2 — POS + Inventory
- POS bills, split payment, void + stock restore
- Serialized + quantity inventory
- Cost visibility gated by role

### Wave 3 — Pawn + Customers
- Pawn create / interest / redeem / void
- Customer credit sales, installments, payments
- Credit limit enforcement (`creditLimitCents=0` blocks sales)

### Wave 4 — Messenger + HR
- Delivery jobs (pending → transit → delivered)
- Delivery fee posts **INCOME** to ledger when collected
- HR employees + payroll draft (Owner/HR gated)

### Wave 5 — Hardening
- `yarn quality:hardening` gate (route + api + hardtest + seed + ux)
- `seed-smith` coverage doc
- Parity checklist evidence
- Grumpy review fixes (XSS, cookie auth, sequencing, pagination, audit payload)

### PR #7 — Hardtest + security (merged 2026-06-14)
- **Pawn interest race** — optimistic `updateMany`, `periodKey`, in-flight lock + cooldown
- **Auth hardening** — CORS whitelist, helmet, login rate limit, Secure cookie, `LOGIN_RETURN_TOKEN` opt-in
- **Bangkok doc prefixes** — `server/lib/date-utils.ts`
- **Audit metadata** — IP + userAgent in payload
- **Scripts** — `hardtest.sh`, `review-audit.sh`, `money-audit.sh`
- **Follow-ups** — FU-1 JWT, FU-2 CSRF, FU-3 race status codes ✅ closed in Phase E5 (2026-06-16)

---

## Quality gates

```bash
yarn db:reset              # fresh DB + seed
yarn dev:all               # API :3004 + DonutiT :3005

yarn quality:hardening     # full gate — use before merge/release
yarn quality:hardtest      # abuse/race simulation
yarn quality:review        # extended race + auth audit
yarn quality:money         # DB money invariant scan
yarn quality:audit         # agent report (route + api + seed + ux)
```

### Hardening gate steps (`yarn quality:hardening`)

1. Route smoke — all DonutiT pages 200
2. API smoke — cookie auth, permissions, flows
3. **Hardtest** — parallel pawn interest, credit limit=0, CORS, locked day
4. Seed verify — seed-smith fixtures
5. UX patrol — Thai labels, responsive, confirmations

Last verified: **2026-06-16** — ALL PASS (`yarn quality:hardening`, `yarn quality:review`, `yarn quality:money`)

---

## Dev accounts

| Email | Role | Password |
|-------|------|----------|
| owner@donutit.local | OWNER | donutit-dev |
| manager@donutit.local | MANAGER | donutit-dev |
| staff@donutit.local | STAFF | donutit-dev |
| hr@donutit.local | HR | donutit-dev |

See [seed-smith-coverage.md](./seed-smith-coverage.md) for fixture details.

---

## Documentation index

| Doc | Purpose |
|-----|---------|
| [roadmap.md](./roadmap.md) | Wave plan + follow-ups |
| [parity-checklist.md](./parity-checklist.md) | Module completion truth |
| [ledger-invariants.md](./ledger-invariants.md) | Money rules |
| [seed-smith-coverage.md](./seed-smith-coverage.md) | Seed fixtures |
| [follow-ups-pr7.md](./follow-ups-pr7.md) | Post-merge security work |
| [VERIFY-PHASES.md](./VERIFY-PHASES.md) | Ponytail V evidence ledger (E1–E5) |
| [quality/README.md](./quality/README.md) | Quality subagent system |
| [../AGENTS.md](../AGENTS.md) | Agent orchestrator |

---

## Known open items (post-merge)

_None — FU-1, FU-2, FU-3 closed in Phase E5 (2026-06-16)._

---

## Git branch map

```
main                          ← DonutiT production line (Waves 0–5 + E1–E5)
cursor/phase-*-8e6d           ← delivery phases (merged)
```
