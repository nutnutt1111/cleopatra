# Windows Local Setup — `C:\Users\HP\Projects\cleopatra`

> แอปหลัก: **http://localhost:3005** (`donutit-cleopatra`)

## ข้อมูลเก็บที่ไหนบ้าง

| ประเภท | ที่เก็บ | ใน Git? |
|--------|---------|--------|
| โค้ด UI + API | repo ทั้งหมด | ใช่ (branch `cursor/unified-port-3005-e20d`) |
| รหัสผ่าน / port | `.env` (copy จาก `.env.example`) | ไม่ (สร้างบนเครื่อง) |
| สินค้า, บิล, ลูกค้า | `prisma/dev.db` | ไม่ — สร้างด้วย `yarn db:seed` |
| Trade-in draft (POS→Inventory) | browser `localStorage` key `donutit:trade-in-drafts` | seed จากไฟล์ใน repo (ด้านล่าง) |

## วิธีเร็ว (PowerShell)

```powershell
cd C:\Users\HP\Projects\cleopatra
git fetch origin
git checkout cursor/unified-port-3005-e20d
git pull origin cursor/unified-port-3005-e20d
.\scripts\windows\sync-and-run.ps1
```

หรือรันครั้งแรก (clone + reset DB):

```powershell
.\scripts\windows\sync-and-run.ps1 -ResetDb
```

## ทำมือทีละขั้น

```powershell
cd C:\Users\HP\Projects\cleopatra
git fetch origin
git checkout cursor/unified-port-3005-e20d
git pull origin cursor/unified-port-3005-e20d

copy .env.example .env
yarn install
yarn --cwd apps/donutit-react install
yarn db:reset          # ข้อมูล demo ครบ (user, สินค้า, บิล)
yarn dev               # → http://localhost:3005
```

Login: `owner@donutit.local` / `donutit-dev`

## localStorage (Trade-in drafts)

ไฟล์ seed อยู่ที่:

```
apps/donutit-react/public/data/local-storage/trade-in-drafts.json
```

- เปิดแอปครั้งแรก (ยังไม่มี draft ใน browser) → โหลดจากไฟล์นี้เข้า `localStorage` อัตโนมัติ
- แก้ไฟล์ JSON แล้วลบ key ใน DevTools → Application → Local Storage:
  - `donutit:trade-in-drafts`
  - `donutit:local-storage-bootstrapped`
  - refresh หน้าเว็บ

### สำรอง draft จาก browser กลับเป็นไฟล์

ใน DevTools Console บน localhost:3005:

```javascript
copy(localStorage.getItem('donutit:trade-in-drafts') || '[]')
```

วางลงใน `trade-in-drafts.json` แล้ว commit ถ้าต้องการพกข้ามเครื่อง

## หมายเหตุ

- ต้องใช้ branch **`cursor/unified-port-3005-e20d`** — `main` ยังไม่มี React app บน :3005
- Legacy vanilla อยู่ที่ `:3006` (`yarn dev:legacy`) — ไม่ใช่แอปหลัก
