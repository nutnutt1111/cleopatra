# DonutiT

**Primary app:** [http://localhost:3005](http://localhost:3005) (`donutit-cleopatra`) — UI and API on the same origin (`/api/...`)

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
| **HR** | `/hr` (Owner/HR) · `/manager-hr` (Manager) |
| **Settings** | `/settings` |

---

## Quick Start

```bash
yarn install
yarn --cwd apps/donutit-react install

yarn db:reset               # migrate + seed dev data
yarn dev                    # donutit-cleopatra :3005 (API + React)
```

Open [http://localhost:3005/login](http://localhost:3005/login) — `owner@donutit.local` / `donutit-dev`.

**Windows:** [docs/WINDOWS-LOCAL-SETUP.md](docs/WINDOWS-LOCAL-SETUP.md) — sync `C:\Users\HP\Projects\cleopatra` + run `:3005`.

Legacy vanilla UI: `yarn dev:legacy` → port **3006**.

### Quality gate (before release)

```bash
yarn quality:hardening      # primary routes on :3005
```

See [docs/quality/README.md](docs/quality/README.md).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Primary app** | React — `apps/donutit-react/` at **:3005** |
| API | Express under `/api/*` on the same origin (proxied in dev) |
| Legacy vanilla | `src/pages/donutit/` (`yarn dev:legacy` :3006) |
| Auth | httpOnly cookie JWT |
| Port | **3005** only (user-facing) |

---

## Project Structure

```
apps/donutit-react/          # PRIMARY React UI (donutit-cleopatra :3005)
packages/donutit-shared/     # /api client, trade-in drafts, export
server/                      # Express API routes (/api/*)
src/pages/donutit/           # Legacy vanilla widgets (:3006)
src/pages/                   # Legacy Cleopatra demos
docs/PRIMARY-APP.md
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
