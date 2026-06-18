# seed-smith Coverage — DonutiT

> Verified by `yarn quality:seed` after `yarn db:seed`

## Dev Accounts

| Email | Role | Password |
|-------|------|----------|
| owner@donutit.local | OWNER | donutit-dev |
| manager@donutit.local | MANAGER | donutit-dev |
| staff@donutit.local | STAFF | donutit-dev |
| hr@donutit.local | HR | donutit-dev |

## Covered Flows

| Flow | Seed evidence |
|------|---------------|
| POS cash sale | Split-payment bill (cash + transfer) |
| POS split payment | 2 payment channels on sample bill |
| POS void | (runtime test in api-smoke — staff discount blocked) |
| Pawn interest | PAWN ticket with 1 interest payment (transfer detail) |
| Pawn redeem | (runtime test available via API) |
| Customer credit | 2 customers with credit limits |
| Credit limit zero | `creditLimitCents=0` means no credit sales until limit is set > 0 |
| Installment | Credit sale 3 installments + 1 partial payment |
| Inventory serialized | Phone with 2 serials (1 sold) |
| Inventory quantity | Cable qty 50→49 after sale |
| Messenger delivered | 1 delivered job (fee posted as **INCOME**) |
| Messenger pending | 1 pending delivery job |
| Cashflow ledger | 4+ manual entries + module postings |
| Daily close | 1 locked close (2 days ago) |
| HR employees | 2 employees |
| HR payroll | 1 draft payroll run (27,000 บาท) |

## Reset Commands

```bash
yarn db:reset    # migrate reset + seed
# หรือ
yarn db:seed     # re-seed บน DB ปัจจุบัน
```

## Prerequisites for verification

```bash
yarn dev         # donutit-cleopatra :3005 (API + React, for route/UX checks)
yarn quality:seed
yarn quality:hardening   # full gate
```

See also [PROJECT-STATUS.md](../PROJECT-STATUS.md) for complete delivery log.
