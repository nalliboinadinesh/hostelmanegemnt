# Hostel Management — Complete API Reference

**Base URL:** `http://13.60.202.87:4000`  
**Content-Type:** `application/json`  
**Auth Header:** `Authorization: Bearer <token>` for all protected routes

---

## Table of Contents
1. [Authentication](#1-authentication)
2. [Hostel](#2-hostel)
3. [Floor](#3-floor)
4. [Room](#4-room)
5. [Tenant](#5-tenant)
6. [Payment](#6-payment)
7. [Expense](#7-expense)
8. [Tickets — Owner](#8-tickets--owner)
9. [Tenant Dashboard](#9-tenant-dashboard)
10. [Temporary Tenant](#10-temporary-tenant)
11. [Test Mail](#11-test-mail)
12. [Cron Jobs](#12-cron-jobs)

---

## 1. Authentication

### POST `/api/auth/register-login`
**Logic:** Checks if owner with given `ownerNumber` exists. If yes, returns JWT + hostels. If no, creates new owner and returns JWT with `isExisted: false`. No password needed.

**Auth required:** No

**Request Body**
| Field | Type | Required |
|---|---|---|
| `ownerNumber` | string | Yes |

```json
{ "ownerNumber": "9876543210" }
```

**Response — New owner `201`**
```json
{
  "token": "eyJhbGci...",
  "isExisted": false,
  "owner": { "_id": "...", "ownerNumber": "9876543210", "isExisted": false },
  "hostels": []
}
```

**Response — Existing owner `200`**
```json
{
  "token": "eyJhbGci...",
  "isExisted": true,
  "owner": { "_id": "...", "ownerNumber": "9876543210", "isExisted": true },
  "hostels": [{ "_id": "...", "hostelName": "Sunrise PG", "hostelType": "boys", "ownerName": "Ravi Kumar" }]
}
```

**Errors:** `400` ownerNumber required · `500` server error

---

### GET `/api/auth/profile`
**Logic:** Returns the authenticated owner's profile. Fetches `ownerName` and `email` from the first hostel record since these fields live on the Hostel model, not Owner model.

**Auth required:** Yes

**Request Body:** None

**Response `200`**
```json
{
  "owner": {
    "_id": "6a2fb5b86f18f89d2c0d2502",
    "ownerNumber": "9876543210",
    "isExisted": true
  },
  "ownerName": "Ravi Kumar",
  "email": "ravi@example.com"
}
```

**Errors:** `401` unauthorized · `500` server error

---

## 2. Hostel

### POST `/api/hostel/create`
**Logic:** Creates a hostel under the authenticated owner. Sets `ownerId` and `ownerNumber` from JWT. Marks `owner.isExisted = true`.

**Auth required:** Yes

**Request Body**
| Field | Type | Required |
|---|---|---|
| `hostelName` | string | Yes |
| `hostelType` | string | Yes — `"boys"`, `"girls"`, `"mixed"` |
| `ownerName` | string | Yes |
| `email` | string | No |

```json
{ "hostelName": "Sunrise PG", "hostelType": "boys", "ownerName": "Ravi Kumar", "email": "ravi@example.com" }
```

**Response `201`**
```json
{
  "message": "Hostel created successfully",
  "hostel": { "_id": "...", "ownerId": "...", "ownerNumber": "9876543210", "hostelName": "Sunrise PG", "hostelType": "boys", "ownerName": "Ravi Kumar", "email": "ravi@example.com" }
}
```

**Errors:** `400` missing required fields · `401` unauthorized

---

### GET `/api/hostel/list`
**Logic:** Returns all hostels belonging to the authenticated owner.

**Auth required:** Yes · No body

**Response `200`**
```json
{ "hostels": [{ "_id": "...", "hostelName": "Sunrise PG", "hostelType": "boys", "ownerName": "Ravi Kumar", "email": "ravi@example.com" }] }
```

---

### GET `/api/hostel/analytics`
**Logic:** Computes today's collection, monthly collection, total dues, bed occupancy, and paid/unpaid tenant counts across all owner's hostels. Returns overall summary + per-hostel breakdown.

**Auth required:** Yes · No body

**Response `200`**
```json
{
  "overall": {
    "todayCollection": 5000, "monthlyCollection": 45000, "totalDues": 12000,
    "totalTenants": 20, "vacantBeds": 8, "totalBeds": 30, "occupiedBeds": 22,
    "paidTenants": 15, "unpaidTenants": 5
  },
  "hostels": [{ "hostelId": "...", "hostelName": "Sunrise PG", "hostelType": "boys", "todayCollection": 5000, "monthlyCollection": 45000, "totalDues": 12000, "totalTenants": 20, "vacantBeds": 8, "totalBeds": 30, "occupiedBeds": 22, "paidTenants": 15, "unpaidTenants": 5 }]
}
```

---

### GET `/api/hostel/:hostelId`
**Logic:** Returns a single hostel. Verifies it belongs to the authenticated owner.

**Auth required:** Yes · URL param: `hostelId`

**Response `200`**
```json
{ "hostel": { "_id": "...", "hostelName": "Sunrise PG", "hostelType": "boys", "ownerName": "Ravi Kumar", "email": "ravi@example.com" } }
```

**Errors:** `404` not found or unauthorized

---

### PUT `/api/hostel/:hostelId`
**Logic:** Updates any combination of hostel fields. Only fields sent in the body are changed.

**Auth required:** Yes · URL param: `hostelId`

**Request Body** (all optional)
| Field | Type | Description |
|---|---|---|
| `hostelName` | string | New hostel name |
| `hostelType` | string | `"boys"`, `"girls"`, `"mixed"` |
| `ownerName` | string | Updated owner name |
| `email` | string | Updated contact email |

```json
{ "hostelName": "Sunrise PG Phase 2", "hostelType": "mixed", "email": "new@example.com" }
```

**Response `200`**
```json
{ "message": "Hostel updated successfully", "hostel": { "_id": "...", "hostelName": "Sunrise PG Phase 2", "hostelType": "mixed", "ownerName": "Ravi Kumar", "email": "new@example.com" } }
```

**Errors:** `404` not found or unauthorized

---

### DELETE `/api/hostel/:hostelId`
**Logic:** Cascade deletes hostel + all floors, rooms, tenants, payments, expenses, announcements, complaints, temporary tenants. Updates `owner.isExisted` if no hostels remain.

**Auth required:** Yes · URL param: `hostelId`

**Response `200`**
```json
{ "message": "Hostel and all related data deleted successfully" }
```

**Errors:** `404` not found or unauthorized

---

## 3. Floor

### POST `/api/floor/create`
**Logic:** Creates a floor in a hostel. Verifies hostel ownership. Rejects duplicate floor numbers in same hostel.

**Auth required:** Yes

**Request Body**
| Field | Type | Required |
|---|---|---|
| `hostelId` | string | Yes |
| `floorNumber` | number | Yes — e.g. `0`, `1`, `2` |

```json
{ "hostelId": "...", "floorNumber": 1 }
```

**Response `201`**
```json
{ "message": "Floor created successfully", "floor": { "_id": "...", "hostelId": "...", "floorNumber": 1 } }
```

**Errors:** `400` missing fields or duplicate floor · `404` hostel not found

---

### GET `/api/floor/:hostelId`
**Logic:** Returns all floors for a hostel sorted by `floorNumber` ascending.

**Auth required:** Yes · URL param: `hostelId`

**Response `200`**
```json
{ "floors": [{ "_id": "...", "hostelId": "...", "floorNumber": 1 }, { "_id": "...", "floorNumber": 2 }] }
```

---

### GET `/api/floor/:hostelId/details/:floorNumber`
**Logic:** Returns a floor with all rooms and tenants inside each room. Useful for a floor-view screen.

**Auth required:** Yes · URL params: `hostelId`, `floorNumber`

**Response `200`**
```json
{
  "floorNumber": 1, "floorId": "...", "hostelId": "...",
  "rooms": [{
    "room": { "_id": "...", "roomNumber": "101", "roomType": "NON AC", "totalBeds": 4, "occupiedBeds": 2, "vacantBeds": 2 },
    "tenants": [{ "_id": "...", "name": "Arjun", "phoneNumber": "9876543210", "paymentStatus": "pending", "monthlyFee": 5000 }]
  }]
}
```

---

### GET `/api/floor/single/:floorId`
**Logic:** Returns a single floor by ID with hostel info populated.

**Auth required:** Yes · URL param: `floorId`

**Response `200`**
```json
{ "floor": { "_id": "...", "hostelId": { "_id": "...", "hostelName": "Sunrise PG" }, "floorNumber": 1 } }
```

---

### PUT `/api/floor/:floorId`
**Logic:** Updates floor number. Checks for duplicate in same hostel.

**Auth required:** Yes · URL param: `floorId`

**Request Body**
```json
{ "floorNumber": 3 }
```

**Response `200`**
```json
{ "message": "Floor updated successfully", "floor": { "_id": "...", "floorNumber": 3 } }
```

---

### DELETE `/api/floor/:floorId`
**Logic:** Deletes floor + all rooms, tenants, and payments on that floor (cascade).

**Auth required:** Yes · URL param: `floorId`

**Response `200`**
```json
{ "message": "Floor and associated rooms and tenants deleted successfully" }
```

---

## 4. Room

### POST `/api/room/create`
**Logic:** Creates a room. Sets `occupiedBeds: 0` and `vacantBeds: totalBeds`. Rejects duplicate room numbers on same floor.

**Auth required:** Yes

**Request Body**
| Field | Type | Required |
|---|---|---|
| `hostelId` | string | Yes |
| `floorId` | string | Yes |
| `roomNumber` | string | Yes — e.g. `"101"` |
| `roomType` | string | Yes — e.g. `"AC"`, `"NON AC"` |
| `totalBeds` | number | Yes |

```json
{ "hostelId": "...", "floorId": "...", "roomNumber": "101", "roomType": "NON AC", "totalBeds": 4 }
```

**Response `201`**
```json
{ "message": "Room created successfully", "room": { "_id": "...", "roomNumber": "101", "roomType": "NON AC", "totalBeds": 4, "occupiedBeds": 0, "vacantBeds": 4 } }
```

**Errors:** `400` missing fields or duplicate room · `404` hostel/floor not found

---

### GET `/api/room/:hostelId`
**Logic:** Returns all rooms in hostel with `floorId` populated (shows floorNumber).

**Auth required:** Yes · URL param: `hostelId`

**Response `200`**
```json
{ "rooms": [{ "_id": "...", "floorId": { "_id": "...", "floorNumber": 1 }, "roomNumber": "101", "totalBeds": 4, "occupiedBeds": 2, "vacantBeds": 2 }] }
```

---

### GET `/api/room/floor/:floorId`
**Logic:** Returns all rooms on a specific floor.

**Auth required:** Yes · URL param: `floorId`

**Response `200`**
```json
{ "rooms": [{ "_id": "...", "roomNumber": "101", "roomType": "NON AC", "totalBeds": 4, "vacantBeds": 2 }] }
```

---

### GET `/api/room/single/:roomId`
**Logic:** Returns a single room by ID with floor info populated.

**Auth required:** Yes · URL param: `roomId`

**Response `200`**
```json
{ "room": { "_id": "...", "floorId": { "_id": "...", "floorNumber": 1 }, "roomNumber": "101", "totalBeds": 4, "occupiedBeds": 1, "vacantBeds": 3 } }
```

---

### PUT `/api/room/:roomId`
**Logic:** Updates room details. If `totalBeds` is reduced below `occupiedBeds`, request is rejected. `vacantBeds` auto-recalculated as `totalBeds - occupiedBeds`.

**Auth required:** Yes · URL param: `roomId`

**Request Body** (all optional)
```json
{ "roomNumber": "102", "roomType": "AC", "totalBeds": 3 }
```

**Response `200`**
```json
{ "message": "Room updated successfully", "room": { "_id": "...", "roomType": "AC", "totalBeds": 3, "occupiedBeds": 1, "vacantBeds": 2 } }
```

**Errors:** `400` totalBeds < occupiedBeds · `400` duplicate room number

---

### DELETE `/api/room/:roomId`
**Logic:** Deletes room + all tenants inside it + their payment records (cascade).

**Auth required:** Yes · URL param: `roomId`

**Response `200`**
```json
{ "message": "Room and associated tenants deleted successfully" }
```

---

## 5. Tenant

### POST `/api/tenant/create`
**Logic:** Creates tenant, assigns to room, increments `occupiedBeds`, decrements `vacantBeds`. Builds `feeStatus` for every calendar month from `joinedDate` to today. Auto-generates 30-day payment cycles from `joinedDate` to today. Rejects future `joinedDate`. Sends welcome email with permanent dashboard link after response.

**Auth required:** Yes

**Request Body**
| Field | Type | Required | Notes |
|---|---|---|---|
| `hostelId` | string | Yes | |
| `floorId` | string | Yes | |
| `roomId` | string | Yes | |
| `name` | string | Yes | |
| `phoneNumber` | string | Yes | |
| `email` | string | No | Welcome email sent here |
| `address` | string | No | |
| `parentNumber` | string | No | |
| `aadhaarNumber` | string | No | |
| `occupation` | string | No | |
| `joinedDate` | string | No | ISO date — cannot be future |
| `monthlyFee` | number | No | Used to generate payment cycles |
| `deposit` | number | No | |
| `paymentStatus` | string | No | Default `"pending"` |

```json
{
  "hostelId": "...", "floorId": "...", "roomId": "...",
  "name": "Arjun Mehta", "phoneNumber": "9876543210",
  "email": "arjun@example.com", "occupation": "Student",
  "joinedDate": "2026-04-01", "monthlyFee": 5000, "deposit": 10000
}
```

**Response `201`**
```json
{
  "message": "Tenant created successfully",
  "tenant": {
    "_id": "...", "name": "Arjun Mehta", "phoneNumber": "9876543210",
    "joinedDate": "2026-04-01T00:00:00.000Z", "monthlyFee": 5000, "deposit": 10000,
    "paymentStatus": "pending",
    "feeStatus": [
      { "month": 4, "year": 2026, "isPaid": false },
      { "month": 5, "year": 2026, "isPaid": false },
      { "month": 6, "year": 2026, "isPaid": false }
    ]
  }
}
```

**Errors:** `400` missing required fields · `400` no vacant beds · `400` future joinedDate · `404` hostel/room not found

---

### GET `/api/tenant/:hostelId`
**Logic:** Returns all tenants in a hostel with `floorId` (floorNumber) and `roomId` (roomNumber, roomType) populated.

**Auth required:** Yes · URL param: `hostelId`

**Response `200`**
```json
{
  "tenants": [{
    "_id": "...", "name": "Arjun Mehta", "phoneNumber": "9876543210",
    "monthlyFee": 5000, "paymentStatus": "pending",
    "feeStatus": [{ "month": 4, "year": 2026, "isPaid": false }],
    "floorId": { "_id": "...", "floorNumber": 1 },
    "roomId": { "_id": "...", "roomNumber": "101", "roomType": "NON AC" }
  }]
}
```

---

### GET `/api/tenant/single/:tenantId`
**Logic:** Returns a single tenant by ID with floor and room populated.

**Auth required:** Yes · URL param: `tenantId`

**Response `200`**
```json
{
  "tenant": {
    "_id": "...", "name": "Arjun Mehta", "email": "arjun@example.com",
    "aadhaarNumber": "1234 5678 9012", "joinedDate": "2026-04-01T00:00:00.000Z",
    "monthlyFee": 5000, "deposit": 10000, "paymentStatus": "pending",
    "feeStatus": [
      { "month": 4, "year": 2026, "isPaid": false },
      { "month": 5, "year": 2026, "isPaid": false },
      { "month": 6, "year": 2026, "isPaid": false }
    ],
    "floorId": { "floorNumber": 1 }, "roomId": { "roomNumber": "101", "roomType": "NON AC" }
  }
}
```

---

### PUT `/api/tenant/:tenantId`
**Logic:** Updates tenant fields with smart syncing based on what changed:

| Field changed | Side effect |
|---|---|
| `name`, `phoneNumber`, `email`, `address`, `parentNumber`, `aadhaarNumber`, `occupation`, `deposit` | Updated directly, no side effects |
| `roomId` | Frees bed on old room, occupies bed on new room |
| `floorId` | Updated directly — use with `roomId` when moving floors |
| `joinedDate` | Deletes all payment cycles, regenerates from new date, rebuilds feeStatus, resets paymentStatus to `"pending"` |
| `monthlyFee` | Same as joinedDate — cycles regenerated with new amount |
| `joinedDate` + `monthlyFee` together | Single-pass regeneration with both new values |
| `paymentStatus` | Manual override — only applied if joinedDate/fee not also changing |

**Auth required:** Yes · URL param: `tenantId`

**Request Body** (all optional)
```json
{
  "name": "Arjun Kumar",
  "phoneNumber": "9000000001",
  "email": "new@example.com",
  "address": "New Address",
  "parentNumber": "9111111111",
  "aadhaarNumber": "9999 8888 7777",
  "occupation": "Engineer",
  "deposit": 12000,
  "floorId": "...",
  "roomId": "...",
  "joinedDate": "2026-03-01",
  "monthlyFee": 6000,
  "paymentStatus": "paid"
}
```

**Response `200`**
```json
{ "message": "Tenant updated successfully", "tenant": { "...full updated tenant object..." } }
```

**Errors:** `400` future joinedDate · `400` no vacant beds in new room · `403` unauthorized · `404` tenant/room not found

---

### DELETE `/api/tenant/:tenantId`
**Logic:** Deletes tenant. Frees bed on room (`occupiedBeds - 1`, `vacantBeds + 1`). Deletes all payment records for this tenant.

**Auth required:** Yes · URL param: `tenantId`

**Response `200`**
```json
{ "message": "Tenant deleted successfully" }
```

---

## 6. Payment

### GET `/api/payment/hostel/:hostelId`
**Logic:** Fetches all tenants in the hostel then fetches all their payment cycles in one batch query (not N+1). Groups by tenant in memory. Returns paid/unpaid counts and every cycle per tenant.

**Auth required:** Yes · URL param: `hostelId`

**Response `200`**
```json
{
  "payments": [{
    "tenantId": "...", "tenantName": "Arjun Mehta", "phoneNumber": "9876543210",
    "joinedDate": "2026-04-01T00:00:00.000Z", "monthlyFee": 5000,
    "paid": 2, "unpaid": 1,
    "cycles": [{
      "_id": "...", "periodStart": "2026-04-01T00:00:00.000Z", "periodEnd": "2026-05-01T00:00:00.000Z",
      "amount": 5000, "isPaid": true, "paymentMethod": "UPI",
      "paymentDate": "2026-04-05T00:00:00.000Z", "note": "April rent"
    }]
  }]
}
```

---

### GET `/api/payment/:tenantId`
**Logic:** Returns all 30-day payment cycles for a specific tenant with a summary.

**Auth required:** Yes · URL param: `tenantId`

**Response `200`**
```json
{
  "tenantId": "...", "tenantName": "Arjun Mehta", "monthlyFee": 5000,
  "joinedDate": "2026-04-01T00:00:00.000Z", "totalCycles": 3, "paid": 2, "unpaid": 1,
  "cycles": [{
    "_id": "...", "periodStart": "2026-04-01T00:00:00.000Z", "periodEnd": "2026-05-01T00:00:00.000Z",
    "amount": 5000, "isPaid": true, "paymentMethod": "UPI", "paymentDate": "2026-04-05T00:00:00.000Z", "note": null
  }]
}
```

---

### PUT `/api/payment/:paymentId`
**Logic:** Updates a payment cycle. Key behaviours:
- `isPaid: true` with no `paymentDate` → auto-sets `paymentDate` to now (so analytics work correctly)
- `isPaid: true` → also marks ALL previous unpaid cycles for that tenant as paid (cascade)
- `isPaid: false` → clears `paymentDate` and `paymentMethod`
- After any change → rebuilds tenant's `feeStatus` from ALL payment records from scratch
- `paymentStatus` on tenant → `"paid"` only if every month in feeStatus is paid

**Auth required:** Yes · URL param: `paymentId`

**Request Body** (all optional)
| Field | Type | Description |
|---|---|---|
| `isPaid` | boolean | `true` = paid, `false` = unpaid |
| `paymentMethod` | string | `"Cash"`, `"UPI"`, `"Bank Transfer"`, `"Cheque"` |
| `paymentDate` | string | ISO date — auto-set to now if marking paid without providing date |
| `amount` | number | Override cycle amount |
| `note` | string | Any note |

```json
{ "isPaid": true, "paymentMethod": "UPI", "note": "Paid via PhonePe" }
```

**Response `200`**
```json
{
  "message": "Payment updated successfully",
  "payment": {
    "_id": "...", "isPaid": true, "paymentMethod": "UPI",
    "paymentDate": "2026-06-21T10:00:00.000Z", "amount": 5000, "note": "Paid via PhonePe"
  }
}
```

**Errors:** `404` payment not found · `403` unauthorized

---

## 7. Expense

### POST `/api/expense/create`
**Logic:** Records an expense. Extracts `month` and `year` from the date for monthly filtering.

**Auth required:** Yes

**Request Body**
| Field | Type | Required |
|---|---|---|
| `hostelId` | string | Yes |
| `expenseReason` | string | Yes |
| `amount` | number | Yes |
| `date` | string | Yes — ISO date |
| `paymentMethod` | string | No |
| `note` | string | No |

```json
{ "hostelId": "...", "expenseReason": "Plumbing repair", "amount": 2500, "date": "2026-06-15", "paymentMethod": "Cash", "note": "Bathroom leak fixed" }
```

**Response `201`**
```json
{
  "message": "Expense created successfully",
  "expense": { "_id": "...", "expenseReason": "Plumbing repair", "amount": 2500, "date": "2026-06-15T00:00:00.000Z", "month": 6, "year": 2026, "paymentMethod": "Cash" }
}
```

**Errors:** `400` missing required fields · `404` hostel not found

---

### GET `/api/expense/:hostelId`
**Logic:** Returns all expenses sorted by date descending. Supports optional month/year filter via query params.

**Auth required:** Yes · URL param: `hostelId`

**Query Params** (optional): `?month=6&year=2026`

**Response `200`**
```json
{ "expenses": [{ "_id": "...", "expenseReason": "Plumbing repair", "amount": 2500, "date": "2026-06-15T00:00:00.000Z", "month": 6, "year": 2026 }] }
```

---

### PUT `/api/expense/:expenseId`
**Logic:** Updates expense. If `date` changes, `month` and `year` are auto-recalculated.

**Auth required:** Yes · URL param: `expenseId`

**Request Body** (all optional)
```json
{ "expenseReason": "Electrical repair", "amount": 3000, "date": "2026-06-20", "paymentMethod": "UPI", "note": "Updated" }
```

**Response `200`**
```json
{ "message": "Expense updated successfully", "expense": { "...updated expense object..." } }
```

---

### DELETE `/api/expense/:expenseId`
**Logic:** Permanently deletes expense after verifying hostel ownership.

**Auth required:** Yes · URL param: `expenseId`

**Response `200`**
```json
{ "message": "Expense deleted successfully" }
```

---

## 8. Tickets — Owner

### GET `/api/tickets/hostel/:hostelId`
**Logic:** Returns all tickets for a hostel sorted newest first. Populates tenant name, phone, and room number.

**Auth required:** Yes · URL param: `hostelId`

**Response `200`**
```json
{
  "total": 1,
  "tickets": [{
    "_id": "...",
    "tenantId": { "_id": "...", "name": "Arjun Mehta", "phoneNumber": "9876543210", "roomId": { "_id": "...", "roomNumber": "101" } },
    "title": "AC not working", "category": "Maintenance",
    "description": "AC stopped cooling.", "imageLink": null,
    "status": "open", "createdAt": "2026-06-21T10:30:00.000Z", "updatedAt": "2026-06-21T10:30:00.000Z"
  }]
}
```

---

### GET `/api/tickets/tenant/:tenantId`
**Logic:** Returns all tickets by a specific tenant. Owner must own the hostel.

**Auth required:** Yes · URL param: `tenantId`

**Response `200`**
```json
{ "total": 1, "tickets": [{ "_id": "...", "title": "AC not working", "status": "open", "createdAt": "..." }] }
```

---

### PUT `/api/tickets/:ticketId/status`
**Logic:** Updates ticket status. Only `"open"`, `"in-progress"`, `"resolved"` allowed.

**Auth required:** Yes · URL param: `ticketId`

**Request Body**
```json
{ "status": "in-progress" }
```

**Response `200`**
```json
{ "message": "Ticket status updated", "ticket": { "_id": "...", "status": "in-progress", "updatedAt": "..." } }
```

**Errors:** `400` invalid status · `403` unauthorized · `404` ticket not found

---

## 9. Tenant Dashboard

These endpoints are for the **tenant-facing app**. No owner Bearer token — instead a **dashboard JWT** (no expiry, contains `hostelId` + `tenantId`) is passed in the **request body**. This token is in the welcome email link.

---

### POST `/api/dashboard`
**Logic:** Verifies dashboard JWT. Returns full tenant dashboard — profile, hostel, room, all payment cycles with totals, and all tickets.

**Auth required:** No — dashboard token in body

**Request Body**
```json
{ "token": "eyJhbGci..." }
```

**Response `200`**
```json
{
  "tenant": { "id": "...", "name": "Arjun Mehta", "phoneNumber": "9876543210", "email": "arjun@example.com", "occupation": "Student", "joinedDate": "2026-04-01T00:00:00.000Z", "paymentStatus": "pending" },
  "hostel": { "id": "...", "hostelName": "Sunrise PG", "hostelType": "boys", "ownerName": "Ravi Kumar", "ownerNumber": "9876543210", "email": "ravi@example.com" },
  "room": { "id": "...", "roomNumber": "101", "roomType": "NON AC", "totalBeds": 4 },
  "payments": {
    "monthlyRent": 5000, "deposit": 10000, "totalDues": 5000,
    "paidCycles": 2, "unpaidCycles": 1, "lastPaidDate": "2026-05-05T00:00:00.000Z",
    "cycles": [{ "_id": "...", "periodStart": "...", "periodEnd": "...", "amount": 5000, "isPaid": true, "paymentDate": "...", "paymentMethod": "UPI" }]
  },
  "tickets": [{ "_id": "...", "title": "AC not working", "category": "Maintenance", "status": "open", "createdAt": "..." }]
}
```

**Errors:** `400` token required · `401` invalid token · `404` tenant/hostel not found

---

### POST `/api/dashboard/ticket`
**Logic:** Tenant raises a new support ticket. Created with `status: "open"`, immediately visible to owner.

**Auth required:** No — dashboard token in body

**Request Body**
| Field | Type | Required |
|---|---|---|
| `token` | string | Yes |
| `title` | string | Yes |
| `category` | string | Yes — `"Maintenance"`, `"Cleanliness"`, `"Electrical"`, `"Water"`, `"Internet"`, `"Furniture"`, `"Food"`, `"Bathroom"`, `"Other"` |
| `description` | string | Yes |
| `imageLink` | string | No — URL to uploaded image |

```json
{ "token": "eyJhbGci...", "title": "Leaking tap", "category": "Water", "description": "Bathroom tap leaking.", "imageLink": null }
```

**Response `201`**
```json
{ "message": "Ticket raised successfully", "ticket": { "_id": "...", "title": "Leaking tap", "category": "Water", "status": "open", "createdAt": "..." } }
```

**Errors:** `400` title/category/description required · `401` invalid token · `404` tenant not found

---

### POST `/api/dashboard/tickets`
**Logic:** Returns all tickets raised by the tenant, sorted newest first.

**Auth required:** No — dashboard token in body

**Request Body**
```json
{ "token": "eyJhbGci..." }
```

**Response `200`**
```json
{
  "total": 2,
  "tickets": [{ "_id": "...", "title": "AC not working", "status": "resolved", "createdAt": "...", "updatedAt": "..." }]
}
```

---

## 10. Temporary Tenant

### POST `/api/temporary-tenant/generate-token`
**Logic:** Generates a 15-minute JWT tied to a hostel. Verifies the hostel belongs to the authenticated owner. Share the token as a form link for a prospective tenant.

**Auth required:** Yes

**Request Body**
```json
{ "hostelId": "..." }
```

**Response `200`**
```json
{
  "token": "eyJhbGci...", "hostelId": "...",
  "issuedAt": "2026-06-21T11:00:00.000Z",
  "expiresAt": "2026-06-21T11:15:00.000Z",
  "expiresInMinutes": 15
}
```

**Errors:** `400` hostelId required · `404` hostel not found or unauthorized

---

### POST `/api/temporary-tenant/submit`
**Logic:** Public form submission. Reads form token from `Authorization: Bearer` header. Resolves `floorNumber` → floorId and `roomNumber` → roomId automatically. Blocks duplicate phone number submissions. Creates pending TemporaryTenant for owner to review.

**Auth required:** No — form token via `Authorization: Bearer <form_token>`

**Request Body**
| Field | Type | Required |
|---|---|---|
| `floorNumber` | number | Yes |
| `roomNumber` | string | Yes |
| `name` | string | Yes |
| `phoneNumber` | string | Yes |
| `email` | string | No |
| `address` | string | No |
| `parentNumber` | string | No |
| `aadhaarNumber` | string | No |
| `occupation` | string | No |
| `joinedDate` | string | No |
| `monthlyFee` | number | No |
| `deposit` | number | No |

```json
{ "floorNumber": 1, "roomNumber": "101", "name": "Priya Sharma", "phoneNumber": "9988776655", "email": "priya@example.com", "joinedDate": "2026-07-01", "monthlyFee": 5000 }
```

**Response `201`**
```json
{
  "message": "Form submitted successfully",
  "temporaryTenant": { "_id": "...", "name": "Priya Sharma", "phoneNumber": "9988776655", "hostelId": "...", "floorId": "...", "roomId": "...", "paymentStatus": "pending" }
}
```

**Errors:** `400` missing fields · `400` no vacant beds · `400` duplicate phone pending · `401` token required/expired/invalid · `404` floor/room not found

---

### GET `/api/temporary-tenant/hostel/:hostelId`
**Logic:** Returns all pending temporary tenant applications, newest first. Floor and room details populated.

**Auth required:** Yes · URL param: `hostelId`

**Response `200`**
```json
{
  "hostelId": "...", "total": 1,
  "tenants": [{ "_id": "...", "name": "Priya Sharma", "phoneNumber": "9988776655", "floorId": { "floorNumber": 1 }, "roomId": { "roomNumber": "101" }, "createdAt": "..." }]
}
```

---

### POST `/api/temporary-tenant/approve/:tempTenantId`
**Logic:** Promotes temp tenant to full tenant. Checks vacant beds. Creates Tenant record. Increments `occupiedBeds`. Generates payment cycles from `joinedDate` to today. Deletes temp record. Sends welcome email with dashboard link.

**Auth required:** Yes · URL param: `tempTenantId` · No body

**Response `201`**
```json
{ "message": "Tenant approved and moved to tenants successfully", "tenant": { "_id": "...", "name": "Priya Sharma", "monthlyFee": 5000, "paymentStatus": "pending" } }
```

**Errors:** `400` no vacant beds · `403` unauthorized · `404` temp tenant/room not found

---

### DELETE `/api/temporary-tenant/:tempTenantId`
**Logic:** Rejects and permanently deletes the application. No bed counts affected.

**Auth required:** Yes · URL param: `tempTenantId`

**Response `200`**
```json
{ "message": "Temporary tenant deleted successfully" }
```

---

## 11. Test Mail

### POST `/api/auth/test-mail`
**Logic:** Sends a test email. For `type: "welcome"` with a real `tenantId`, generates a proper JWT dashboard link. For `type: "reminder"`, sends a dummy payment reminder email.

**Auth required:** No

**Request Body**
| Field | Type | Required |
|---|---|---|
| `to` | string | Yes — recipient email |
| `type` | string | No — `"welcome"` (default) or `"reminder"` |
| `tenantId` | string | No — if provided with welcome type, uses real tenant data |

```json
{ "to": "nalliboinadinesh9441@gmail.com", "type": "welcome", "tenantId": "6a350db7b206aa3747c7737f" }
```

**Response `200`**
```json
{ "message": "Test welcome email sent successfully to nalliboinadinesh9441@gmail.com" }
```

**Errors:** `400` to required · `400` invalid type · `500` mail error

---

## 12. Cron Jobs

### Fee Status Cron — daily at 17:40 UTC
**Logic:** Finds all tenants with `joinedDate` and `monthlyFee > 0`. For each, finds the latest payment cycle. If `periodEnd` is today or earlier (end-of-day check), generates next 30-day cycle. Also pushes a new `feeStatus` entry for current month on any tenant missing it.

**Schedule:** `40 17 * * *`

---

### Payment Reminder Cron — daily at 12:00 PM UTC
**Logic:** Finds all unpaid cycles where `periodEnd` has already passed (genuinely overdue, not just started). Groups by tenant (one email per tenant). Computes total outstanding. Sends payment reminder email. Skips tenants with no email.

**Schedule:** `0 12 * * *`

---

## Common HTTP Status Codes

| Status | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `400` | Bad Request — missing or invalid fields |
| `401` | Unauthorized — missing, invalid, or expired token |
| `403` | Forbidden — valid token but resource belongs to another owner |
| `404` | Not Found |
| `500` | Internal Server Error |

---

## Key Notes

- All IDs are MongoDB ObjectIds (24-character hex strings)
- All timestamps are ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- `feeStatus` is built from `joinedDate` to today on tenant create — one entry per calendar month
- `feeStatus` is always rebuilt from the Payment table whenever any payment is updated
- Marking a payment as `paid` auto-marks all earlier unpaid cycles as paid too (cascade)
- `paymentStatus = "paid"` only when every month in `feeStatus` is paid
- Payment cycles are 30-day windows, `feeStatus` is calendar-month based — both stay in sync
- Dashboard token — **no expiry**, permanent link for tenant
- Form token — **15 minutes**, used only for temporary tenant self-registration
- Welcome email sent automatically on tenant create and temporary tenant approve
- Dashboard link format: `https://dashboard-frontend-five-rouge.vercel.app/?token=<jwt>`
