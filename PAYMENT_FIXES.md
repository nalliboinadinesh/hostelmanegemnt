# Payment Logic Bug Fixes

Date: June 2026  
Files changed: `controller/paymentController.js`, `cron/feeStatusCron.js`, `cron/paymentReminderCron.js`

---

## BUG-3 — Paid tenants reverted to pending every month
**File:** `cron/feeStatusCron.js`  
**Severity:** High

**Problem:**  
The cron generated a new unpaid payment cycle for ALL tenants every month, including those whose `paymentStatus` was already `"paid"`. This immediately made the tenant's feeStatus show an unpaid month, which caused `paymentStatus` to flip back to `"pending"` the next time any sync ran.

**Fix:**  
Skip cycle generation entirely for tenants with `paymentStatus === 'paid'`:
```js
// Before
for (const tenant of tenants) {
  const lastPayment = await Payment.findOne(...);
  // generates cycle for all tenants including paid ones
}

// After
for (const tenant of tenants) {
  if (tenant.paymentStatus === 'paid') continue; // skip paid tenants
  ...
}
```

---

## BUG-4 — New feeStatus entry hardcoded as isPaid: false for all tenants
**File:** `cron/feeStatusCron.js`  
**Severity:** High

**Problem:**  
When the cron pushed a new month's entry into `feeStatus`, it always used `isPaid: false` regardless of the tenant's `paymentStatus`. This meant paid tenants got a `false` entry for the new month even though they shouldn't.

**Fix:**  
Two separate `updateMany` calls — one for pending tenants (pushes `isPaid: false`), one for paid tenants (pushes `isPaid: true`):
```js
// Before
await Tenant.updateMany(
  { feeStatus: { $not: { $elemMatch: { month, year } } } },
  { $push: { feeStatus: { month, year, isPaid: false } } }  // always false
);

// After — pending tenants
await Tenant.updateMany(
  { paymentStatus: { $ne: 'paid' }, feeStatus: { $not: { $elemMatch: { month, year } } } },
  { $push: { feeStatus: { month, year, isPaid: false } } }
);

// After — paid tenants
await Tenant.updateMany(
  { paymentStatus: 'paid', feeStatus: { $not: { $elemMatch: { month, year } } } },
  { $push: { feeStatus: { month, year, isPaid: true } } }
);
```

---

## BUG-5 — Redundant "extra safety" block in paymentController
**File:** `controller/paymentController.js`  
**Severity:** Medium (code quality)

**Problem:**  
After building `feeStatus` from all payments, there was an extra block:
```js
if (tenant.paymentStatus === 'paid') {
  tenant.feeStatus = tenant.feeStatus.map(f => ({ ...f, isPaid: true }));
}
```
This block can never actually do anything — `paymentStatus` is only set to `'paid'` when `feeStatus.every(f => f.isPaid)` is already `true`. So mapping them to `true` again is a no-op that added confusion.

**Fix:** Removed the block entirely.

---

## BUG-6 — N+1 DB queries in paymentReminderCron
**File:** `cron/paymentReminderCron.js`  
**Severity:** Medium (performance)

**Problem:**  
For each tenant with overdue payments, the cron fired 3 separate DB queries:
- `Tenant.findById(tenantId)`
- `Hostel.findById(hostelId)`
- `Room.findById(tenant.roomId)`

For 50 tenants with overdue payments = 150 DB queries per run.

**Fix:**  
Batch-fetch all tenants, hostels, and rooms outside the loop in 3 total queries. Build lookup maps by ID and reference them in the loop:
```js
// Before — 3 queries per tenant inside loop
for (const [tenantId, ...] of tenantMap) {
  const tenant = await Tenant.findById(tenantId);
  const hostel = await Hostel.findById(hostelId);
  const room   = await Room.findById(tenant.roomId);
}

// After — 3 total queries, lookup maps used inside loop
const [tenants, hostels, rooms] = await Promise.all([
  Tenant.find({ _id: { $in: tenantIds } }).lean(),
  Hostel.find({}).lean(),
  Room.find({}).lean(),
]);
const tenantById = Object.fromEntries(tenants.map(t => [t._id.toString(), t]));
const hostelById = Object.fromEntries(hostels.map(h => [h._id.toString(), h]));
const roomById   = Object.fromEntries(rooms.map(r => [r._id.toString(), r]));
```

---

## BUG-7 — Per-tenant DB queries in feeStatusCron
**File:** `cron/feeStatusCron.js`  
**Severity:** Medium (performance)

**Problem:**  
For each tenant, the cron fired 2 DB queries:
1. `Payment.findOne({ tenantId }).sort({ periodEnd: -1 })` — find latest cycle
2. `Payment.findOne({ tenantId, periodStart: nextStart })` — check duplicate

For 100 tenants = 200 DB queries per cron run.

**Fix:**  
Single batch query fetching all payments for all tenants sorted desc, then group in memory:
```js
// Before — 2 queries per tenant
for (const tenant of tenants) {
  const lastPayment = await Payment.findOne({ tenantId: tenant._id }).sort({ periodEnd: -1 });
  const exists = await Payment.findOne({ tenantId: tenant._id, periodStart: nextStart });
}

// After — 1 query total, in-memory grouping
const allPayments = await Payment.find({ tenantId: { $in: tenantIds } })
  .sort({ periodEnd: -1 }).lean();

const latestPaymentMap = {};   // tenantId → latest payment
const existingStartsMap = {};  // tenantId → Set of periodStart timestamps

for (const p of allPayments) {
  const tid = p.tenantId.toString();
  if (!latestPaymentMap[tid]) latestPaymentMap[tid] = p;
  if (!existingStartsMap[tid]) existingStartsMap[tid] = new Set();
  existingStartsMap[tid].add(new Date(p.periodStart).getTime());
}
```

---

## Summary

| Bug | File | What was wrong | Impact |
|---|---|---|---|
| BUG-3 | `feeStatusCron.js` | New unpaid cycle generated for paid tenants every month | Paid tenants reset to pending daily |
| BUG-4 | `feeStatusCron.js` | New feeStatus month entry always `isPaid: false` | Paid tenants showed false unpaid month |
| BUG-5 | `paymentController.js` | Unreachable "extra safety" code block | Code confusion, no functional impact |
| BUG-6 | `paymentReminderCron.js` | N+1 DB queries (3 per tenant) in loop | Poor performance under load |
| BUG-7 | `feeStatusCron.js` | 2 DB queries per tenant in loop | Poor performance under load |
