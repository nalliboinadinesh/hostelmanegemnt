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

**Logic:** Checks if an owner with the given `ownerNumber` exists. If yes, fetches their hostels, refreshes `isExisted` flag, and returns a 30-day JWT. If no, creates a new owner record and returns a JWT with `isExisted: false`. No password — mobile number is the only identity.

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
  "hostels": [{ "_id": "...", "hostelName": "Sunrise PG", "hostelType": "boys" }]
}
```

**Errors:** `400` ownerNumber required · `500` server error

---

## 2. Hostel

### POST `/api/hostel/create`
**Logic:** Creates a hostel under the authenticated owner. Sets `ownerId`, `ownerNumber` from the JWT. Also marks `owner.isExisted = true` so the owner app knows setup is complete.

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
**Logic:** Returns all hostels where `ownerId` matches the authenticated owner's ID.

**Auth required:** Yes · No body

**Response `200`**
```json
{ "hostels": [{ "_id": "...", "hostelName": "Sunrise PG", "hostelType": "boys", "ownerName": "Ravi Kumar" }] }
```

---

### GET `/api/hostel/analytics`
**Logic:** Fetches all payments, tenants, and rooms for every hostel the owner has. Computes today's collection (payments marked paid today), monthly collection (paid this calendar month), total dues (all unpaid), bed occupancy, and paid/unpaid tenant counts. Returns both an overall summary and a per-hostel breakdown.

**Auth required:** Yes · No body

**Response `200`**
```json
{
  "overall": {
    "todayCollection": 5000, "monthlyCollection": 45000, "totalDues": 12000,
    "totalTenants": 20, "vacantBeds": 8, "totalBeds": 30, "occupiedBeds": 22,
    "paidTenants": 15, "unpaidTenants": 5
  },
  "hostels": [{ "hostelId": "...", "hostelName": "Sunrise PG", "hostelType": "boys", "todayCollection": 5000, "..." : "..." }]
}
```

---

### GET `/api/hostel/:hostelId`
**Logic:** Returns a single hostel, verifying it belongs to the authenticated owner.

**Auth required:** Yes · URL param: `hostelId`

**Response `200`**
```json
{ "hostel": { "_id": "...", "hostelName": "Sunrise PG", "hostelType": "boys", "ownerName": "Ravi Kumar" } }
```

**Errors:** `404` not found or unauthorized

---

### PUT `/api/hostel/:hostelId`
**Logic:** Updates any combination of `hostelName`, `hostelType`, `ownerName`, `email`. Only sends fields you want to change.

**Auth required:** Yes · URL param: `hostelId`

**Request Body** (all optional)
```json
{ "hostelName": "New Name", "email": "new@example.com" }
```

**Response `200`**
```json
{ "message": "Hostel updated successfully", "hostel": { "..." : "..." } }
```

---

### DELETE `/api/hostel/:hostelId`
**Logic:** Cascade deletes the hostel and everything under it — floors, rooms, tenants, payments, expenses, announcements, complaints, temporary tenants. Then rechecks if owner has any remaining hostels and updates `isExisted` accordingly.

**Auth required:** Yes · URL param: `hostelId`

**Response `200`**
```json
{ "message": "Hostel and all related data deleted successfully" }
```

**Errors:** `404` not found or unauthorized

---

## 3. Floor

### POST `/api/floor/create`
**Logic:** Creates a floor inside a hostel. Verifies hostel belongs to the owner. Rejects duplicate floor numbers within the same hostel.

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

**Errors:** `400` missing fields or duplicate floor number · `404` hostel not found

---

### GET `/api/floor/:hostelId`
**Logic:** Returns all floors for a hostel sorted by `floorNumber` ascending. Verifies hostel ownership.

**Auth required:** Yes · URL param: `hostelId`

**Response `200`**
```json
{ "floors": [{ "_id": "...", "hostelId": "...", "floorNumber": 1 }, { "_id": "...", "floorNumber": 2 }] }
```

---

### GET `/api/floor/:hostelId/details/:floorNumber`
**Logic:** Returns a floor with all its rooms and the tenants inside each room. Useful for a floor-view screen — shows occupancy per room in one call.

**Auth required:** Yes · URL params: `hostelId`, `floorNumber`

**Response `200`**
```json
{
  "floorNumber": 1,
  "floorId": "...",
  "hostelId": "...",
  "rooms": [
    {
      "room": { "_id": "...", "roomNumber": "101", "roomType": "NON AC", "totalBeds": 4, "occupiedBeds": 2, "vacantBeds": 2 },
      "tenants": [{ "_id": "...", "name": "Arjun", "phoneNumber": "9876543210", "paymentStatus": "pending", "monthlyFee": 5000 }]
    }
  ]
}
```

---

### GET `/api/floor/single/:floorId`
**Logic:** Returns a single floor by its `_id` with the parent hostel populated.

**Auth required:** Yes · URL param: `floorId`

**Response `200`**
```json
{ "floor": { "_id": "...", "hostelId": { "_id": "...", "hostelName": "Sunrise PG" }, "floorNumber": 1 } }
```

---

### PUT `/api/floor/:floorId`
**Logic:** Updates the floor number. Checks for duplicates in the same hostel before saving.

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
**Logic:** Deletes the floor and cascade-deletes all rooms on that floor, all tenants in those rooms, and all payment records for those tenants.

**Auth required:** Yes · URL param: `floorId`

**Response `200`**
```json
{ "message": "Floor and associated rooms and tenants deleted successfully" }
```

---

## 4. Room

### POST `/api/room/create`
**Logic:** Creates a room under a hostel and floor. Verifies hostel ownership and that the floor belongs to the hostel. Sets `occupiedBeds: 0` and `vacantBeds: totalBeds` automatically. Rejects duplicate room numbers on the same floor.

**Auth required:** Yes

**Request Body**
| Field | Type | Required |
|---|---|---|
| `hostelId` | string | Yes |
| `floorId` | string | Yes |
| `roomNumber` | string | Yes — e.g. `"101"`, `"A1"` |
| `roomType` | string | Yes — e.g. `"AC"`, `"NON AC"`, `"double"` |
| `totalBeds` | number | Yes |

```json
{ "hostelId": "...", "floorId": "...", "roomNumber": "101", "roomType": "NON AC", "totalBeds": 4 }
```

**Response `201`**
```json
{
  "message": "Room created successfully",
  "room": { "_id": "...", "roomNumber": "101", "roomType": "NON AC", "totalBeds": 4, "occupiedBeds": 0, "vacantBeds": 4 }
}
```

**Errors:** `400` missing fields or duplicate room · `404` hostel/floor not found

---

### GET `/api/room/:hostelId`
**Logic:** Returns all rooms in a hostel with `floorId` populated to show `floorNumber`.

**Auth required:** Yes · URL param: `hostelId`

**Response `200`**
```json
{
  "rooms": [{ "_id": "...", "floorId": { "_id": "...", "floorNumber": 1 }, "roomNumber": "101", "totalBeds": 4, "occupiedBeds": 2, "vacantBeds": 2 }]
}
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
**Logic:** Returns a single room by its `_id` with `floorId` populated.

**Auth required:** Yes · URL param: `roomId`

**Response `200`**
```json
{ "room": { "_id": "...", "floorId": { "_id": "...", "floorNumber": 1 }, "roomNumber": "101", "totalBeds": 4, "occupiedBeds": 1, "vacantBeds": 3 } }
```

---

### PUT `/api/room/:roomId`
**Logic:** Updates room details. If `totalBeds` is changed, `vacantBeds` is recalculated as `totalBeds - occupiedBeds`. Rejects if `totalBeds` would be less than current `occupiedBeds`.

**Auth required:** Yes · URL param: `roomId`

**Request Body** (all optional)
```json
{ "roomNumber": "102", "roomType": "AC", "totalBeds": 3 }
```

**Response `200`**
```json
{ "message": "Room updated successfully", "room": { "_id": "...", "roomType": "AC", "totalBeds": 3, "vacantBeds": 2 } }
```

**Errors:** `400` totalBeds < occupiedBeds · `400` duplicate room number

---

### DELETE `/api/room/:roomId`
**Logic:** Deletes the room and cascade-deletes all tenants in the room and their payment records.

**Auth required:** Yes · URL param: `roomId`

**Response `200`**
```json
{ "message": "Room and associated tenants deleted successfully" }
```

---

## 5. Tenant

### POST `/api/tenant/create`
**Logic:** Creates a tenant and assigns them to a specific hostel, floor, and room. Checks for vacant beds. Increments `occupiedBeds` and decrements `vacantBeds` on the room. Auto-generates 30-day payment cycles from `joinedDate` up to today using `Payment.insertMany`. After the HTTP response is sent, asynchronously sends a welcome email with a permanent dashboard link (JWT containing `hostelId` + `tenantId`). Rejects `joinedDate` in the future.

**Auth required:** Yes

**Request Body**
| Field | Type | Required |
|---|---|---|
| `hostelId` | string | Yes |
| `floorId` | string | Yes |
| `roomId` | string | Yes |
| `name` | string | Yes |
| `phoneNumber` | string | Yes |
| `email` | string | No — welcome email sent here |
| `address` | string | No |
| `parentNumber` | string | No |
| `aadhaarNumber` | string | No |
| `occupation` | string | No |
| `joinedDate` | string | No — ISO date, cannot be future |
| `monthlyFee` | number | No |
| `deposit` | number | No |
| `paymentStatus` | string | No — default `"pending"` |

```json
{
  "hostelId": "...", "floorId": "...", "roomId": "...",
  "name": "Arjun Mehta", "phoneNumber": "9876543210",
  "email": "arjun@example.com", "occupation": "Student",
  "joinedDate": "2026-01-01", "monthlyFee": 5000, "deposit": 10000
}
```

**Response `201`**
```json
{
  "message": "Tenant created successfully",
  "tenant": {
    "_id": "...", "name": "Arjun Mehta", "phoneNumber": "9876543210",
    "monthlyFee": 5000, "deposit": 10000, "paymentStatus": "pending",
    "feeStatus": [{ "month": 6, "year": 2026, "isPaid": false }]
  }
}
```

**Errors:** `400` missing required fields · `400` no vacant beds · `400` future joinedDate · `404` hostel/room not found

---

### GET `/api/tenant/:hostelId`
**Logic:** Returns all tenants in a hostel. Populates `floorId` (floorNumber) and `roomId` (roomNumber, roomType).

**Auth required:** Yes · URL param: `hostelId`

**Response `200`**
```json
{
  "tenants": [{
    "_id": "...", "name": "Arjun Mehta", "phoneNumber": "9876543210",
    "monthlyFee": 5000, "paymentStatus": "pending",
    "floorId": { "_id": "...", "floorNumber": 1 },
    "roomId": { "_id": "...", "roomNumber": "101", "roomType": "NON AC" }
  }]
}
```

---

### GET `/api/tenant/single/:tenantId`
**Logic:** Returns a single tenant by ID with floor and room populated. Verifies the tenant belongs to a hostel owned by the authenticated owner.

**Auth required:** Yes · URL param: `tenantId`

**Response `200`**
```json
{
  "tenant": {
    "_id": "...", "name": "Arjun Mehta", "email": "arjun@example.com",
    "aadhaarNumber": "1234 5678 9012", "joinedDate": "2026-01-01T00:00:00.000Z",
    "monthlyFee": 5000, "deposit": 10000, "paymentStatus": "pending",
    "feeStatus": [{ "month": 6, "year": 2026, "isPaid": false }],
    "floorId": { "floorNumber": 1 }, "roomId": { "roomNumber": "101", "roomType": "NON AC" }
  }
}
```

---

### PUT `/api/tenant/:tenantId`
**Logic:** Updates any tenant field. Only fields included in the body are changed. Does not regenerate payment cycles on fee change.

**Auth required:** Yes · URL param: `tenantId`

**Request Body** (all optional)
```json
{ "name": "New Name", "monthlyFee": 6000, "paymentStatus": "paid" }
```

**Response `200`**
```json
{ "message": "Tenant updated successfully", "tenant": { "..." : "..." } }
```

---

### DELETE `/api/tenant/:tenantId`
**Logic:** Deletes the tenant. Frees up one bed on the room (`occupiedBeds - 1`, `vacantBeds + 1`). Deletes all `Payment` records for this tenant.

**Auth required:** Yes · URL param: `tenantId`

**Response `200`**
```json
{ "message": "Tenant deleted successfully" }
```

---

## 6. Payment

### GET `/api/payment/hostel/:hostelId`
**Logic:** Fetches all tenants in the hostel, then fetches all their payment cycles in a single batch query (not N+1). Groups payments by tenant in memory and returns a summary per tenant showing paid count, unpaid count, and every cycle detail.

**Auth required:** Yes · URL param: `hostelId`

**Response `200`**
```json
{
  "payments": [{
    "tenantId": "...", "tenantName": "Arjun Mehta", "phoneNumber": "9876543210",
    "monthlyFee": 5000, "paid": 3, "unpaid": 2,
    "cycles": [{
      "_id": "...", "periodStart": "2026-01-01T00:00:00.000Z", "periodEnd": "2026-01-31T00:00:00.000Z",
      "amount": 5000, "isPaid": true, "paymentMethod": "UPI", "paymentDate": "2026-01-05T00:00:00.000Z", "note": "Jan rent"
    }]
  }]
}
```

---

### GET `/api/payment/:tenantId`
**Logic:** Returns all 30-day payment cycles for a specific tenant with a summary (total, paid, unpaid counts).

**Auth required:** Yes · URL param: `tenantId`

**Response `200`**
```json
{
  "tenantId": "...", "tenantName": "Arjun Mehta", "monthlyFee": 5000,
  "totalCycles": 5, "paid": 3, "unpaid": 2,
  "cycles": [{ "_id": "...", "periodStart": "...", "periodEnd": "...", "amount": 5000, "isPaid": true, "paymentMethod": "UPI", "paymentDate": "..." }]
}
```

---

### PUT `/api/payment/:paymentId`
**Logic:** Marks a payment cycle paid or unpaid. If `isPaid: true` and no `paymentDate` provided, automatically sets `paymentDate` to now (so analytics are not zero). If `isPaid: false`, clears `paymentDate` and `paymentMethod`. After saving, syncs the tenant's `feeStatus` array for the cycle's month/year, then recalculates `tenant.paymentStatus` (`"paid"` only if all feeStatus entries are paid).

**Auth required:** Yes · URL param: `paymentId`

**Request Body** (all optional)
| Field | Type | Description |
|---|---|---|
| `isPaid` | boolean | `true` = paid, `false` = unpaid |
| `paymentMethod` | string | `"Cash"`, `"UPI"`, `"Bank Transfer"`, `"Cheque"` |
| `paymentDate` | string | ISO date — defaults to now if marking paid |
| `amount` | number | Override cycle amount |
| `note` | string | Any note |

```json
{ "isPaid": true, "paymentMethod": "UPI", "note": "Paid via PhonePe" }
```

**Response `200`**
```json
{
  "message": "Payment updated successfully",
  "payment": { "_id": "...", "isPaid": true, "paymentMethod": "UPI", "paymentDate": "2026-06-20T10:30:00.000Z", "amount": 5000 }
}
```

**Errors:** `404` payment not found · `403` unauthorized

---

## 7. Expense

### POST `/api/expense/create`
**Logic:** Records an expense for a hostel. Extracts `month` and `year` from the provided date and stores them as separate indexed fields for efficient monthly filtering later.

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
  "expense": { "_id": "...", "expenseReason": "Plumbing repair", "amount": 2500, "date": "2026-06-15T00:00:00.000Z", "month": 6, "year": 2026 }
}
```

**Errors:** `400` missing required fields · `404` hostel not found

---

### GET `/api/expense/:hostelId`
**Logic:** Returns all expenses for a hostel sorted by date descending. Supports optional `month` and `year` query params for filtering.

**Auth required:** Yes · URL param: `hostelId`

**Query Params** (optional): `month=6&year=2026`

**Response `200`**
```json
{
  "expenses": [{ "_id": "...", "expenseReason": "Plumbing repair", "amount": 2500, "date": "2026-06-15T00:00:00.000Z", "month": 6, "year": 2026, "paymentMethod": "Cash" }]
}
```

---

### PUT `/api/expense/:expenseId`
**Logic:** Updates expense fields. If `date` is changed, `month` and `year` are automatically recalculated.

**Auth required:** Yes · URL param: `expenseId`

**Request Body** (all optional)
```json
{ "amount": 3000, "note": "Updated note", "date": "2026-06-20" }
```

**Response `200`**
```json
{ "message": "Expense updated successfully", "expense": { "..." : "..." } }
```

---

### DELETE `/api/expense/:expenseId`
**Logic:** Permanently deletes the expense record after verifying hostel ownership.

**Auth required:** Yes · URL param: `expenseId`

**Response `200`**
```json
{ "message": "Expense deleted successfully" }
```

---

## 8. Tickets — Owner

### GET `/api/tickets/hostel/:hostelId`
**Logic:** Returns all tickets raised for a hostel sorted newest first. Populates `tenantId` with tenant name, phone number, and room (with room number) so the owner can identify who raised each ticket.

**Auth required:** Yes · URL param: `hostelId`

**Response `200`**
```json
{
  "total": 2,
  "tickets": [{
    "_id": "...",
    "tenantId": { "_id": "...", "name": "Arjun Mehta", "phoneNumber": "9876543210", "roomId": { "_id": "...", "roomNumber": "101" } },
    "title": "AC not working", "category": "Maintenance",
    "description": "AC stopped cooling.", "imageLink": null,
    "status": "open", "createdAt": "2026-06-19T10:30:00.000Z"
  }]
}
```

---

### GET `/api/tickets/tenant/:tenantId`
**Logic:** Returns all tickets raised by a specific tenant. Owner must own the hostel the tenant belongs to.

**Auth required:** Yes · URL param: `tenantId`

**Response `200`**
```json
{
  "total": 1,
  "tickets": [{ "_id": "...", "title": "AC not working", "category": "Maintenance", "status": "open", "createdAt": "..." }]
}
```

---

### PUT `/api/tickets/:ticketId/status`
**Logic:** Updates the status of a ticket. Only allowed values are `"open"`, `"in-progress"`, `"resolved"`. Verifies the ticket belongs to a hostel owned by the authenticated owner.

**Auth required:** Yes · URL param: `ticketId`

**Request Body**
```json
{ "status": "in-progress" }
```

**Response `200`**
```json
{ "message": "Ticket status updated", "ticket": { "_id": "...", "status": "in-progress", "updatedAt": "..." } }
```

**Errors:** `400` invalid status value · `403` unauthorized · `404` ticket not found

---

## 9. Tenant Dashboard

These endpoints are for the **tenant-facing app**. They do **not** use the owner Bearer token. Instead a **dashboard JWT** (containing `hostelId` + `tenantId`, no expiry) is passed in the **request body**. This token is embedded in the welcome email link.

---

### POST `/api/dashboard`
**Logic:** Verifies the dashboard JWT. Fetches the tenant (verified against hostelId in token), hostel, room (scoped to hostelId), all payment cycles sorted by period, and all tickets. Computes totalDues, paidCycles, unpaidCycles, lastPaidDate from the payment array. Returns everything in one response.

**Auth required:** No — dashboard token in body

**Request Body**
```json
{ "token": "eyJhbGci..." }
```

**Response `200`**
```json
{
  "tenant": { "id": "...", "name": "Arjun Mehta", "phoneNumber": "9876543210", "email": "arjun@example.com", "occupation": "Student", "joinedDate": "2026-01-01T00:00:00.000Z", "paymentStatus": "pending" },
  "hostel": { "id": "...", "hostelName": "Sunrise PG", "hostelType": "boys", "ownerName": "Ravi Kumar", "ownerNumber": "9876543210", "email": "ravi@example.com" },
  "room": { "id": "...", "roomNumber": "101", "roomType": "NON AC", "totalBeds": 4 },
  "payments": {
    "monthlyRent": 5000, "deposit": 10000, "totalDues": 10000,
    "paidCycles": 3, "unpaidCycles": 2, "lastPaidDate": "2026-04-05T00:00:00.000Z",
    "cycles": [{ "_id": "...", "periodStart": "...", "periodEnd": "...", "amount": 5000, "isPaid": true, "paymentDate": "...", "paymentMethod": "UPI" }]
  },
  "tickets": [{ "_id": "...", "title": "AC not working", "category": "Maintenance", "status": "open", "createdAt": "..." }]
}
```

**Errors:** `400` token required · `401` invalid token · `404` tenant/hostel not found

---

### POST `/api/dashboard/ticket`
**Logic:** Verifies dashboard JWT, confirms tenant exists, creates a ticket with `status: "open"`. Ticket is immediately visible to the owner via `GET /api/tickets/hostel/:hostelId`.

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
{ "token": "eyJhbGci...", "title": "Leaking tap", "category": "Water", "description": "Bathroom tap leaking continuously.", "imageLink": null }
```

**Response `201`**
```json
{
  "message": "Ticket raised successfully",
  "ticket": { "_id": "...", "title": "Leaking tap", "category": "Water", "status": "open", "createdAt": "..." }
}
```

**Errors:** `400` title/category/description required · `401` invalid token · `404` tenant not found

---

### POST `/api/dashboard/tickets`
**Logic:** Verifies dashboard JWT and returns all tickets raised by that tenant sorted newest first.

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

Two-step self-registration flow: owner generates a short-lived link → tenant fills form → owner approves or rejects.

---

### POST `/api/temporary-tenant/generate-token`
**Logic:** Generates a 15-minute JWT containing `hostelId`. Verifies the hostel belongs to the authenticated owner. This token is embedded in a form link shared with the prospective tenant.

**Auth required:** Yes

**Request Body**
```json
{ "hostelId": "..." }
```

**Response `200`**
```json
{
  "token": "eyJhbGci...",
  "hostelId": "...",
  "issuedAt": "2026-06-20T11:00:00.000Z",
  "expiresAt": "2026-06-20T11:15:00.000Z",
  "expiresInMinutes": 15
}
```

**Errors:** `400` hostelId required · `404` hostel not found or unauthorized

---

### POST `/api/temporary-tenant/submit`
**Logic:** Public form submission. Reads the form token from `Authorization: Bearer <token>` header. Decodes the token to get `hostelId`. Resolves `floorNumber` → `floorId` and `roomNumber` → `roomId` automatically (tenant doesn't need to know IDs). Checks for vacant beds and for duplicate pending submissions by phone number. Creates a `TemporaryTenant` record for the owner to review.

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

**Errors:** `400` missing required fields · `400` no vacant beds · `400` duplicate phone number pending · `401` token required/expired/invalid · `404` floor/room not found

---

### GET `/api/temporary-tenant/hostel/:hostelId`
**Logic:** Returns all pending temporary tenant applications for a hostel, sorted newest first. Populates floor and room details.

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
**Logic:** Promotes a temporary tenant to a full tenant. Checks for vacant beds, creates the `Tenant` record, increments `occupiedBeds` on the room, generates 30-day payment cycles from `joinedDate` to today, deletes the temporary record, and sends a welcome email with a permanent dashboard link. Skips cycle generation if `joinedDate` is in the future (cron handles it later).

**Auth required:** Yes · URL param: `tempTenantId` · No body

**Response `201`**
```json
{
  "message": "Tenant approved and moved to tenants successfully",
  "tenant": { "_id": "...", "name": "Priya Sharma", "monthlyFee": 5000, "paymentStatus": "pending" }
}
```

**Errors:** `400` no vacant beds · `403` unauthorized · `404` temp tenant/room not found

---

### DELETE `/api/temporary-tenant/:tempTenantId`
**Logic:** Rejects and permanently deletes the temporary tenant application. No room bed counts are affected.

**Auth required:** Yes · URL param: `tempTenantId`

**Response `200`**
```json
{ "message": "Temporary tenant deleted successfully" }
```

---

## 11. Test Mail

### POST `/api/auth/test-mail`
**Logic:** Sends a test email to verify the mail service works. For `type: "welcome"`, if a real `tenantId` is provided, generates a proper JWT dashboard link for that tenant. Otherwise uses a preview placeholder URL. For `type: "reminder"`, sends a dummy payment reminder.

**Auth required:** No

**Request Body**
| Field | Type | Required |
|---|---|---|
| `to` | string | Yes — recipient email |
| `type` | string | No — `"welcome"` (default) or `"reminder"` |
| `tenantId` | string | No — if provided with welcome, uses real tenant data |

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

### Fee Status Cron — runs daily at 17:40 UTC

**Logic:** Iterates all tenants with `joinedDate` and `monthlyFee > 0`. For each, finds the most recent payment cycle. If the cycle's `periodEnd` is today or earlier (end-of-day comparison), generates the next 30-day cycle as a new `Payment` document. Also pushes a new `feeStatus` entry for the current month/year on any tenant missing one.

**Schedule:** `40 17 * * *`

---

### Payment Reminder Cron — runs daily at 12:00 PM UTC

**Logic:** Finds all unpaid payment cycles whose `periodEnd` has already passed (genuinely overdue). Groups by tenant (one email per tenant even if multiple cycles are due). Fetches tenant email, hostel name, room number. Computes total outstanding across all overdue cycles. Sends a payment reminder email with the total due and earliest cycle's due date. Skips tenants with no email.

**Schedule:** `0 12 * * *`

---

## Common HTTP Status Codes

| Status | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `400` | Bad Request — missing or invalid fields |
| `401` | Unauthorized — missing, invalid, or expired token |
| `403` | Forbidden — valid token but resource doesn't belong to you |
| `404` | Not Found |
| `500` | Internal Server Error |

---

## Key Notes

- All IDs are MongoDB ObjectIds (24-character hex strings)
- All timestamps are ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- Payment cycles are 30-day windows generated from `joinedDate` to today on tenant creation
- `feeStatus` on a tenant is synced from `Payment` collection when `PUT /api/payment/:paymentId` is called
- Dashboard token has **no expiry** — permanent link for the tenant
- Form token (temporary tenant) expires in **15 minutes**
- Welcome email is sent automatically on tenant create and temporary tenant approve
- Dashboard link format: `https://dashboard-frontend-five-rouge.vercel.app/?token=<jwt>`
