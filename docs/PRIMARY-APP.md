# DonutiT — Primary App Policy

> **Canonical product:** DonutiT React on **http://localhost:3005** + API **http://localhost:3004**

## Primary (ใช้งานจริง)

| What | Where |
|------|--------|
| **React UI** | `apps/donutit-react/` — `cleo-shell`, `InventoryPage`, `PosPage`, `TransferDetailPanel` |
| Shared logic | `packages/donutit-shared/` — API, trade-in drafts, export CSV |
| Frontend | `yarn dev` or `yarn dev:all` → port **3005** |
| API | `yarn dev:api` → port **3004** |
| Routes | `/login`, `/inventory`, `/pos` (more modules → add in React) |
| Quality gates | `scripts/quality/config.sh` → `QUALITY_BASE_URL` default **3005** |

### Today's features (ported to React)

| Feature | React location |
|---------|----------------|
| หมวดหมู่ + ปุ่มเพิ่มแยก | `InventoryPage` — `+ เพิ่มหมวดหมู่` |
| ลบ ปกติ/ด่วน → ดราฟ Trade-in | `InventoryPage` draft import + `TradeInSection` on POS |
| ปุ่ม Export topbar | `TopbarExportButton` in `cleo-topbar__actions` |
| เวลาโอน (native time) | `TransferDetailPanel` — `input[type=time]` + label preview |

**Do not** use external React previews or old ports (e.g. 3003) unless synced from this repo.

## Legacy (เก็บไว้อ้างอิงเท่านั้น)

| What | Label | Where |
|------|--------|--------|
| Vanilla JS DonutiT | **Legacy vanilla** | `src/pages/donutit/*` — `yarn dev:legacy` → port **3006** |
| Upstream admin template | **Legacy Cleopatra** | `src/pages/*` (except `donutit/`) |
| Marketing landing | **Legacy Cleopatra** | `src/index.html` |
| Demo dashboards | **Legacy Cleopatra demos** | `/pages/index.html`, … |
| Template docs | **Legacy Cleopatra** | `ARCHITECTURE.md`, `COMPONENT_GUIDE.md` |

Legacy pages show a banner. **New features go in `apps/donutit-react/` and `server/` only.**

## Commands

```bash
yarn install
yarn --cwd apps/donutit-react install   # first time
yarn dev:all          # API :3004 + React DonutiT :3005
yarn dev:legacy       # Legacy vanilla UI :3006 (optional)
yarn quality:hardening
```
