# Quality System — DonutiT Cleopatra

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

**Dev server:** [http://localhost:3003](http://localhost:3003)

```bash
yarn dev                    # เปิดเซิร์ฟเวอร์พอร์ต 3003
yarn quality:audit          # รันเอเจนต์ทั้ง 7
yarn quality:audit:extended # audit + ตรวจเพิ่ม (build, sidebar, ภาษาไทย, UX)
yarn quality:smoke          # smoke test route อย่างเดียว
```

Config: `scripts/quality/config.sh`

## Shared Docs

- [Parity Checklist](../parity-checklist.md) — what is actually done
- [Roadmap](../roadmap.md) — planned waves and dependencies

## Merge Gate

Do not merge to main when any of these verdicts are active:

- `ledger-hawk` → BLOCK
- `gate-keeper` → BLOCK
- `regress-ranger` → BLOCK
- `doc-janitor` → BLOCK DOC CLAIM
- `ux-patrol` → BLOCK USABILITY
