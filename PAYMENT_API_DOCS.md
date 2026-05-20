# Payment API Documentation

**Base URL:** `http://localhost:4000`
> All endpoints require `Authorization: Bearer <token>` header.

---

## Overview

Payments are auto-generated as 30-day cycles starting from each tenant's `joinedDate`. Each cycle has an `isPaid` flag (default `false`). The owner updates a cycle when rent is collected.

**Cycle generation:**
- On tenant creation — all cycles from `joinedDate` to today are created
- Daily cron (00:00) — generates the next cycle when the current one ends

---

## Payment Model

Collection: `payments`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | Auto |
| `hostelId` | ObjectId | Ref: Hostel |
| `tenantId` | ObjectId | Ref: Tenant |
| `amount` | Number | Rent amount |
| `periodStart` | Date | Cycle start date |
| `periodEnd` | Date | Cycle end (start + 30 days) |
| `isPaid` | Boolean | default: false |
| `paymentMethod` | String | cash / upi / bank / cheque |
| `paymentDate` | Date | Actual date payment was made |
| `note` | String | Optional note |
| `createdAt` | Date | Auto |
| `updatedAt` | Date | Auto |

---

## APIs

---

### 1. Get Payments by Tenant

**GET** `/api/payment/:tenantId`

Returns all 30-day payment cycles for a tenant with paid/unpaid summary.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response `200`:**
```json
{
  "tenantId": "664e5d...",
  "tenantName": "John Doe",
  "monthlyFee": 6000,
  "joinedDate": "2026-05-01T00:00:00.000Z",
  "totalCycles": 1,
  "paid": 1,
  "unpaid": 0,
  "cycles": [
    {
      "_id": "6a0b24f2...",
      "periodStart": "2026-05-01T00:00:00.000Z",
      "periodEnd": "2026-05-31T00:00:00.000Z",
      "amount": 6000,
      "isPaid": true,
      "paymentMethod": "upi",
      "paymentDate": "2026-05-18T00:00:00.000Z",
      "note": "Paid via GPay"
    }
  ]
}
```

**Errors:**

| Status | Message |
|--------|---------|
| `401` | No token, authorization denied |
| `403` | Unauthorized |
| `404` | Tenant not found |
| `500` | Internal server error |

---

### 2. Get Payments by Hostel

**GET** `/api/payment/hostel/:hostelId`

Returns all tenants in a hostel with their complete payment cycle summaries.

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
      "joinedDate": "2026-05-01T00:00:00.000Z",
      "monthlyFee": 6000,
      "paid": 1,
      "unpaid": 0,
      "cycles": [
        {
          "_id": "6a0b24f2...",
          "periodStart": "2026-05-01T00:00:00.000Z",
          "periodEnd": "2026-05-31T00:00:00.000Z",
          "amount": 6000,
          "isPaid": true,
          "paymentMethod": "upi",
          "paymentDate": "2026-05-18T00:00:00.000Z",
          "note": "Paid via GPay"
        }
      ]
    }
  ]
}
```

**Errors:**

| Status | Message |
|--------|---------|
| `401` | No token, authorization denied |
| `404` | Hostel not found or unauthorized |
| `500` | Internal server error |

---

### 3. Update Payment

**PUT** `/api/payment/:paymentId`

Updates a payment cycle. Use this when the owner collects rent — mark it paid and record the method, date and amount.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body (all fields optional):**
```json
{
  "isPaid": true,
  "paymentMethod": "upi",
  "paymentDate": "2026-05-18",
  "amount": 6000,
  "note": "Paid via GPay"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `isPaid` | Boolean | `true` = paid, `false` = unpaid |
| `paymentMethod` | String | cash / upi / bank / cheque |
| `paymentDate` | Date | Date payment was received |
| `amount` | Number | Override amount if different |
| `note` | String | Any additional note |

**Response `200`:**
```json
{
  "message": "Payment updated successfully",
  "payment": {
    "_id": "6a0b24f2...",
    "hostelId": "6a086fb4...",
    "tenantId": "664e5d...",
    "amount": 6000,
    "periodStart": "2026-05-01T00:00:00.000Z",
    "periodEnd": "2026-05-31T00:00:00.000Z",
    "isPaid": true,
    "paymentMethod": "upi",
    "paymentDate": "2026-05-18T00:00:00.000Z",
    "note": "Paid via GPay",
    "createdAt": "2026-05-18T14:40:49.936Z",
    "updatedAt": "2026-05-18T15:00:00.000Z"
  }
}
```

**Errors:**

| Status | Message |
|--------|---------|
| `401` | No token, authorization denied |
| `403` | Unauthorized |
| `404` | Payment not found |
| `500` | Internal server error |

---

## API Quick Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payment/:tenantId` | Required | All cycles for a tenant |
| GET | `/api/payment/hostel/:hostelId` | Required | All tenant payments in hostel |
| PUT | `/api/payment/:paymentId` | Required | Update cycle — mark paid/unpaid |

---

## Cron Job

**File:** `cron/feeStatusCron.js`
**Schedule:** Daily at `00:00`

Checks every tenant's last payment cycle. If `periodEnd` is today or past, generates the next 30-day cycle with `isPaid: false`. Each tenant's cycle follows their own `joinedDate` — not a shared calendar date.
