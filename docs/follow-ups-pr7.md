# Follow-ups after PR #7 merge

> **PR #7 merged:** 2026-06-14 into `cursor/wave-4-messenger-hr-e20d` (`ab71b59`).
>
> **Follow-up status:** ✅ **Complete** — closed in Phase E5 (`cursor/phase-5-hardening-8e6d`, 2026-06-16).

| ID | Priority | Title | Status |
|----|----------|-------|--------|
| [FU-1](#fu-1-p1--do-not-trust-jwt-role-claims) | **P1** | Do not trust JWT role claims | ✅ Done |
| [FU-2](#fu-2-p1--csrf-protection-for-cookie-auth) | **P1** | CSRF protection for mutating routes | ✅ Done |
| [FU-3](#fu-3-p2--normalize-race-conflict-status-codes) | **P2** | Normalize race conflict → 409 | ✅ Done |

**Evidence:** `scripts/quality/review-audit.sh`, `yarn quality:hardening` — 2026-06-16.

---

## FU-1 (P1) — Do not trust JWT role claims

### Finding

Forged JWT with `role: OWNER` (invalid `userId` / `storeId`) → `GET /api/reports/export` returns **200**. Server trusts role and permission claims from the token.

### Fix

1. JWT carries **identity only** (`userId`, optionally `storeId`) — not authoritative `role` or `canExportReports`.
2. Every authenticated request: load user from DB → `toAuthUser(dbUser)`.
3. Missing/inactive user → **401**. Role checks use DB record only.

### Acceptance criteria

- [x] Forged OWNER JWT with wrong `userId` → **401** or **403** on export, unlock, audit, etc.
- [x] DB role change effective on next request without re-login.
- [x] `review-audit.sh` forged-role test expects block (not 200).
- [x] `yarn quality:hardening` passes.

### Out of scope

- Refresh tokens / full session store redesign.

---

## FU-2 (P1) — CSRF protection for cookie auth

### Finding

Mutating POST with valid session cookie succeeds without CSRF token. `SameSite=Lax` + CORS reduce browser risk but are not sufficient alone.

### Fix (choose or combine)

**Option A — Double-submit CSRF** ✅ implemented

- Issue `csrf` cookie (JS-readable) on login or first GET.
- Require matching `X-CSRF-Token` on `POST`/`PATCH`/`DELETE`.
- Validate in middleware before handlers.

**Option B — Origin / Referer enforcement**

- Mutating routes: `Origin` or `Referer` must match `CORS_ORIGINS`.
- Missing/invalid → **403**.

Update `src/components/widgets/donutit/donutit-api.js` to send token/header on mutations.

### Acceptance criteria

- [x] Valid `token` cookie + missing CSRF / bad Origin → **403**.
- [x] Normal UI mutations still work after login.
- [x] `review-audit.sh` CSRF scenario updated.
- [x] `.env.example` documents `CSRF_ENFORCE` or similar if gated.

### Out of scope

- Replacing cookie auth.

---

## FU-3 (P2) — Normalize race conflict status codes

### Finding

Money-safe, but inconsistent second-response codes on parallel/idempotent retries:

| Flow | 2nd response today | Target |
|------|-------------------|--------|
| Pawn interest | `409` | `409` ✓ |
| Pawn redeem | `404` | `409` |
| POS void | `400` | `409` |
| Messenger deliver | `400` | `409` |
| Daily-close lock | `409` | `409` ✓ |

### Fix

- **Conflict / already-final-state → `409`** with stable error message.
- `redeemPawnTicket`: ticket exists but not `ACTIVE` → `409` (not `404`).
- `voidPosBill`: already `VOIDED` → `409`.
- `markDeliveryDelivered`: already `DELIVERED` → `409`.
- True unknown id → remains **404**.

### Acceptance criteria

- [x] `review-audit.sh` parallel scenarios expect `200+409` (not `404`/`400`).
- [x] No ledger/money semantic change.
- [x] `yarn quality:hardening` passes.

### Out of scope

- Schema changes.
- Pawn interest cooldown / `updateMany` logic.

---

## Verification commands

```bash
yarn db:seed
yarn quality:hardening
bash scripts/quality/review-audit.sh
```

**Completed:** 2026-06-16 — Phase E5 merged to `main`.
