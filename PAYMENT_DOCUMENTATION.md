# Payment System Documentation
## Hostel Management — Payment Module

---

## 1. Overview

The payment system tracks rent on a **30-day cycle** basis starting from each tenant's `joinedDate`. Every cycle has an `isPaid` flag (default `false`) that the owner updates manually when rent is collected.

---

## 2. Data Model

### Payment Collection (`payments`)

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Auto-generated unique ID |
| `hostelId` | ObjectId | Reference to Hostel |
| `tenantId` | ObjectId | Reference to Tenant |
| `amount` | Number | Rent amount for this cycle |
| `periodStart` | Date | Start date of the 30-day cycle |
| `periodEnd` | Date | End date (periodStart + 30 days) |
| `isPaid` | Boolean | Payment status (default: `false`) |
| `paymentMethod` | String | e.g. cash, upi, bank transfer |
| `note` | String | Optional note |
| `createdAt` | Date | Auto-managed by Mongoose |
| `updatedAt` | Date | Auto-managed by Mongoose |

### feeStatus in Tenant Model

Each tenant also carries a `feeStatus` array for monthly tracking:

| Field | Type | Description |
|-------|------|-------------|
| `month` | Number | Month number (1–12) |
| `year` | Number | Year (e.g. 2026) |
| `isPaid` | Boolean | Whether fee is paid for that month |

---

## 3. How Payment Cycles Are Generated

### On Tenant Creation

When a tenant is created with a `joinedDate` and `monthlyFee`, the system automatically generates all 30-day payment cycles from `joinedDate` up to today — all marked `isPaid: false`.

**Example:**
- joinedDate: `2026-01-01`
- Today: `2026-05-16`
- Cycles generated: 5 cycles (Jan→Feb, Feb→Mar, Mar→Apr, Apr→May, May→Jun)

```
Cycle 1: 2026-01-01 → 2026-01-31  isPaid: false
Cycle 2: 2026-01-31 → 2026-03-02  isPaid: false
Cycle 3: 2026-03-02 → 2026-04-01  isPaid: false
Cycle 4: 2026-04-01 → 2026-05-01  isPaid: false
Cycle 5: 2026-05-01 → 2026-05-31  isPaid: false
```

### On Tenant Deletion

When a tenant is deleted, all associated payment records are also deleted (cascade delete).

---

## 4. Automated Cron Job

**Schedule:** `0 0 1 * *` — Runs at **00:00 on the 1st of every month**

**What it does:**

1. Adds a new `feeStatus` entry `{ month, year, isPaid: false }` to every tenant who doesn't already have one for the current month/year.

2. Finds the latest payment cycle for each tenant and creates the next 30-day cycle automatically — prevents duplicates by checking if the cycle already exists.

**Location:** `cron/feeStatusCron.js`

---

## 5. API Endpoints

> All endpoints require `Authorization: Bearer <token>` header.

---

### 5.1 Get Payments by Tenant

**GET** `/api/payment/:tenantId`

Returns all 30-day payment cycles for a specific tenant with a paid/unpaid summary.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response `200`:**
```json
{
  "tenantId": "664e5d...",
  "tenantName": "John Doe",
  "monthlyFee": 5000,
  "joinedDate": "2026-01-01T00:00:00.000Z",
  "totalCycles": 5,
  "paid": 4,
  "unpaid": 1,
  "cycles": [
    {
      "_id": "665a1b...",
      "periodStart": "2026-01-01T00:00:00.000Z",
      "periodEnd": "2026-01-31T00:00:00.000Z",
      "amount": 5000,
      "isPaid": true,
      "paymentMethod": "cash",
      "note": "Paid on time"
    },
    {
      "_id": "665a1c...",
      "periodStart": "2026-01-31T00:00:00.000Z",
      "periodEnd": "2026-03-02T00:00:00.000Z",
      "amount": 5000,
      "isPaid": false,
      "paymentMethod": null,
      "note": null
    }
  ]
}
```

**Error Responses:**

| Status | Message |
|--------|---------|
| `401` | No token, authorization denied |
| `403` | Unauthorized |
| `404` | Tenant not found |
| `500` | Internal server error |

---

### 5.2 Get Payments by Hostel

**GET** `/api/payment/hostel/:hostelId`

Returns all tenants in a hostel with their complete payment cycle summary.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response `200`:**
```json
{
  "payments": [
    {
      "tenantId": "664e5d...",
      "tenantName": "John Doe",
      "phoneNumber": "9876543210",
      "joinedDate": "2026-01-01T00:00:00.000Z",
      "monthlyFee": 5000,
      "paid": 4,
      "unpaid": 1,
      "cycles": [
        {
          "_id": "665a1b...",
          "periodStart": "2026-01-01T00:00:00.000Z",
          "periodEnd": "2026-01-31T00:00:00.000Z",
          "amount": 5000,
          "isPaid": true
        }
      ]
    }
  ]
}
```

**Error Responses:**

| Status | Message |
|--------|---------|
| `401` | No token, authorization denied |
| `404` | Hostel not found or unauthorized |
| `500` | Internal server error |

---

### 5.3 Update Payment Status

**PUT** `/api/payment/:paymentId`

Marks a payment cycle as paid or unpaid. Only `isPaid`, `paymentMethod`, and `note` can be updated — amount and dates are locked.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "isPaid": true,
  "paymentMethod": "upi",
  "note": "Paid via GPay"
}
```

**All fields are optional:**

| Field | Type | Description |
|-------|------|-------------|
| `isPaid` | Boolean | `true` = paid, `false` = unpaid |
| `paymentMethod` | String | cash / upi / bank transfer / cheque |
| `note` | String | Any additional note |

**Response `200`:**
```json
{
  "message": "Payment updated successfully",
  "payment": {
    "_id": "665a1b...",
    "hostelId": "664b2a...",
    "tenantId": "664e5d...",
    "amount": 5000,
    "periodStart": "2026-01-01T00:00:00.000Z",
    "periodEnd": "2026-01-31T00:00:00.000Z",
    "isPaid": true,
    "paymentMethod": "upi",
    "note": "Paid via GPay",
    "updatedAt": "2026-05-16T10:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Message |
|--------|---------|
| `401` | No token, authorization denied |
| `403` | Unauthorized |
| `404` | Payment not found |
| `500` | Internal server error |

---

## 6. Payment Flow Diagram

```
Tenant Created
      │
      ▼
joinedDate + monthlyFee set?
      │
     YES
      │
      ▼
Generate 30-day cycles from joinedDate → today
All cycles: isPaid = false
      │
      ▼
Every month (1st, 00:00 — Cron Job)
      │
      ▼
New cycle added for next 30 days
isPaid = false
      │
      ▼
Owner collects rent
      │
      ▼
PUT /api/payment/:paymentId
{ isPaid: true, paymentMethod: "cash" }
      │
      ▼
Cycle marked as paid ✓
```

---

## 7. Route Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payment/:tenantId` | Required | Get all cycles for a tenant |
| GET | `/api/payment/hostel/:hostelId` | Required | Get all tenant payments in hostel |
| PUT | `/api/payment/:paymentId` | Required | Mark cycle paid/unpaid |

---

## 8. Notes

- Payment cycles are **immutable** — only `isPaid`, `paymentMethod`, and `note` can be changed after creation.
- Cycles are generated in sequence: each cycle starts exactly where the previous one ended.
- The cron job runs server-side automatically — no manual trigger needed.
- Deleting a tenant removes all their payment records permanently.
