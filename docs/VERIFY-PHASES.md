# Ponytail Verify (V) — Phase Evidence Ledger

> บันทึกหลักฐาน V — Verify ครบทุกเฟส E1–E5  
> Last run: **2026-06-16** on `main`

## นิยาม V (ponytail verify)

| ชั้น | รายการ |
|------|--------|
| **Automated gate** | คำสั่ง quality ตามเฟส (build, smoke, ux, api, hardening, …) |
| **Ponytail review** | ตาราง net lines / abstractions ใน PR |
| **Manual / SPA** | E1: navigate POS → Inventory → POS ไม่ leak (ใช้ `yarn quality:spa` แทน manual) |

---

## สรุปต่อ PR

| PR | Phase | Automated | Ponytail PR | SPA / Manual | สถานะ V |
|----|-------|-----------|-------------|--------------|---------|
| [#11](https://github.com/nutnutt1111/cleopatra/pull/11) | E1 | `build` + `smoke` ✅ | ✅ | `quality:spa` 24/24 ✅ | **ครบ** |
| [#12](https://github.com/nutnutt1111/cleopatra/pull/12) | E2 | `build` + `smoke` + `ux` ✅ | ✅ | — | **ครบ** |
| [#13](https://github.com/nutnutt1111/cleopatra/pull/13) | E3 | `build` + `smoke` + `ux` + `audit:extended` ✅ | ✅ | demo routes ✅ | **ครบ** |
| [#14](https://github.com/nutnutt1111/cleopatra/pull/14) | E4 | `quality:api` 20/20 + `hardening` ✅ | ✅ (retro) | — | **ครบ** |
| [#15](https://github.com/nutnutt1111/cleopatra/pull/15) | E5 | `hardening` + `review` + `money` ✅ | ✅ | — | **ครบ** |

---

## E1 — PR #11

```bash
yarn build                    # PASS
yarn quality:smoke            # 10/10 routes
yarn quality:spa              # 24/24 (SPA nav simulation)
```

- Ponytail: net **-169** lines, 2 abstractions (`donutit-init.js`, `bindOnce.js`)
- Manual SPA checklist → automated ใน `scripts/quality/spa-verify.sh`

---

## E2 — PR #12

```bash
yarn build                    # PASS
yarn quality:smoke            # 10/10
yarn quality:ux               # 37 pass, 3 nits
```

---

## E3 — PR #13

```bash
yarn build                    # PASS (66 HTML in dist/)
yarn quality:smoke            # 10/10
yarn quality:ux               # 37 pass
yarn quality:audit:extended   # template 7/7, sidebar 8/8 DonutiT links
```

Demo routes (chart + Shiki):

| Route | HTTP |
|-------|------|
| `/pages/index-crypto.html` | 200 |
| `/pages/content/code-blocks.html` | 200 |

Ponytail: net **~-484** lines, single chart lib (Chart.js)

---

## E4 — PR #14

```bash
yarn quality:api              # 20 pass, 0 fail (1 skip: no completed bill)
yarn quality:hardening        # ALL PASS
```

Ponytail (retroactive):

| Metric | Value |
|--------|-------|
| Net lines | ~-120 (`server/index.ts` slimmer) |
| New modules | `routes/auth.ts`, `lib/types.ts`, `domain-error.ts`, `error-handler.ts` |
| Security semantics | ไม่เปลี่ยน (FU-1–3 อยู่ E5) |

---

## E5 — PR #15

```bash
yarn db:seed
yarn quality:hardening        # ALL PASS
yarn quality:review           # 14 pass, 0 fail, 2 warn
yarn quality:money            # PASS
```

---

## คำสั่งรวม (regression บน main)

```bash
yarn quality:spa              # E1 SPA verify
yarn quality:audit:extended   # E3 extended + Cleopatra demos
yarn quality:hardening        # Wave 5 gate
yarn quality:review           # race + auth
yarn quality:money            # DB invariants
```

Report ล่าสุด: `docs/quality/reports/audit-2026-06-16T075126Z.md`
