# DonutiT Cleopatra — Agent Orchestrator

Quality subagents for the DonutiT Cleopatra store-management platform. Use them to coordinate safe, verifiable delivery across POS, Pawn, Inventory, Cashflow, Messenger, Customers, and HR.

## Quality Subagents

| Agent | File | When to run |
|-------|------|-------------|
| **map-master** | `.cursor/agents/map-master.md` | Before starting any multi-module task |
| **seed-smith** | `.cursor/agents/seed-smith.md` | When test data is needed or schema changes |
| **ledger-hawk** | `.cursor/agents/ledger-hawk.md` | Any change touching money, stock, or debt |
| **gate-keeper** | `.cursor/agents/gate-keeper.md` | New routes, exports, or role-gated actions |
| **regress-ranger** | `.cursor/agents/regress-ranger.md` | After merge or before release |
| **doc-janitor** | `.cursor/agents/doc-janitor.md` | After features merge; keep docs honest |
| **ux-patrol** | `.cursor/agents/ux-patrol.md` | After UI work on staff-facing modules |

## Recommended Workflow

```
1. map-master     → dependency verdict before coding
2. implement      → feature work on approved scope
3. seed-smith     → fixtures if flows need test data
4. ledger-hawk    → if financial (parallel with gate-keeper)
5. gate-keeper    → if permissions (parallel with ledger-hawk)
6. regress-ranger → smoke + flow regression
7. ux-patrol      → staff usability on changed UI
8. doc-janitor    → sync parity checklist and roadmap
```

## Parallel vs Sequential

| Can run in parallel | Must run sequentially |
|---------------------|----------------------|
| `ledger-hawk` + `gate-keeper` | `map-master` before implementation |
| `ux-patrol` + `regress-ranger` (after build) | `regress-ranger` after `seed-smith` seeds exist |
| `doc-janitor` after evidence gathered | `doc-janitor` after `regress-ranger` for done claims |

## Blocking Chain

Stop merge when any agent returns:

- `ledger-hawk` → **BLOCK**
- `gate-keeper` → **BLOCK**
- `regress-ranger` → **BLOCK**
- `doc-janitor` → **BLOCK DOC CLAIM**
- `ux-patrol` → **BLOCK USABILITY**

`map-master` verdicts **START AFTER BLOCKER**, **SPLIT TASK FIRST**, and **DO NOT RUN IN PARALLEL** are planning gates — resolve before opening the PR.

## Shared Artifacts

- `docs/parity-checklist.md` — module completion truth source
- `docs/roadmap.md` — planned waves and dependencies
- `docs/quality/README.md` — human index for this system

## Target Environment

**Dev server:** [http://localhost:3003](http://localhost:3003)

```bash
yarn dev          # starts Vite on port 3003
yarn quality:audit   # run all 7 agents → docs/quality/reports/
yarn quality:smoke   # route smoke only (regress-ranger)
```

Config: `scripts/quality/config.sh` — override with `QUALITY_BASE_URL`.

## Invoking a Subagent

In Cursor, launch a subagent with the agent file as context:

```
Read .cursor/agents/<agent-name>.md and perform your mission for: <task description>
```

Example:

```
Read .cursor/agents/map-master.md and map dependencies for: Add POS split payment void reversal
```

## High-Risk Files

Treat edits to these paths as requiring `ledger-hawk` and/or `gate-keeper`:

- `prisma/schema.prisma`
- `**/cashflow/**`, `**/ledger/**`
- `**/pos/**` (bills, payments, voids)
- `**/pawn/**`
- `**/auth/**`, permission helpers
- Export/report API routes
