# DonutiT Cleopatra — Delivery Phases

> แผนงานหลังรวม Waves 0–5 + Ponytail บน `main`  
> หลักการ: **ponytail ก่อนเพิ่ม** — ลบ/ reuse ก่อนเขียนใหม่, ตรวจทุกเฟสก่อน merge

---

## ภาพรวม 4 ช่วงใหญ่

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  P — Plan   │ → │  E — Execute│ → │  V — Verify │ → │  D — Deliver│
│  วางแผน     │   │  ลงมือทำ    │   │  ponytail   │   │  จัดส่ง     │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
```

ทุก **Execution Phase (E0–E5)** วนผ่าน **Verify mini-gate (V)** ก่อนไปเฟสถัดไป  
**Deliver (D)** รวม quality:hardening + PR + doc-janitor

---

## สถานะปัจจุบัน (baseline)

| รายการ | สถานะ |
|--------|--------|
| `main` รวม DonutiT + Ponytail cleanup | ✅ `6902af5` |
| `.env` + `prisma/dev.db` + seed | ✅ |
| Dev servers `:3003` / `:3004` | ✅ |
| MCP (Figma, Linear, Prisma, Supabase, Vercel) | ✅ |
| Cleopatra design utilization | ~25–35% |
| Ponytail audit baseline | `PONYTAIL_AUDIT.md` |

---

## P — Plan (วางแผน) ✅ เฟสนี้

### เป้าหมาย
กำหนดลำดับงาน, ขอบเขต PR, และเกณฑ์ ponytail ก่อนแตะโค้ด

### ลำดับที่ตกลง (ห้ามสลับ)

| ลำดับ | ทำก่อน | เหตุผล |
|-------|--------|--------|
| 1 | **E1 Identity + Nav** | แก้ sidebar หลุด + SPA DonutiT — product ใช้ไม่ได้ |
| 2 | **E2 Design pass** | reuse Cleopatra widgets ก่อนลบ orphan |
| 3 | **E3 Ponytail P0/P1 frontend** | bundle + listener หลัง UI นิ่ง |
| 4 | **E4 Ponytail server** | HttpError, audit unify — ไม่กระทบหน้าตา |
| 5 | **E5 Hardening + FU-1–3** | security follow-ups จาก PR #7 |

### กฎ ponytail ตลอดโปรเจกต์
1. ลบก่อนเพิ่ม — orphan widget ลบ**หลัง** migrate reuse แล้ว
2. ทุก PR ต้องผ่าน `ponytail-review` (diff สั้นลงหรือ `Lean already. Ship.`)
3. Mark shortcut ด้วย `ponytail:` comment + upgrade path
4. ไม่แตะ money/auth โดยไม่รัน `ledger-hawk` / `gate-keeper` mindset

### Artifacts แผน
- [DELIVERY-PHASES.md](./DELIVERY-PHASES.md) (ไฟล์นี้)
- [PONYTAIL_AUDIT.md](../PONYTAIL_AUDIT.md) — baseline audit
- [parity-checklist.md](./parity-checklist.md) — module truth
- [follow-ups-pr7.md](./follow-ups-pr7.md) — security backlog

---

## E0 — Environment ✅ (เสร็จแล้ว)

| Task | สถานะ |
|------|--------|
| `cp .env.example .env` | ✅ |
| `yarn db:reset` + seed | ✅ |
| `yarn dev:all` (:3003/:3004) | ✅ |

**Verify:** `curl localhost:3003` → 200, login `owner@donutit.local` / `donutit-dev`

---

## E1 — Identity + Nav + SPA Fix

**Branch:** `cursor/phase-1-nav-spa-8e6d`  
**เป้าหมาย:** DonutiT ใช้งานได้จริงผ่าน sidebar + SPA

### งาน
- [ ] `donutit-init.js` — registry init บน `page:load` (ลบ inline `<script>` 7 หน้า)
- [ ] รวม `sidebar.json` → `sidebar.js` (เมนู DonutiT บน runtime)
- [ ] Rebrand `start.html`: Cleopatra → DonutiT (logo, ชื่อ)
- [ ] ซ่อน/แยก nav demo (Components, Email) — production mode
- [ ] Guard sidebar/navbar listeners (one-time bind)

### Ponytail gate (V1)
```
ponytail-review diff นี้
- inline script 7 หน้าลดลง?
- menuData ~190 บรรทัดลดลง?
- listener leak หาย?
net: -N lines possible
```

### Deliverable
- PR draft: "Phase 1: DonutiT nav, SPA init, branding"
- Manual: sidebar → `/pos` → ฟอร์มทำงาน (ไม่ต้อง hard refresh)
- `yarn quality:smoke` pass

---

## E2 — Design Pass (Cleopatra 25% → ~70%)

**Branch:** `cursor/phase-2-design-8e6d`  
**เป้าหมาย:** reuse widget Cleopatra ไม่เขียน HTML ใหม่ทั้งก้อน

### งาน
| หน้า | Reuse จาก Cleopatra |
|------|---------------------|
| Dashboard | `dashboard-header`, `metrics-row`, mini chart |
| Inventory | `inventory-stats`, `inventory-table`, `inventory-chart` |
| POS | `retail-header` pattern + table |
| Settings/Login | `extra/login.html` layout |
| ทุกหน้า | `ui-button`, `badge`, `skeleton`, `toast`, `modal` (void confirm) |

- [ ] Dashboard KPI จาก API จริง (ยอดขาย, สต็อกต่ำ, จำนำค้าง)
- [ ] Lucide icons ทั้งแอป (เลิก Remix ปน)
- [ ] Table: hover row, badge status, pagination
- [ ] Loading: skeleton แทน "กำลังโหลด..."

### Ponytail gate (V2)
```
ponytail-review — มี abstraction ใหม่ที่ไม่จำเป็นไหม?
- reuse partial แทน component class ใหม่?
- chart จำเป็นทุกหน้าไหม หรือ lazy per-route?
```

### Deliverable
- PR: "Phase 2: DonutiT design pass — Cleopatra widgets"
- Screenshot 4 หน้าหลัก (dashboard, pos, inventory, cashflow)
- `yarn quality:ux` pass

---

## E3 — Ponytail Frontend Cleanup

**Branch:** `cursor/phase-3-ponytail-fe-8e6d`  
**เป้าหมาย:** bundle เล็กลง, init ตามหน้า

### งาน
- [ ] ลบ auto-init blocks (~70 LOC) — `main.js` owner เดียว
- [ ] Page-scoped `import()` แทน init-all ใน `main.js`
- [ ] Lazy-load Shiki (docs routes only)
- [ ] เลือก chart lib เดียว (Chart.js หรือ Apex) + migrate
- [ ] รวม `chart-theme.js` (ลบ duplicate utils)
- [ ] ลบ orphan widget HTML **หลัง** E2 migrate แล้ว (~1,286 LOC)
- [ ] ลบ barrel `index.js` ที่ไม่ใช้

### Ponytail gate (V3)
```
ponytail-audit src/js src/components
ponytail-debt — harvest ponytail: comments
yarn build — bundle size เทียบก่อน/หลัง
```

### Deliverable
- PR: "Phase 3: Ponytail frontend — lazy init, one chart lib"
- อัปเดต `PONYTAIL_AUDIT.md` (Applied section)
- `yarn build` pass

---

## E4 — Ponytail Server Cleanup

**Branch:** `cursor/phase-4-ponytail-server-8e6d`  
**เป้าหมาย:** ~350–450 LOC ลดจาก server โดยไม่เปลี่ยน business logic

### งาน
- [ ] `HttpError` + Express error middleware (ลบ 8 error classes)
- [ ] Plain routers (ลบ factory DI)
- [ ] `writeAuditLog()` เดียว (ลบ ALS หรือ commit เต็ม)
- [ ] ลบ dead exports + label maps
- [ ] `nextPrefixedNumber()` แทน 5 wrappers
- [ ] ลบ pawn memory guards (trust DB)
- [ ] `parseBahtToCents` สม่ำเสมอทุก route

### Ponytail gate (V4)
```
ledger-hawk mindset — money paths ยังถูก?
yarn quality:api && yarn quality:money && yarn quality:hardtest
ponytail-review server/
```

### Deliverable
- PR: "Phase 4: Ponytail server simplification"
- `quality:hardening` pass

---

## E5 — Security + Production Readiness

**Branch:** `cursor/phase-5-hardening-8e6d`  
**เป้าหมาย:** ปิด FU-1–3 จาก [follow-ups-pr7.md](./follow-ups-pr7.md)

### งาน
- [ ] FU-1 / FU-2 / FU-3 ตาม parity doc
- [ ] Postgres migration path (optional — Supabase MCP)
- [ ] Vercel preview deploy (optional — Vercel MCP)
- [ ] `doc-janitor`: sync PROJECT-STATUS, parity-checklist, roadmap

### Ponytail gate (V5)
```
yarn quality:hardening
yarn quality:review
regress-ranger checklist
```

---

## V — Verify (ponytail ตรวจสอบ) — ใช้ทุก PR

### Checklist ก่อน merge ทุก PR

| # | คำสั่ง / การกระทำ | ผ่านเมื่อ |
|---|-------------------|----------|
| 1 | `ponytail-review` บน diff | `net: -N lines` หรือ `Lean already` |
| 2 | `yarn build` | exit 0 |
| 3 | `yarn quality:smoke` | routes 200 |
| 4 | Manual SPA test | sidebar navigate ไม่พัง |
| 5 | E4+ only: `yarn quality:hardening` | all green |

### Full audit (ท้าย E3 + E5)
```
ponytail-audit whole repo
ponytail-debt
อัปเดต PONYTAIL_AUDIT.md
```

---

## D — Deliver (จัดส่งผลงาน)

### ต่อ PR
1. Branch `cursor/phase-N-*-8e6d`
2. Commit ชัดเจน (หนึ่งเฟสต่อ PR)
3. Draft PR → `quality:smoke` ใน CI/description
4. อัปเดต `docs/PROJECT-STATUS.md` เมื่อเฟสจบ

### รอบสุดท้าย (หลัง E5)
| Artifact | ที่อยู่ |
|----------|--------|
| Production-ready `main` | GitHub |
| Ponytail audit ปิดงาน | `PONYTAIL_AUDIT.md` |
| Design เป้า ~70% Cleopatra | dashboard + 4 modules |
| Quality report | `docs/quality/reports/` |
| Deploy preview (ถ้าทำ) | Vercel URL |

### Definition of Done (โปรเจกต์)
- [ ] DonutiT ทุก module ใช้ผ่าน sidebar + SPA ได้
- [ ] Dashboard มี KPI + chart จริง
- [ ] `yarn quality:hardening` pass
- [ ] Ponytail audit: ไม่มี P0/P1 ค้าง
- [ ] `PROJECT-STATUS` ตรงความจริง

---

## Timeline แนะนำ (ลำดับ ไม่ใช่ปฏิทิน)

```
E0 ✅ → E1 (unblock) → E2 (beauty) → E3 (lean FE) → E4 (lean BE) → E5 (ship)
         ↑ ponytail V1    ↑ V2          ↑ V3           ↑ V4          ↑ V5 + D
```

**เริ่มที่ E1 ทันที** — ไม่รอ E3 ลบ orphan widgets ก่อน E2 reuse

---

## คำสั่งอ้างอิง

```bash
# Dev
yarn dev:all

# Quality
yarn quality:smoke
yarn quality:api
yarn quality:hardening

# Ponytail (ใน Cursor chat)
ponytail-review diff นี้
ponytail-audit
ponytail-debt
```
