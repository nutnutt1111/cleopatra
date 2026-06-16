# DonutiT Cleopatra

Store-management platform for Thai retail and pawn operations — built on the [Cleopatra](https://github.com/moesaid/cleopatra) admin template (Vite + Tailwind v4).

**Status:** Waves 0–5 complete · [PR #7](https://github.com/nutnutt1111/cleopatra/pull/7) merged (2026-06-14)  
**Full status:** [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md)

---

## Modules

| Module | Description |
|--------|-------------|
| **POS** | Cash sales, split payment, void + stock reversal |
| **Inventory** | Serialized + quantity products, role-gated cost |
| **Pawn** | Tickets, interest, redeem, void |
| **Messenger** | Delivery jobs + fee collection |
| **Cashflow** | Ledger, daily close, audit trail |
| **Customers** | Credit sales, installments, receivables |
| **HR** | Employees, payroll (Owner/HR gated) |

Cleopatra template also includes 4 demo dashboards (Analytics, E-commerce, Crypto, Mission Control), 47+ pages, and SPA navigation.

---

## Quick Start

```bash
yarn install
cp .env.example .env        # optional — defaults work for dev

yarn db:reset               # migrate + seed dev data
yarn dev:all                # API :3004 + frontend :3003
```

Open [http://localhost:3003/login](http://localhost:3003/login) (or **บัญชี** in the sidebar) — sign in with `owner@donutit.local` / `donutit-dev`.

### Quality gate (before release)

```bash
yarn quality:hardening      # route + api + hardtest + seed + ux
```

See [docs/quality/README.md](docs/quality/README.md) for all `quality:*` scripts.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite, Tailwind CSS v4, vanilla JS widgets |
| API | Express, Prisma, SQLite (Postgres-ready schema) |
| Auth | httpOnly cookie JWT (`credentials: 'include'`) |
| Ports | Frontend **3003**, API **3004** |

---

## Project Structure

```
server/                 # Express API
  index.ts              # Auth, CORS, helmet, routes
  lib/                  # Business logic (pos, pawn, ledger, …)
  routes/               # REST handlers per module
prisma/
  schema.prisma         # Data model (waves 0–5)
  seed.ts               # seed-smith fixtures
src/
  pages/donutit/        # Module HTML pages
  components/widgets/donutit/  # JS widgets + donutit-api.js
  components/ui/        # Buttons, cards, alerts, modals
  components/widgets/   # Dashboard widgets, charts
docs/
  PROJECT-STATUS.md     # ← start here for full delivery log
  parity-checklist.md   # What's done vs deferred
  roadmap.md            # Waves + follow-ups
scripts/quality/        # Automated gates (hardening, hardtest, …)
.cursor/agents/         # 7 quality subagents
```

---

## Documentation

- [Project status & wave log](docs/PROJECT-STATUS.md)
- [Parity checklist](docs/parity-checklist.md)
- [Roadmap & follow-ups](docs/roadmap.md)
- [Ledger invariants](docs/ledger-invariants.md)
- [Seed coverage](docs/seed-smith-coverage.md)
- [Post-merge security (FU-1–3)](docs/follow-ups-pr7.md)
- [Quality subagents](docs/quality/README.md)
- [Agent orchestrator](AGENTS.md)
- [Ponytail audit](PONYTAIL_AUDIT.md) — code simplicity baseline

---

## Cleopatra Template (upstream)

This repo extends Cleopatra v2.0 — a production-ready admin dashboard template.

- [ARCHITECTURE.md](ARCHITECTURE.md) — Cleopatra widget architecture
- [COMPONENT_GUIDE.md](COMPONENT_GUIDE.md) — Component patterns
- Original demo: [moesaid.github.io/cleopatra](https://moesaid.github.io/cleopatra/)

MIT © [Mohamed Said](https://moesaid.com) (Cleopatra template)
