# Ponytail Audit — Cleopatra

Audit using [ponytail](https://github.com/nutnutt1111/ponytail) principles. Ranked by impact.

## Applied in this PR

| Tag | Finding | Action |
|-----|---------|--------|
| `delete` | `logistics-charts.js`, `logistics-dashboard.js`, `widgets/logistics/` — never imported | Removed |
| `delete` | `components/charts/` — DOM targets not on any page | Removed |
| `delete` | `components/animations/` — not in bundle, conflicts with SPA router | Removed |
| `delete` | `components/index.js` — nothing imports it | Removed |
| `delete` | `sidebar.html` + vite sidebar load — JS sidebar is canonical | Removed (kept `sidebar.json` for DonutiT nav + quality scripts) |
| `delete` | `@tailwindcss/postcss`, `postcss` — no PostCSS config | Removed from deps |
| `yagni` | Router auto-init + `main.js` init → double click handlers | Router init only from `main.js` |
| `yagni` | Dropdown document listeners re-bound every SPA navigation | Guarded with one-time bind |
| `shrink` | Dead chart inits in `main.js` | Removed |

## Applied in auth dedupe (2026-06)

| Tag | Finding | Action |
|-----|---------|--------|
| `delete` | Login form duplicated on `/login` + `/settings` hybrid | `/login` only; `/settings` account-only + auth guard |
| `delete` | 3 navbar login entry points (header btn, dropdown link, hint) | Avatar → `/login` when logged out; sidebar link only |
| `delete` | Logout on settings page + login "switch account" panel | Navbar logout only |
| `delete` | `login-already` panel duplicated settings account UI | Logged-in `/login` → redirect `/dashboard` |
| `shrink` | `login.js` hybrid settings hooks (`revealSettingsAfterLogin`) | Removed |

## Deferred (medium risk, high payoff)

| Tag | Finding | Upgrade path |
|-----|---------|--------------|
| `delete` | ApexCharts + Chart.js both shipped | Pick one library, migrate ~8 widgets |
| `yagni` | `main.js` inits every widget on every page | Page-scoped `import()` per dashboard |
| `shrink` | Duplicate `chart-utils.js` / `chartjs-utils.js` theme logic | One `chart-theme.js` + CSS `color-mix()` |
| `shrink` | Inline `menuData` in `sidebar.js` (~190 lines) | Import from JSON if nav becomes data-driven |
| `shrink` | Shiki loaded on every page | Lazy-load on docs/code-block routes only |

## Applied in Phase E3

| Tag | Finding | Action |
|-----|---------|--------|
| `yagni` | `main.js` inits every chart widget on every page | `dashboard-init.js` page-scoped registry |
| `delete` | ApexCharts + Chart.js both shipped | Migrated Apex widgets to Chart.js; removed `apexcharts` dep |
| `shrink` | Duplicate chart init utils | `chart-mount.js` + `chart-theme.js` barrel |
| `shrink` | Shiki eager import | Dynamic `import('shiki')` in code-block-transformer |

## Commands (Cursor / compatible agents)

- `/ponytail-review` — review current diff for over-engineering
- `/ponytail-audit` — whole-repo audit (this file is the baseline)
- `/ponytail-debt` — harvest `ponytail:` comments into a ledger
