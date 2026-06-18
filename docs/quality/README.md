# Quality System — DonutiT (primary :3005)

> Policy: [PRIMARY-APP.md](../PRIMARY-APP.md) — gates target DonutiT on **3005** only. Legacy Cleopatra `/pages/…` is optional extended smoke.

Seven specialized subagents keep delivery safe across financial, permission, regression, documentation, and UX dimensions.

## Quick Reference

| # | Agent | Verdict outputs |
|---|-------|-----------------|
| 1 | [map-master](../../.cursor/agents/map-master.md) | SAFE TO START · START AFTER BLOCKER · SPLIT TASK FIRST · DO NOT RUN IN PARALLEL |
| 2 | [seed-smith](../../.cursor/agents/seed-smith.md) | Seed Summary · Covered Flows · Commands |
| 3 | [ledger-hawk](../../.cursor/agents/ledger-hawk.md) | PASS · PASS WITH RISK · **BLOCK** |
| 4 | [gate-keeper](../../.cursor/agents/gate-keeper.md) | PASS · PASS WITH NITS · **BLOCK** |
| 5 | [regress-ranger](../../.cursor/agents/regress-ranger.md) | PASS · PASS WITH NITS · **BLOCK** |
| 6 | [doc-janitor](../../.cursor/agents/doc-janitor.md) | SYNCED · PARTIAL SYNC · **BLOCK DOC CLAIM** |
| 7 | [ux-patrol](../../.cursor/agents/ux-patrol.md) | PASS · PASS WITH NITS · **BLOCK USABILITY** |

## Target Environment

| Service | URL |
|---------|-----|
| Frontend | [http://localhost:3005](http://localhost:3005) |
| API | [http://localhost:3004](http://localhost:3004) |

```bash
yarn dev                    # DonutiT :3005
yarn dev:api                # API :3004
yarn dev:all                # both

# Merge gate (run before release)
yarn quality:hardening      # route → api → hardtest → seed → ux

# Individual checks
yarn quality:smoke            # route smoke
yarn quality:api              # API flow smoke (cookie jar)
yarn quality:hardtest         # Grumpy abuse/race tests
yarn quality:seed             # seed-smith verification
yarn quality:ux               # ux-patrol

# Extended review (PR #7)
yarn quality:review           # race-reaper + auth-attacker
yarn quality:money            # money-invariant DB scan

# Agent report (does NOT include hardening/hardtest)
yarn quality:audit            # generates docs/quality/reports/
yarn quality:audit:extended   # audit + extended checks
```

Config: `scripts/quality/config.sh`

## Hardening Gate (`yarn quality:hardening`)

Orchestrator: `scripts/quality/hardening.sh`

| Step | Script | Agent |
|------|--------|-------|
| 1 | `route-smoke.sh` | regress-ranger |
| 2 | `api-smoke.sh` | regress-ranger |
| 3 | `hardtest.sh` | Grumpy HARDTEST |
| 4 | `seed-verify.sh` | seed-smith |
| 5 | `ux-patrol.sh` | ux-patrol |

## Shared Docs

- [Project Status](../PROJECT-STATUS.md) — delivery log + branch map
- [Parity Checklist](../parity-checklist.md) — what is actually done
- [Roadmap](../roadmap.md) — waves and follow-ups
- [Follow-ups PR #7](../follow-ups-pr7.md) — open security items

## Merge Gate

Do not merge when any of these verdicts are active:

- `ledger-hawk` → BLOCK
- `gate-keeper` → BLOCK
- `regress-ranger` → BLOCK
- `hardtest.sh` → any BLOCKER fail
- `doc-janitor` → BLOCK DOC CLAIM
- `ux-patrol` → BLOCK USABILITY

**Last full gate pass:** 2026-06-14 (`yarn quality:hardening` after PR #7 merge)
