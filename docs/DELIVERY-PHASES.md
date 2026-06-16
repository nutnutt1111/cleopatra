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

| Phase | Scope |
|-------|-------|
| E2 | Design pass — dashboard KPI, Cleopatra widget reuse |
| E3 | Frontend ponytail cleanup |
| E4 | Server ponytail cleanup |
| E5 | Hardening (FU-1–3) |
