# Employee Login (Supabase + PIN)

ระบบเข้าสู่ระบบพนักงานที่ใช้ **Supabase Auth** เป็นหลัก และ **PIN 6 หลัก** เป็น quick unlock บนอุปกรณ์เดิม

## Architecture

```
Primary Auth (Supabase)          Quick Unlock (Device PIN)
────────────────────────         ──────────────────────────
Email + Password                 6-digit PIN + device_id
Session / refresh token          PBKDF2 hash stored in DB
Required for first login         Optional gate on return visits
```

### Flow

1. **First visit** → `/login` → Email + Password (Supabase)
2. **After login** → `/set-pin` → Set + confirm 6-digit PIN
3. **Return visit (same device)** → `/enter-pin` → PIN unlock → dashboard
4. **5 wrong PINs** → clear device PIN → fallback to email login
5. **Session expired** → after correct PIN, redirect to email login

## Setup

### 1. Environment variables

```bash
cp .env.example .env
```

Fill in:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_AUTH_REDIRECT=/pages/index.html
```

### 2. Run Supabase migration

Apply `supabase/migrations/20250614000000_employee_device_pins.sql` in Supabase SQL Editor or via CLI:

```bash
supabase db push
```

This creates:

- `employee_device_pins` table (hashed PIN per user + device)
- RLS policies (users access own rows only)
- `verify_device_pin()` RPC for PIN verification without exposing hashes

### 3. Create employee users

Create users in Supabase Auth (Dashboard → Authentication → Users) with email + password.

### 4. Start dev server

```bash
npm run dev
```

Open: http://localhost:3003/login

### 5. Settings

Settings แยกเป็น 2 กลุ่มใน Sidebar:

**บัญชีของฉัน**

| URL | Purpose |
|-----|---------|
| `/pages/settings/profile.html` | โปรไฟล์ของฉัน (ชื่อ, อีเมล, บทบาท) |
| `/pages/settings/security.html` | ความปลอดภัย / PIN 6 หลัก |
| `/pages/settings/appearance.html` | Accent color + Light/Dark mode |

**จัดการระบบ** (Admin / Manager)

| URL | Purpose |
|-----|---------|
| `/pages/settings/employees.html` | รายชื่อพนักงานทั้งหมด |
| `/pages/settings/employees-new.html` | เพิ่มพนักงานใหม่ |
| `/pages/settings/roles.html` | สิทธิ์การใช้งาน (placeholder) |

Legacy URLs redirect automatically:

- `/pages/settings/employee.html` → `profile.html`
- `/pages/settings/theme.html` → `appearance.html`

## Routes

| URL | Purpose |
|-----|---------|
| `/login` | Email + password login |
| `/set-pin` | First-time PIN setup (requires Supabase session) |
| `/enter-pin` | Quick unlock with PIN |
| `/forgot-password` | Password reset email |
| `/pages/settings/profile.html` | โปรไฟล์ของฉัน |
| `/pages/settings/security.html` | PIN / ความปลอดภัย |
| `/pages/settings/appearance.html` | Theme / การแสดงผล |
| `/pages/settings/employees.html` | รายชื่อพนักงาน (Admin/Manager) |

## Files

```
src/
  login.html, set-pin.html, enter-pin.html, forgot-password.html
  js/auth/
    config.js          # Env + route config
    supabase.js        # Supabase client + auth methods
    device.js          # Device ID + local PIN registration
    pin-crypto.js      # PBKDF2 hash + validation
    pin-service.js     # DB operations for PIN
    auth-flow.js       # Navigation + flow helpers
    login.js           # Login page logic
    set-pin.js         # Set PIN page logic
    enter-pin.js       # Enter PIN page logic
    forgot-password.js # Reset password logic
    session.js         # Logout handler
  components/auth/
    auth-start.html    # Minimal auth layout
    auth-end.html
    pin-keypad.js      # iPhone-style PIN keypad
supabase/migrations/
  20250614000000_employee_device_pins.sql
.env.example
```

## Security notes

- PIN is **never** stored as plain text — PBKDF2-SHA256 (100k iterations)
- PIN does **not** replace Supabase auth — it is a device quick-unlock gate only
- If Supabase session expires, user must re-authenticate with email
- `verify_device_pin` RPC uses `SECURITY DEFINER` and does not expose stored hashes via SELECT
- Do not use `user_metadata` for authorization — use RLS with `auth.uid()`
- PIN salt is cached locally for offline hash computation; clearing browser data requires email login to re-register device PIN
