# DonutiT Delivery Phases

## Phase E1 — Identity + Nav + SPA Fix ✅

**Branch:** `cursor/phase-1-nav-spa-8e6d`  
**Status:** Complete

### Delivered

- Sidebar uses `sidebar.json` as canonical menu (DonutiT links visible)
- `donutit-init.js` registry initializes widgets on `DOMContentLoaded` + `page:load`
- Removed inline `<script type="module">` from 8 DonutiT pages
- `bindSidebarChrome` / `renderMenu` and `bindNavbarChrome` prevent listener leaks
- `bindOnce` guards on DonutiT widget button handlers
- Rebranded header: Cleopatra → DonutiT, logo links to `/dashboard`, demo nav hidden

### Verify

- `yarn build` — pass
- `yarn quality:smoke` — pass (10 routes)

### Upcoming

_All delivery phases E1–E5 complete._

## Phase E5 — Security hardening ✅

**Branch:** `cursor/phase-5-hardening-8e6d`  
**Status:** Complete

### Delivered

- **FU-3:** Race conflicts return HTTP 409 (pawn redeem, POS void, messenger deliver, daily-close unlock)
- **FU-1:** JWT carries identity only (`userId`, `storeId`); role loaded from DB on each request
- **FU-2:** Double-submit CSRF cookie + `X-CSRF-Token` on mutations; `donutit-api.js` sends token
- Quality scripts updated with `api_post` helpers + CSRF cookie parsing
- `.env.example` documents `CSRF_ENFORCE`

### Verify

```bash
yarn db:seed
yarn quality:hardening
yarn quality:review
yarn quality:money
```

## Phase E2 — Design pass ✅

**Branch:** `cursor/phase-2-design-8e6d`  
**Status:** Complete

### Delivered

- Real dashboard KPIs (client aggregate from existing APIs)
- Recent bills + ledger activity tables
- `dashboard.js` wired via `donutit-init.js`
- `notify.js` — toast replaces `alert()` in all DonutiT modules
- Badge classes on pawn, messenger, inventory status

### Verify

- `yarn build` + `yarn quality:smoke` + `yarn quality:ux`

## Phase E3 — Frontend ponytail ✅

**Branch:** `cursor/phase-3-fe-ponytail-8e6d`  
**Status:** Complete

### Delivered

- `dashboard-init.js` — page-scoped chart/widget registry
- Removed eager chart inits from `main.js`
- Migrated ApexCharts widgets to Chart.js; removed `apexcharts` dependency
- `chart-mount.js` + `chart-theme.js` shared helpers
- Lazy Shiki import in code-block-transformer

### Verify

- `yarn build` + `yarn quality:smoke` + `yarn quality:ux`

## Phase E4 — Server ponytail ✅

**Branch:** `cursor/phase-4-server-ponytail-8e6d`  
**Status:** Complete

### Delivered

- Extracted auth routes to `server/routes/auth.ts`
- `error-handler.ts` consolidated domain error handling
- Shared `AuthedRequest` type

### Verify

- `yarn quality:api` — 22 pass
