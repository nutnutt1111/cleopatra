# Ponytail Audit — Cleopatra

Audit using [ponytail](https://github.com/nutnutt1111/ponytail) principles. Ranked by impact.

## Applied in this PR

| Tag | Finding | Action |
|-----|---------|--------|
| `delete` | `logistics-charts.js`, `logistics-dashboard.js`, `widgets/logistics/` — never imported | Removed |
| `delete` | `components/charts/` — DOM targets not on any page | Removed |
| `delete` | `components/animations/` — not in bundle, conflicts with SPA router | Removed |
| `delete` | `components/index.js` — nothing imports it | Removed |
| `delete` | `sidebar.html` + `sidebar.json` vite load — JS sidebar is canonical | Removed |
| `delete` | `@tailwindcss/postcss`, `postcss` — no PostCSS config | Removed from deps |
| `yagni` | Router auto-init + `main.js` init → double click handlers | Router init only from `main.js` |
| `yagni` | Dropdown document listeners re-bound every SPA navigation | Guarded with one-time bind |
| `shrink` | Dead chart inits in `main.js` | Removed |

## Deferred (medium risk, high payoff)

| Tag | Finding | Upgrade path |
|-----|---------|--------------|
| `delete` | ApexCharts + Chart.js both shipped | Pick one library, migrate ~8 widgets |
| `yagni` | `main.js` inits every widget on every page | Page-scoped `import()` per dashboard |
| `shrink` | Duplicate `chart-utils.js` / `chartjs-utils.js` theme logic | One `chart-theme.js` + CSS `color-mix()` |
| `shrink` | Inline `menuData` in `sidebar.js` (~190 lines) | Import from JSON if nav becomes data-driven |
| `shrink` | Shiki loaded on every page | Lazy-load on docs/code-block routes only |

## Commands (Cursor / compatible agents)

- `/ponytail-review` — review current diff for over-engineering
- `/ponytail-audit` — whole-repo audit (this file is the baseline)
- `/ponytail-debt` — harvest `ponytail:` comments into a ledger
