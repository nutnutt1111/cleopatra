# DonutiT — Primary App Policy

> **Canonical product:** `donutit-cleopatra` at **http://localhost:3005** — UI and API share the same origin (`/api/...`).

## Primary (ใช้งานจริง)

| What | Where |
|------|--------|
| **App name** | `donutit-cleopatra` |
| **URL** | **http://localhost:3005** |
| **API** | **http://localhost:3005/api/...** (same app — `GET /api/health` → `{ service: "donutit-api" }`) |
| **React UI** | `apps/donutit-react/` — `cleo-shell`, `InventoryPage`, `PosPage`, `TransferDetailPanel` |
| Shared logic | `packages/donutit-shared/` — relative `/api` client, trade-in drafts, export CSV |
| Backend | `server/` — Express routes mounted under `/api/*` |
| Dev command | `yarn dev` → API + React on **3005** (Vite proxies `/api` to internal backend) |
| Routes | `/login`, `/inventory`, `/pos`, `/hr`, `/manager-hr` — all call API in this repo on the same origin |
| Quality gates | `scripts/quality/config.sh` → `QUALITY_BASE_URL` and `QUALITY_API_URL` default **3005** |

### Dev architecture (single origin)

```
Browser → http://localhost:3005/inventory
       → http://localhost:3005/api/inventory/...
       → http://localhost:3005/api/health  { ok: true, service: "donutit-api" }
```

In local dev, Vite on **3005** proxies `/api` to the Express process (default internal port **3004** via `API_PORT`). From the browser and quality scripts, only **3005** matters.

### Today's features (ported to React)

| Feature | React location |
|---------|----------------|
| หมวดหมู่ + ปุ่มเพิ่มแยก | `CategoryField` — `#inv-category` + `#inv-btn-add-category` |
| ลบ ปกติ/ด่วน → ดราฟ Trade-in | `InventoryPage` draft import + `TradeInSection` on POS |
| ปุ่ม Export topbar | `TopbarExportButton` in `cleo-topbar__actions` |
| เวลาโอน (native time) | `TransferDetailPanel` — `input[type=time]` + label preview |
| HR + ผู้จัดการ | `HrPage` (`/hr`) · `ManagerHrPage` (`/manager-hr`) — role-based nav ใน sidebar |

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
yarn dev              # donutit-cleopatra :3005 (API + React)
yarn dev:ui           # React UI only (needs yarn dev:api separately)
yarn dev:api          # Express API only (internal :3004, proxied in dev)
yarn dev:legacy       # Legacy vanilla UI :3006 (optional)
yarn quality:hardening
```
