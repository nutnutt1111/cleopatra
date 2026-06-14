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

- `docs/PROJECT-STATUS.md` — **master delivery log** (waves 0–5, PR #7, gates)
- `docs/parity-checklist.md` — module completion truth source
- `docs/roadmap.md` — planned waves and dependencies
- `docs/follow-ups-pr7.md` — post-merge security follow-ups (FU-1–3)
- `docs/quality/README.md` — human index for this system

## Target Environment

**Frontend:** [http://localhost:3003](http://localhost:3003) · **API:** [http://localhost:3004](http://localhost:3004)

```bash
yarn dev              # Vite frontend :3003
yarn dev:api          # Express API :3004
yarn dev:all          # both servers

yarn quality:hardening   # full gate: route + api + hardtest + seed + ux
yarn quality:hardtest    # Grumpy abuse/race simulation
yarn quality:review      # extended race + auth audit (PR #7)
yarn quality:money       # DB money invariant scan
yarn quality:audit       # agent report generator (route + api + seed + ux)
yarn quality:smoke       # route smoke only
yarn quality:api         # API flow smoke (cookie auth)
yarn quality:seed        # seed-smith verification
yarn quality:ux          # ux-patrol checks
```

> `quality:audit` does **not** include hardening/hardtest — run `quality:hardening` for the merge gate.

Config: `scripts/quality/config.sh` — override with `QUALITY_BASE_URL`, `QUALITY_API_URL`.

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
