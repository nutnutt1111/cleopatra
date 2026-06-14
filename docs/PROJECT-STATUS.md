# DonutiT Cleopatra — Project Status

> Last updated: **2026-06-14** after [PR #7](https://github.com/nutnutt1111/cleopatra/pull/7) merge into `cursor/wave-4-messenger-hr-e20d`.

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
| Production hardening (FU-1–3) | ⏳ Open | [follow-ups-pr7.md](./follow-ups-pr7.md) |

**Integration branch:** `cursor/wave-4-messenger-hr-e20d` (contains all waves 0–5 + PR #7)  
**Upstream template:** `main` — original Cleopatra v2 dashboard only (DonutiT work not merged to `main` yet)

---

## Architecture

| Layer | Stack | Port |
|-------|-------|------|
| Frontend | Vite + Tailwind v4 + DonutiT widgets | **3003** |
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
- **Follow-ups** — FU-1 JWT, FU-2 CSRF, FU-3 race status codes (open)

---

## Quality gates

```bash
yarn db:reset              # fresh DB + seed
yarn dev:all               # API :3004 + Vite :3003

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

Last verified: **2026-06-14** — ALL PASS (after `yarn db:seed`)

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
| [quality/README.md](./quality/README.md) | Quality subagent system |
| [../AGENTS.md](../AGENTS.md) | Agent orchestrator |

---

## Known open items (post-merge)

| ID | Priority | Item |
|----|----------|------|
| FU-1 | P1 | Reload user/role from DB — do not trust JWT claims |
| FU-2 | P1 | CSRF protection for mutating routes |
| FU-3 | P2 | Normalize race conflicts → HTTP 409 |

---

## Git branch map

```
main                          ← Cleopatra template only
cursor/quality-subagents-e20d ← 7 agents + audit runner
  └─ wave-0 … wave-4          ← feature stack (linear PRs #1–#6)
       └─ wave-5-hardening    ← Wave 5 + grumpy fixes
            └─ hardtest-fixes  ← PR #7 (FF merged into wave-5)
                 └─ MERGED → wave-4 @ ab71b59
```
