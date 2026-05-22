# Tenant Dashboard API

**Base URL:** `http://localhost:4000` (local) / `https://hostelmanegemnt.onrender.com` (production)

---

## Overview

The Tenant Dashboard API allows a tenant to view their own hostel, room, and payment details using a JWT token that was sent to their email when their account was created.

No owner authentication is required — the JWT in the URL query param is the only credential needed.

---

## How the Token Works

When a tenant is created (via `POST /api/tenant/create` or `POST /api/temporary-tenant/approve/:id`), a welcome email is sent containing a dashboard link:

```
http://localhost:3000?token=<jwt>&hostelId=<id>&tenantId=<id>
```

The JWT is signed with `JWT_SECRET` and contains:
```json
{
  "hostelId": "6a0e99d89417ce2f00af00a1",
  "tenantId": "6a0f138964feb48e748bf76d"
}
```

The frontend reads `token` from the URL and passes it to this API.

---

## Endpoint

### Get Tenant Dashboard

**GET** `/api/dashboard?token=<jwt>`

No `Authorization` header required. The JWT is passed as a query parameter.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | String | Yes | JWT from the welcome email link |

**Response `200`:**
```json
{
  "tenant": {
    "id": "6a0f138964feb48e748bf76d",
    "name": "Sathish",
    "phoneNumber": "9000000001",
    "email": "gorugantisathish93@gmail.com",
    "occupation": "Student",
    "joinedDate": "2026-05-21T00:00:00.000Z",
    "paymentStatus": "pending"
  },
  "hostel": {
    "id": "6a0e99d89417ce2f00af00a1",
    "hostelName": "Test Hostel",
    "hostelType": "boys",
    "ownerName": "Test Owner",
    "ownerNumber": "9876543210",
    "email": "owner@example.com"
  },
  "room": {
    "id": "6a0e99d89417ce2f00af00a3",
    "roomNumber": "101",
    "roomType": "single",
    "totalBeds": 2
  },
  "payments": {
    "monthlyRent": 6000,
    "deposit": 12000,
    "totalDues": 6000,
    "paidCycles": 0,
    "unpaidCycles": 1,
    "lastPaidDate": null,
    "cycles": [
      {
        "_id": "6a0f138964feb48e748bf76e",
        "periodStart": "2026-05-21T00:00:00.000Z",
        "periodEnd": "2026-06-20T00:00:00.000Z",
        "amount": 6000,
        "isPaid": false,
        "paymentDate": null,
        "paymentMethod": null
      }
    ]
  }
}
```

---

## Response Fields

### `tenant`
| Field | Description |
|-------|-------------|
| `id` | Tenant's MongoDB ID |
| `name` | Full name |
| `phoneNumber` | Contact number |
| `email` | Email address |
| `occupation` | Occupation (if provided) |
| `joinedDate` | Date tenant joined |
| `paymentStatus` | `paid` or `pending` — synced from feeStatus |

### `hostel`
| Field | Description |
|-------|-------------|
| `id` | Hostel's MongoDB ID |
| `hostelName` | Name of the hostel |
| `hostelType` | Type (boys / girls / co-living) |
| `ownerName` | Owner's name |
| `ownerNumber` | Owner's contact number |
| `email` | Owner's contact email |

### `room`
| Field | Description |
|-------|-------------|
| `id` | Room's MongoDB ID |
| `roomNumber` | Room number (e.g. "101") |
| `roomType` | Type (single / double / etc.) |
| `totalBeds` | Total beds in the room |

### `payments`
| Field | Description |
|-------|-------------|
| `monthlyRent` | Monthly fee amount in ₹ |
| `deposit` | Security deposit paid |
| `totalDues` | Total unpaid amount across all cycles |
| `paidCycles` | Number of 30-day cycles fully paid |
| `unpaidCycles` | Number of 30-day cycles pending |
| `lastPaidDate` | Date of last payment (`null` if never paid) |
| `cycles` | Array of all 30-day payment cycles |

### `payments.cycles[]`
| Field | Description |
|-------|-------------|
| `_id` | Payment record ID |
| `periodStart` | Cycle start date |
| `periodEnd` | Cycle end date (start + 30 days) |
| `amount` | Amount for this cycle |
| `isPaid` | `true` if paid |
| `paymentDate` | Date payment was made (`null` if unpaid) |
| `paymentMethod` | e.g. `cash`, `upi` (`null` if unpaid) |

---

## Errors

| Status | Response | Reason |
|--------|----------|--------|
| `400` | `{ "message": "Token is required" }` | No token in query |
| `401` | `{ "message": "Invalid token" }` | Token is malformed or tampered |
| `401` | `{ "message": "Dashboard link has expired" }` | Token has an expiry and it passed |
| `401` | `{ "message": "Invalid token payload" }` | Token missing hostelId or tenantId |
| `404` | `{ "message": "Tenant not found" }` | Tenant deleted or wrong token |
| `404` | `{ "message": "Hostel not found" }` | Hostel deleted |
| `500` | `{ "message": "..." }` | Internal server error |

---

## Frontend Usage Example

```javascript
// Read token from URL
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

// Fetch dashboard data
const res = await fetch(`https://hostelmanegemnt.onrender.com/api/dashboard?token=${token}`);
const data = await res.json();

console.log(data.tenant.name);       // "Sathish"
console.log(data.room.roomNumber);   // "101"
console.log(data.payments.totalDues); // 6000
```

---

## Quick Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard?token=<jwt>` | JWT in query param | Get tenant dashboard data |
