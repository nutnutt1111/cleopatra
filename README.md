# DonutiT

**Primary app:** [http://localhost:3005](http://localhost:3005) (frontend) · API [http://localhost:3004](http://localhost:3004)

Store-management platform for Thai retail and pawn operations — POS, inventory, pawn, messenger, cashflow, customers, HR.

**Status:** Waves 0–5 complete · [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md)  
**Policy:** [docs/PRIMARY-APP.md](docs/PRIMARY-APP.md) — DonutiT :3005 is the only product surface; everything else is **legacy**.

---

## Modules (primary)

| Module | Route |
|--------|-------|
| **POS** | `/pos` |
| **Inventory** | `/inventory` |
| **Pawn** | `/pawn` |
| **Messenger** | `/messenger` |
| **Cashflow** | `/cashflow-ledger` |
| **Customers** | `/customers` |
| **HR** | `/hr` |
| **Settings** | `/settings` |

---

## Quick Start

```bash
yarn install
cp .env.example .env        # optional — defaults work for dev

yarn db:reset               # migrate + seed dev data
yarn dev:all                # API :3004 + DonutiT :3005
```

Open [http://localhost:3005/login](http://localhost:3005/login) — `owner@donutit.local` / `donutit-dev`.

### Quality gate (before release)

```bash
yarn quality:hardening      # primary routes on :3005
```

See [docs/quality/README.md](docs/quality/README.md).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Primary frontend** | Vite, Tailwind v4, `src/pages/donutit/` |
| API | Express, Prisma, SQLite |
| Auth | httpOnly cookie JWT |
| Ports | **3005** (DonutiT) · **3004** (API) |

---

## Project Structure

```
server/                      # API (primary)
src/pages/donutit/           # Primary UI pages
src/components/widgets/donutit/
src/pages/                   # Legacy Cleopatra template demos (do not extend)
src/index.html               # Legacy Cleopatra marketing landing
docs/PRIMARY-APP.md          # Primary vs legacy policy
scripts/quality/             # Gates target :3005 DonutiT routes
```

---

## Documentation

- [Primary app policy](docs/PRIMARY-APP.md)
- [Project status](docs/PROJECT-STATUS.md)
- [Parity checklist](docs/parity-checklist.md)
- [Roadmap](docs/roadmap.md)
- [Agent orchestrator](AGENTS.md)

---

## Legacy Cleopatra template (reference only)

Upstream [Cleopatra](https://github.com/moesaid/cleopatra) v2.0 admin template — demo dashboards and component pages under `/pages/…`. **Not the product.** Do not build new features there.

- [Legacy ARCHITECTURE.md](ARCHITECTURE.md)
- [Legacy COMPONENT_GUIDE.md](COMPONENT_GUIDE.md)
- Original demo: [moesaid.github.io/cleopatra](https://moesaid.github.io/cleopatra/)

MIT © [Mohamed Said](https://moesaid.com) (legacy Cleopatra template)
