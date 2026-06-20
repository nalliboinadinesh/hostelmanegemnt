# Bug Report — Hostel Management Backend

Analysed files: all controllers, models, routes, cron jobs, middleware, server.js  
Total issues found: **14**

---

## CRITICAL

---

### BUG-01 — `module.exports` declared before function in `authController.js`

**File:** `controller/authController.js`  
**Line:** 44

```js
module.exports = { registerOrLogin, sendTestMail }; // ← exported here

// POST /api/auth/test-mail
async function sendTestMail(req, res) { ... } // ← defined AFTER export
```

**Problem:**  
`module.exports` is placed before `sendTestMail` is defined. This only works because of JavaScript function hoisting on `function` declarations. If `sendTestMail` is ever refactored to an arrow function (`const sendTestMail = async ...`), the export will silently export `undefined` and the route will crash with "sendTestMail is not a function".

**Fix:** Move `module.exports` to the bottom of the file, after all function definitions.

---

### BUG-02 — Route conflict: `/single/:tenantId` shadowed by `/:hostelId` in `tenantRoutes.js`

**File:** `routes/tenantRoutes.js`  
**Lines:** 7–8

```js
router.get('/:hostelId', protect, getTenantsByHostel);   // registered first
router.get('/single/:tenantId', protect, getTenantById); // never reached
```

**Problem:**  
Express matches routes top-to-bottom. When `GET /api/tenant/single/abc123` is called, it matches `/:hostelId` first with `hostelId = "single"` — the `getTenantById` handler is **never reached**. This means fetching a single tenant by ID is completely broken.

**Fix:** Register the specific route `/single/:tenantId` **before** the wildcard `/:hostelId`.

```js
router.get('/single/:tenantId', protect, getTenantById); // must come first
router.get('/:hostelId', protect, getTenantsByHostel);
```

---

### BUG-03 — Route conflict: `/hostel/:hostelId` shadowed by `/:tenantId` in `paymentRoutes.js`

**File:** `routes/paymentRoutes.js`  
**Lines:** 6–7

```js
router.get('/hostel/:hostelId', protect, getPaymentsByHostel); // registered first ✓
router.get('/:tenantId', protect, getPaymentsByTenant);
```

**Status:** This specific order is correct — `/hostel/:hostelId` is registered before `/:tenantId` so it works fine. No action needed.

---

### BUG-04 — `feeStatusCron` date comparison misses same-day cycles

**File:** `cron/feeStatusCron.js`  
**Lines:** 10–13, 28

```js
const today = new Date();
today.setHours(0, 0, 0, 0); // midnight = start of today
// ...
if (periodEnd <= today)      // only true if cycle ended BEFORE today midnight
```

**Problem:**  
`today` is set to `00:00:00` (midnight start of today). A payment cycle whose `periodEnd` is today at `00:00:00` exactly will match, but any `periodEnd` stored with a time component (e.g. `2026-06-20T08:30:00Z`) will **not** match `<= today midnight`. The next cycle is never generated for that tenant until the following day's run.

**Fix:** Set `today` to end of day instead:

```js
const today = new Date();
today.setHours(23, 59, 59, 999); // end of today
```

---

### BUG-05 — No check for `vacantBeds` going negative in `roomController.js` update

**File:** `controller/roomController.js`  
**Lines:** ~107–112

```js
if (totalBeds !== undefined) {
  room.totalBeds = totalBeds;
  room.vacantBeds = totalBeds - room.occupiedBeds; // can produce negative number
}
```

**Problem:**  
If the owner reduces `totalBeds` below `occupiedBeds` (e.g. room has 3 occupied beds but owner sets `totalBeds` to 2), `vacantBeds` becomes `-1`. This corrupt state will cause `No vacant beds available` errors for new tenants even though logically the room is full, and analytics will show negative vacant bed counts.

**Fix:** Add a guard:

```js
if (totalBeds !== undefined) {
  if (totalBeds < room.occupiedBeds) {
    return res.status(400).json({ 
      message: `Cannot set totalBeds to ${totalBeds} — room currently has ${room.occupiedBeds} occupied beds` 
    });
  }
  room.totalBeds = totalBeds;
  room.vacantBeds = totalBeds - room.occupiedBeds;
}
```

---

## HIGH

---

### BUG-06 — Payment cycle generation creates one extra future cycle

**File:** `controller/tenantController.js` and `controller/temporaryTenantController.js`  
**Lines:** ~68–82 (tenantController)

```js
let cycleStart = new Date(joinedDate);
const today = new Date();
while (cycleStart <= today) {
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setDate(cycleEnd.getDate() + 30);
  cycles.push({ ... periodStart: cycleStart, periodEnd: cycleEnd ... });
  cycleStart = new Date(cycleEnd); // ← cycleStart becomes cycleEnd
}
```

**Problem:**  
When `cycleStart` advances to `cycleEnd`, the while condition `cycleStart <= today` is evaluated. If the last cycle's `periodEnd` falls exactly on today or past today, the loop exits correctly. But if `joinedDate` is today, one cycle is generated with `periodStart = today` and `periodEnd = today + 30`, which is correct. However if `joinedDate` is in the future, no cycles are generated but no error is returned either — the tenant is created with 0 payment cycles silently.

**Fix:** Add a future joinedDate check:

```js
if (new Date(joinedDate) > new Date()) {
  return res.status(400).json({ message: 'joinedDate cannot be in the future' });
}
```

---

### BUG-07 — `getPaymentsByHostel` makes N sequential DB queries (N+1 problem)

**File:** `controller/paymentController.js`  
**Lines:** ~54–75

```js
const tenants = await Tenant.find({ hostelId: ... });
const result = await Promise.all(
  tenants.map(async (tenant) => {
    const payments = await Payment.find({ tenantId: tenant._id }); // 1 query per tenant
  })
);
```

**Problem:**  
For a hostel with 50 tenants this fires 51 DB queries (1 for tenants + 50 for payments). Under load this will be slow and puts unnecessary pressure on MongoDB.

**Fix:** Fetch all payments in one query and group in memory:

```js
const tenants = await Tenant.find({ hostelId: req.params.hostelId }, '...');
const tenantIds = tenants.map(t => t._id);
const allPayments = await Payment.find({ tenantId: { $in: tenantIds } }).sort({ periodStart: 1 });

// group payments by tenantId
const paymentMap = {};
for (const p of allPayments) {
  const tid = p.tenantId.toString();
  if (!paymentMap[tid]) paymentMap[tid] = [];
  paymentMap[tid].push(p);
}
```

---

### BUG-08 — Payment reminder cron fires for future cycles

**File:** `cron/paymentReminderCron.js`  
**Lines:** ~25–30

```js
const today = new Date();
today.setHours(23, 59, 59, 999);

const unpaidPayments = await Payment.find({
  isPaid: false,
  periodStart: { $lte: today }, // anything started before end of today
});
```

**Problem:**  
`periodStart: { $lte: today }` means any cycle that **started** today or earlier is included in reminders. A cycle that started today (the tenant's very first day) will immediately trigger a payment reminder email on the same day the tenant joins, which is confusing and incorrect.

**Fix:** Only send reminders for cycles that are actually overdue — i.e. `periodEnd` is past today:

```js
const unpaidPayments = await Payment.find({
  isPaid: false,
  periodEnd: { $lte: today }, // cycle has already ended = genuinely overdue
});
```

---

### BUG-09 — `feeStatus` and payment cycles are out of sync

**File:** `controller/tenantController.js` + `cron/feeStatusCron.js`

**Problem:**  
Two separate systems track payment state:
1. `Payment` collection — 30-day cycles, updated via `PUT /api/payment/:paymentId`
2. `tenant.feeStatus[]` — monthly entries, updated by the fee cron and payment update

When a payment is marked paid via `PUT /api/payment/:paymentId`, it syncs `feeStatus` for the month of `periodStart`. But when the cron generates a new cycle, it pushes a new `feeStatus` entry for the **current calendar month**, not the cycle's month. These can diverge — a tenant can have `feeStatus` entries with no matching `Payment` record and vice versa.

**Impact:** `paymentStatus` on a tenant can be wrong. Analytics `paidTenants` count may be inaccurate.

**Recommendation:** Pick one source of truth. The `Payment` collection is the authoritative record. `feeStatus` should only be derived from it, not maintained independently by the cron.

---

## MEDIUM

---

### BUG-10 — `generateFormToken` does not verify hostel ownership

**File:** `controller/temporaryTenantController.js`  
**Lines:** ~19–30

```js
const generateFormToken = async (req, res) => {
  const { hostelId } = req.body;
  const hostel = await Hostel.findById(hostelId); // just checks existence, not ownership
  const token = jwt.sign({ hostelId }, process.env.JWT_SECRET, { expiresIn: 900 });
  res.status(200).json({ token, ... });
};
```

**Problem:**  
This endpoint has no `protect` middleware and no ownership check. Anyone who knows a valid `hostelId` can generate a form token for any hostel, allowing them to submit fake tenant registrations for hostels they don't own.

**Fix:** Add `protect` middleware to this route and verify the hostel belongs to the authenticated owner:

```js
// In temporaryTenantRoutes.js
router.post('/generate-token', protect, generateFormToken);

// In controller
const hostel = await Hostel.findOne({ _id: hostelId, ownerId: req.owner._id });
if (!hostel) return res.status(403).json({ message: 'Unauthorized' });
```

---

### BUG-11 — `submitTenantForm` does not check for duplicate pending submission

**File:** `controller/temporaryTenantController.js`  
**Lines:** ~55–80

**Problem:**  
A tenant can submit the registration form multiple times using the same token (the token is valid for 15 minutes). Each submission creates a new `TemporaryTenant` record for the same person/room. The owner sees duplicate pending applications with no way to tell them apart.

**Fix:** Check for an existing temporary tenant with the same `phoneNumber` in the same hostel before creating:

```js
const existing = await TemporaryTenant.findOne({ hostelId, phoneNumber });
if (existing) {
  return res.status(400).json({ message: 'A registration with this phone number is already pending' });
}
```

---

### BUG-12 — Analytics `todayCollection` and `monthlyCollection` will always be 0 if `paymentDate` is null

**File:** `controller/hostelController.js`  
**Lines:** ~33–40

```js
const todayCollection = filteredPayments
  .filter(p => p.isPaid && p.paymentDate >= todayStart && p.paymentDate < todayEnd)
  .reduce((sum, p) => sum + p.amount, 0);
```

**Problem:**  
The `Payment` model has `paymentDate` as optional (no `required: true`). If an owner marks a payment as `isPaid: true` without providing a `paymentDate`, then `p.paymentDate` is `undefined`. `undefined >= todayStart` is `false`, so this payment is **excluded from all collection stats** even though it was paid.

**Fix:** Default `paymentDate` to `new Date()` in `updatePayment` when `isPaid` is set to `true` and no `paymentDate` is provided:

```js
// In paymentController.js updatePayment
if (isPaid === true && !paymentDate && !payment.paymentDate) {
  payment.paymentDate = new Date();
}
```

---

### BUG-13 — `dashboardController` room is fetched without ownership check

**File:** `controller/dashboardController.js`  
**Lines:** ~47–50

```js
const [room, payments, tickets] = await Promise.all([
  Room.findById(tenant.roomId).lean(), // no ownership verification
  ...
]);
```

**Problem:**  
While the tenant and hostel are verified from the JWT payload, the room is fetched directly by ID without confirming it belongs to the correct hostel. If `tenant.roomId` was tampered with in the DB, a room from a different hostel could be leaked.

**Fix:** Scope the room query to the hostel:

```js
Room.findOne({ _id: tenant.roomId, hostelId }).lean()
```

---

### BUG-14 — `healthCheckCron` serves no functional purpose in production

**File:** `cron/healthCheckCron.js`

```js
cron.schedule('*/12 * * * *', () => {
  console.log(`[HEALTH] Server is alive at ${new Date().toISOString()}`);
});
```

**Problem:**  
This cron only writes to stdout. It was originally designed to ping the server to prevent Render's free tier from sleeping. Since the app is now running on EC2 (always-on), this cron is pointless and just adds noise to the logs every 12 minutes.

**Recommendation:** Remove this cron entirely from `server.js` and delete `healthCheckCron.js`. Use a proper health check endpoint (`GET /health`) instead if needed.

---

## Summary Table

| # | Severity | File | Issue |
|---|---|---|---|
| BUG-01 | Critical | `authController.js` | `module.exports` before function — fragile, breaks if refactored |
| BUG-02 | Critical | `routes/tenantRoutes.js` | Route conflict — `GET /single/:id` never reached |
| BUG-04 | Critical | `cron/feeStatusCron.js` | Wrong date comparison — cycles not generated on time |
| BUG-05 | Critical | `controller/roomController.js` | `vacantBeds` can go negative |
| BUG-06 | High | `controller/tenantController.js` | Future `joinedDate` creates 0 cycles silently |
| BUG-07 | High | `controller/paymentController.js` | N+1 DB queries on payment list |
| BUG-08 | High | `cron/paymentReminderCron.js` | Reminders sent for cycles that just started |
| BUG-09 | High | `paymentController` + `feeStatusCron` | Dual payment tracking systems out of sync |
| BUG-10 | Medium | `temporaryTenantController.js` | `generateFormToken` has no auth — anyone can generate |
| BUG-11 | Medium | `temporaryTenantController.js` | Duplicate form submissions allowed |
| BUG-12 | Medium | `controller/hostelController.js` | Analytics zero when `paymentDate` is null |
| BUG-13 | Medium | `controller/dashboardController.js` | Room fetched without hostel scope |
| BUG-14 | Low | `cron/healthCheckCron.js` | Useless cron on EC2, just log noise |
