# DonutiT — Primary App Policy

> **Canonical product:** DonutiT on **http://localhost:3005** (Vite) + API **http://localhost:3004**

## Primary (ใช้งานจริง)

| What | Where |
|------|--------|
| App | DonutiT store management |
| Frontend | `yarn dev` → port **3005** |
| API | `yarn dev:api` → port **3004** |
| Pages | `src/pages/donutit/*` |
| Routes | `/login`, `/dashboard`, `/pos`, `/inventory`, `/pawn`, `/messenger`, `/cashflow-ledger`, `/customers`, `/hr`, `/settings` |
| Widgets | `src/components/widgets/donutit/*` |
| Layout | `src/components/layout/start.html`, `start-auth.html` |
| Quality gates | `scripts/quality/config.sh` → `QUALITY_BASE_URL` default **3005** |

**Do not** treat React previews, external forks, or old ports (e.g. 3003) as the product surface.

## Legacy (เก็บไว้อ้างอิงเท่านั้น)

| What | Label | Where |
|------|--------|--------|
| Upstream admin template | **Legacy Cleopatra** | `src/pages/*` (except `donutit/`) |
| Marketing landing | **Legacy Cleopatra** | `src/index.html` |
| Demo dashboards | **Legacy Cleopatra demos** | `/pages/index.html`, `index-e-commerce.html`, … |
| Template docs | **Legacy Cleopatra** | `ARCHITECTURE.md`, `COMPONENT_GUIDE.md` |
| Old navbar widget | **Legacy Cleopatra** | `src/components/widgets/navbar/navbar.html` |
| Docs layout | **Legacy Cleopatra** | `src/components/layout/docs-start.html` |
| Extended quality smoke | **Legacy Cleopatra routes** | `scripts/quality/run-extended.sh` |

Legacy pages show a banner and are **not** in the DonutiT sidebar. New features go only in `src/pages/donutit/` and `server/`.

## Commands

```bash
yarn dev:all          # Primary: API :3004 + DonutiT :3005
yarn quality:hardening # Gates target primary routes on :3005
yarn quality:audit:extended  # Optional legacy Cleopatra page smoke
```
