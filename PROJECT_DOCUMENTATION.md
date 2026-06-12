# Hostel Management System — Complete API Documentation

**Base URL (Local):** `http://localhost:4000`
**Base URL (Production):** `https://hostelmanegemnt.onrender.com`

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Authentication](#2-authentication)
3. [Database Models](#3-database-models)
4. [Auth API](#4-auth-api)
5. [Hostel API](#5-hostel-api)
6. [Floor API](#6-floor-api)
7. [Room API](#7-room-api)
8. [Tenant API](#8-tenant-api)
9. [Temporary Tenant API](#9-temporary-tenant-api)
10. [Expense API](#10-expense-api)
11. [Payment API](#11-payment-api)
12. [Dashboard API (Tenant-facing)](#12-dashboard-api-tenant-facing)
13. [Ticket API (Owner-facing)](#13-ticket-api-owner-facing)
14. [Cron Jobs](#14-cron-jobs)
15. [Error Reference](#15-error-reference)
16. [Quick Reference](#16-quick-reference)

---

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js v22 |
| Framework | Express.js v4.22 |
| Database | MongoDB (Mongoose v9) |
| Auth | JWT (jsonwebtoken) |
| Email | Brevo SMTP / REST API |
| Scheduler | node-cron |
| Config | dotenv |
| Deployment | Render |

---

## 2. Authentication

### Owner Auth (protected routes)
All owner-facing routes require:
```
Authorization: Bearer <owner-jwt>
```
The owner JWT is obtained from `POST /api/auth/register-login`. It expires in **30 days**.

### Dashboard Auth (tenant-facing routes)
Dashboard routes use a JWT passed in the **request body** as `token`. This JWT is generated when a tenant is created and sent via email/console. It has **no expiry** (permanent access link).

---

## 3. Database Models

### Owner
| Field | Type | Notes |
|-------|------|-------|
| ownerNumber | String | Unique, required |
| isExisted | Boolean | true if at least one hostel exists |

### Hostel
| Field | Type | Notes |
|-------|------|-------|
| ownerId | ObjectId | Ref: Owner |
| ownerNumber | String | |
| hostelName | String | Required |
| hostelType | String | Required |
| ownerName | String | Required |
| email | String | Optional |

### Floor
| Field | Type | Notes |
|-------|------|-------|
| hostelId | ObjectId | Ref: Hostel |
| floorNumber | Number | Required |

### Room
| Field | Type | Notes |
|-------|------|-------|
| hostelId | ObjectId | Ref: Hostel |
| floorId | ObjectId | Ref: Floor |
| roomNumber | String | Required |
| roomType | String | Required |
| totalBeds | Number | Required |
| occupiedBeds | Number | Auto-managed |
| vacantBeds | Number | Auto-managed |

### Tenant
| Field | Type | Notes |
|-------|------|-------|
| hostelId | ObjectId | Ref: Hostel |
| floorId | ObjectId | Ref: Floor |
| roomId | ObjectId | Ref: Room |
| name | String | Required |
| phoneNumber | String | Required |
| email | String | |
| address | String | |
| parentNumber | String | |
| aadhaarNumber | String | |
| occupation | String | |
| joinedDate | Date | |
| monthlyFee | Number | |
| deposit | Number | |
| paymentStatus | String | `paid` / `pending` — auto-synced |
| feeStatus | Array | `[{month, year, isPaid}]` |

### TemporaryTenant
Same fields as Tenant. Stored separately until owner approves.

### Expense
| Field | Type | Notes |
|-------|------|-------|
| hostelId | ObjectId | Ref: Hostel |
| expenseReason | String | Required |
| amount | Number | Required |
| date | Date | Required |
| paymentMethod | String | |
| note | String | |
| month | Number | Auto from date |
| year | Number | Auto from date |

### Payment
| Field | Type | Notes |
|-------|------|-------|
| hostelId | ObjectId | Ref: Hostel |
| tenantId | ObjectId | Ref: Tenant |
| amount | Number | Required |
| periodStart | Date | Cycle start |
| periodEnd | Date | periodStart + 30 days |
| isPaid | Boolean | default: false |
| paymentMethod | String | |
| paymentDate | Date | When marked paid |
| note | String | |

### Ticket
| Field | Type | Notes |
|-------|------|-------|
| hostelId | ObjectId | Ref: Hostel |
| tenantId | ObjectId | Ref: Tenant |
| title | String | Required |
| category | String | Required |
| description | String | Required |
| imageLink | String | Optional, default: null |
| status | String | `open` / `in-progress` / `resolved` |

---

## 4. Auth API

### Register / Login
**POST** `/api/auth/register-login`

No auth required. Creates owner if new, returns token if existing.

**Request Body:**
```json
{ "ownerNumber": "9876543210" }
```

**Response `201` (new owner):**
```json
{
  "token": "eyJ...",
  "isExisted": false,
  "owner": { "_id": "...", "ownerNumber": "9876543210", "isExisted": false },
  "hostels": []
}
```

**Response `200` (existing owner):**
```json
{
  "token": "eyJ...",
  "isExisted": true,
  "owner": { "_id": "...", "ownerNumber": "9876543210", "isExisted": true },
  "hostels": [{ "_id": "...", "hostelName": "Blue Pink", "hostelType": "boys" }]
}
```

**Errors:**
```json
{ "message": "ownerNumber is required" }  // 400
```

---

## 5. Hostel API

> All routes require `Authorization: Bearer <owner-token>`

### Create Hostel
**POST** `/api/hostel/create`

**Request Body:**
```json
{
  "hostelName": "Green Valley Hostel",
  "hostelType": "boys",
  "ownerName": "John Doe",
  "email": "john@example.com"
}
```

**Required:** `hostelName`, `hostelType`, `ownerName`

**Response `201`:**
```json
{
  "message": "Hostel created successfully",
  "hostel": {
    "_id": "...", "hostelName": "Green Valley Hostel",
    "hostelType": "boys", "ownerName": "John Doe",
    "ownerNumber": "9876543210", "ownerId": "..."
  }
}
```

---

### List Hostels
**GET** `/api/hostel/list`

**Response `200`:**
```json
{ "hostels": [{ "_id": "...", "hostelName": "Green Valley", "hostelType": "boys" }] }
```

---

### Owner Analytics
**GET** `/api/hostel/analytics`

Returns overall stats + per-hostel breakdown.

**Response `200`:**
```json
{
  "overall": {
    "todayCollection": 8000,
    "monthlyCollection": 45000,
    "totalDues": 20000,
    "totalTenants": 18,
    "vacantBeds": 6,
    "totalBeds": 24,
    "occupiedBeds": 18,
    "paidTenants": 12,
    "unpaidTenants": 6
  },
  "hostels": [
    {
      "hostelId": "...", "hostelName": "Green Valley", "hostelType": "boys",
      "todayCollection": 5000, "monthlyCollection": 28000,
      "totalDues": 12000, "totalTenants": 10,
      "vacantBeds": 2, "totalBeds": 12, "occupiedBeds": 10,
      "paidTenants": 7, "unpaidTenants": 3
    }
  ]
}
```

---

### Get Hostel by ID
**GET** `/api/hostel/:hostelId`

**Response `200`:**
```json
{ "hostel": { "_id": "...", "hostelName": "...", "hostelType": "..." } }
```

---

### Update Hostel
**PUT** `/api/hostel/:hostelId`

All fields optional.

**Request Body:**
```json
{ "hostelName": "New Name", "hostelType": "girls", "ownerName": "Jane", "email": "jane@example.com" }
```

**Response `200`:**
```json
{ "message": "Hostel updated successfully", "hostel": { ... } }
```

---

### Delete Hostel
**DELETE** `/api/hostel/:hostelId`

Cascade deletes: floors, rooms, tenants, payments, expenses, announcements, complaints, temporary tenants.

**Response `200`:**
```json
{ "message": "Hostel and all related data deleted successfully" }
```

---

## 6. Floor API

> All routes require `Authorization: Bearer <owner-token>`

### Create Floor
**POST** `/api/floor/create`

**Request Body:**
```json
{ "hostelId": "...", "floorNumber": 1 }
```

**Response `201`:**
```json
{ "message": "Floor created successfully", "floor": { "_id": "...", "hostelId": "...", "floorNumber": 1 } }
```

---

### Get Floors by Hostel
**GET** `/api/floor/:hostelId`

**Response `200`:**
```json
{ "floors": [{ "_id": "...", "floorNumber": 1 }, { "_id": "...", "floorNumber": 2 }] }
```

---

### Get Floor by ID
**GET** `/api/floor/single/:floorId`

**Response `200`:**
```json
{ "floor": { "_id": "...", "floorNumber": 1, "hostelId": { "_id": "...", "hostelName": "..." } } }
```

---

### Get Floor Details (with rooms and tenants)
**GET** `/api/floor/:hostelId/details/:floorNumber`

**Response `200`:**
```json
{
  "floorNumber": 1, "floorId": "...", "hostelId": "...",
  "rooms": [
    {
      "room": { "_id": "...", "roomNumber": "101", "roomType": "single", "totalBeds": 2, "occupiedBeds": 1, "vacantBeds": 1 },
      "tenants": [{ "_id": "...", "name": "John", "phoneNumber": "...", "paymentStatus": "pending" }]
    }
  ]
}
```

---

### Update Floor
**PUT** `/api/floor/:floorId`

**Request Body:** `{ "floorNumber": 3 }`

**Response `200`:**
```json
{ "message": "Floor updated successfully", "floor": { ... } }
```

---

### Delete Floor
**DELETE** `/api/floor/:floorId`

Cascade deletes: rooms, tenants, payments in those rooms.

**Response `200`:**
```json
{ "message": "Floor and associated rooms and tenants deleted successfully" }
```

---

## 7. Room API

> All routes require `Authorization: Bearer <owner-token>`

### Create Room
**POST** `/api/room/create`

**Request Body:**
```json
{
  "hostelId": "...", "floorId": "...",
  "roomNumber": "101", "roomType": "single", "totalBeds": 2
}
```

**Required:** `hostelId`, `floorId`, `roomNumber`, `roomType`, `totalBeds`

**Response `201`:**
```json
{
  "message": "Room created successfully",
  "room": { "_id": "...", "roomNumber": "101", "roomType": "single", "totalBeds": 2, "occupiedBeds": 0, "vacantBeds": 2 }
}
```

---

### Get Rooms by Hostel
**GET** `/api/room/:hostelId`

**Response `200`:**
```json
{ "rooms": [{ "_id": "...", "roomNumber": "101", "totalBeds": 2, "vacantBeds": 1, "floorId": { "floorNumber": 1 } }] }
```

---

### Get Rooms by Floor
**GET** `/api/room/floor/:floorId`

**Response `200`:**
```json
{ "rooms": [{ "_id": "...", "roomNumber": "101", "roomType": "single" }] }
```

---

### Get Room by ID
**GET** `/api/room/single/:roomId`

**Response `200`:**
```json
{ "room": { "_id": "...", "roomNumber": "101", "totalBeds": 2, "vacantBeds": 1 } }
```

---

### Update Room
**PUT** `/api/room/:roomId`

All fields optional. `vacantBeds` auto-recalculates when `totalBeds` is updated.

**Request Body:**
```json
{ "roomNumber": "102", "roomType": "double", "totalBeds": 4 }
```

**Response `200`:**
```json
{ "message": "Room updated successfully", "room": { ... } }
```

---

### Delete Room
**DELETE** `/api/room/:roomId`

Cascade deletes tenants and their payments.

**Response `200`:**
```json
{ "message": "Room and associated tenants deleted successfully" }
```

---

## 8. Tenant API

> All routes require `Authorization: Bearer <owner-token>`

### Create Tenant
**POST** `/api/tenant/create`

On creation: room beds updated, 30-day payment cycles generated from `joinedDate` to today, dashboard link logged to console.

**Request Body:**
```json
{
  "hostelId": "...", "floorId": "...", "roomId": "...",
  "name": "John Doe", "phoneNumber": "9876543210",
  "email": "john@example.com", "address": "123 Main St",
  "parentNumber": "9876500000", "aadhaarNumber": "1234-5678-9012",
  "occupation": "Student", "joinedDate": "2026-05-01",
  "monthlyFee": 5000, "deposit": 10000
}
```

**Required:** `hostelId`, `floorId`, `roomId`, `name`, `phoneNumber`

**Response `201`:**
```json
{
  "message": "Tenant created successfully",
  "tenant": {
    "_id": "...", "name": "John Doe", "phoneNumber": "9876543210",
    "paymentStatus": "pending",
    "feeStatus": [{ "month": 5, "year": 2026, "isPaid": false }]
  }
}
```

> After response, a dashboard link is logged: `[DASHBOARD] John Doe | john@example.com | http://localhost:3000?token=eyJ...`

---

### Get Tenants by Hostel
**GET** `/api/tenant/:hostelId`

**Response `200`:**
```json
{
  "tenants": [{
    "_id": "...", "name": "John Doe", "phoneNumber": "...",
    "paymentStatus": "pending",
    "floorId": { "floorNumber": 1 },
    "roomId": { "roomNumber": "101", "roomType": "single" }
  }]
}
```

---

### Get Tenant by ID
**GET** `/api/tenant/single/:tenantId`

**Response `200`:**
```json
{
  "tenant": {
    "_id": "...", "name": "John Doe", "email": "john@example.com",
    "joinedDate": "2026-05-01T00:00:00.000Z", "monthlyFee": 5000,
    "paymentStatus": "pending", "feeStatus": [{ "month": 5, "year": 2026, "isPaid": false }],
    "floorId": { "floorNumber": 1 }, "roomId": { "roomNumber": "101" }
  }
}
```

---

### Update Tenant
**PUT** `/api/tenant/:tenantId`

All fields optional.

**Request Body:**
```json
{ "name": "Jane Doe", "monthlyFee": 6000, "paymentStatus": "paid" }
```

**Response `200`:**
```json
{ "message": "Tenant updated successfully", "tenant": { ... } }
```

---

### Delete Tenant
**DELETE** `/api/tenant/:tenantId`

Room beds updated. All payment records deleted.

**Response `200`:**
```json
{ "message": "Tenant deleted successfully" }
```

---

## 9. Temporary Tenant API

### Generate Form Token
**POST** `/api/temporary-tenant/generate-token`

No auth required. Generates a 15-minute token for the tenant form.

**Request Body:**
```json
{ "hostelId": "..." }
```

**Response `200`:**
```json
{
  "token": "eyJ...", "hostelId": "...",
  "issuedAt": "2026-05-20T10:00:00.000Z",
  "expiresAt": "2026-05-20T10:15:00.000Z",
  "expiresInMinutes": 15
}
```

---

### Submit Tenant Form
**POST** `/api/temporary-tenant/submit`

Uses the form token as Bearer token. Accepts `floorNumber` and `roomNumber` (not ObjectIds) — resolved internally.

**Headers:**
```
Authorization: Bearer <form-token>
```

**Request Body:**
```json
{
  "floorNumber": 1, "roomNumber": "101",
  "name": "John Doe", "phoneNumber": "9876543210",
  "email": "john@example.com", "address": "123 Main St",
  "parentNumber": "9876500000", "aadhaarNumber": "1234-5678-9012",
  "occupation": "Student", "joinedDate": "2026-05-01",
  "monthlyFee": 5000, "deposit": 10000
}
```

**Required:** `floorNumber`, `roomNumber`, `name`, `phoneNumber`

**Response `201`:**
```json
{ "message": "Form submitted successfully", "temporaryTenant": { "_id": "...", "name": "John Doe", ... } }
```

---

### Get Temporary Tenants by Hostel
**GET** `/api/temporary-tenant/hostel/:hostelId`

> Requires owner auth.

**Response `200`:**
```json
{
  "hostelId": "...", "total": 2,
  "tenants": [{
    "_id": "...", "name": "John Doe", "phoneNumber": "...",
    "floorId": { "floorNumber": 1 }, "roomId": { "roomNumber": "101" },
    "paymentStatus": "pending"
  }]
}
```

---

### Approve Temporary Tenant
**POST** `/api/temporary-tenant/approve/:tempTenantId`

> Requires owner auth.

Converts to full tenant, updates room beds, generates payment cycles, deletes temp record.

**Response `201`:**
```json
{ "message": "Tenant approved and moved to tenants successfully", "tenant": { ... } }
```

---

### Delete Temporary Tenant
**DELETE** `/api/temporary-tenant/:tempTenantId`

> Requires owner auth. Rejects the application.

**Response `200`:**
```json
{ "message": "Temporary tenant deleted successfully" }
```

---

## 10. Expense API

> All routes require `Authorization: Bearer <owner-token>`

### Create Expense
**POST** `/api/expense/create`

`month` and `year` auto-extracted from `date`.

**Request Body:**
```json
{
  "hostelId": "...", "expenseReason": "Electricity Bill",
  "amount": 3500, "date": "2026-05-16",
  "paymentMethod": "cash", "note": "May electricity bill"
}
```

**Required:** `hostelId`, `expenseReason`, `amount`, `date`

**Response `201`:**
```json
{
  "message": "Expense created successfully",
  "expense": { "_id": "...", "expenseReason": "Electricity Bill", "amount": 3500, "month": 5, "year": 2026 }
}
```

---

### Get Expenses by Hostel
**GET** `/api/expense/:hostelId`

Optional query params: `?month=5&year=2026`

**Response `200`:**
```json
{ "expenses": [{ "_id": "...", "expenseReason": "Electricity Bill", "amount": 3500, "month": 5, "year": 2026 }] }
```

---

### Update Expense
**PUT** `/api/expense/:expenseId`

All fields optional. `month`/`year` auto-recalculated if `date` is updated.

**Request Body:**
```json
{ "amount": 4000, "paymentMethod": "upi", "note": "Updated" }
```

**Response `200`:**
```json
{ "message": "Expense updated successfully", "expense": { ... } }
```

---

### Delete Expense
**DELETE** `/api/expense/:expenseId`

**Response `200`:**
```json
{ "message": "Expense deleted successfully" }
```

---

## 11. Payment API

> All routes require `Authorization: Bearer <owner-token>`

Payment cycles are auto-generated (30 days) from `joinedDate`. `isPaid`, `paymentMethod`, `paymentDate` can be updated. When `isPaid` is changed, the tenant's `feeStatus` and `paymentStatus` are automatically synced.

### Get Payments by Tenant
**GET** `/api/payment/:tenantId`

**Response `200`:**
```json
{
  "tenantId": "...", "tenantName": "John Doe", "monthlyFee": 5000,
  "totalCycles": 3, "paid": 2, "unpaid": 1,
  "cycles": [
    { "_id": "...", "periodStart": "2026-01-01T00:00:00.000Z", "periodEnd": "2026-01-31T00:00:00.000Z", "amount": 5000, "isPaid": true, "paymentDate": "2026-01-05T00:00:00.000Z", "paymentMethod": "upi" },
    { "_id": "...", "periodStart": "2026-01-31T00:00:00.000Z", "periodEnd": "2026-03-02T00:00:00.000Z", "amount": 5000, "isPaid": false, "paymentDate": null, "paymentMethod": null }
  ]
}
```

---

### Get Payments by Hostel
**GET** `/api/payment/hostel/:hostelId`

**Response `200`:**
```json
{
  "payments": [{
    "tenantId": "...", "tenantName": "John Doe", "phoneNumber": "...",
    "monthlyFee": 5000, "paid": 2, "unpaid": 1, "cycles": [...]
  }]
}
```

---

### Update Payment
**PUT** `/api/payment/:paymentId`

All fields optional. Syncs tenant `feeStatus` and `paymentStatus` automatically.

**Request Body:**
```json
{ "isPaid": true, "paymentMethod": "upi", "paymentDate": "2026-05-21", "amount": 5000, "note": "Paid on time" }
```

**Response `200`:**
```json
{ "message": "Payment updated successfully", "payment": { "_id": "...", "isPaid": true, "paymentMethod": "upi", "paymentDate": "..." } }
```

---

## 12. Dashboard API (Tenant-facing)

All dashboard routes use **token in request body** (not header). The token is the JWT from the welcome email/dashboard link.

### Get Tenant Dashboard
**POST** `/api/dashboard`

Returns all tenant data in one call.

**Request Body:**
```json
{ "token": "<dashboard-jwt>" }
```

**Response `200`:**
```json
{
  "tenant": {
    "id": "...", "name": "Dinesh", "phoneNumber": "9876543210",
    "email": "dinesh@example.com", "occupation": "Student",
    "joinedDate": "2026-05-21T00:00:00.000Z", "paymentStatus": "pending"
  },
  "hostel": {
    "id": "...", "hostelName": "Test Hostel", "hostelType": "boys",
    "ownerName": "Test Owner", "ownerNumber": "9876543210", "email": "owner@example.com"
  },
  "room": { "id": "...", "roomNumber": "101", "roomType": "single", "totalBeds": 2 },
  "payments": {
    "monthlyRent": 6000, "deposit": 12000,
    "totalDues": 6000, "paidCycles": 0, "unpaidCycles": 1, "lastPaidDate": null,
    "cycles": [
      { "_id": "...", "periodStart": "2026-05-21T00:00:00.000Z", "periodEnd": "2026-06-20T00:00:00.000Z", "amount": 6000, "isPaid": false, "paymentDate": null, "paymentMethod": null }
    ]
  },
  "tickets": [
    { "_id": "...", "title": "Water leakage", "category": "Maintenance", "description": "...", "imageLink": null, "status": "in-progress", "createdAt": "..." }
  ]
}
```

---

### Raise a Ticket
**POST** `/api/dashboard/ticket`

**Request Body:**
```json
{
  "token": "<dashboard-jwt>",
  "title": "Water leakage",
  "category": "Maintenance",
  "description": "There is water leaking from the bathroom ceiling.",
  "imageLink": "https://example.com/photo.jpg"
}
```

**Required:** `token`, `title`, `category`, `description`
**Optional:** `imageLink`

**Response `201`:**
```json
{
  "message": "Ticket raised successfully",
  "ticket": { "_id": "...", "title": "Water leakage", "category": "Maintenance", "status": "open", "imageLink": null }
}
```

---

### Get My Tickets
**POST** `/api/dashboard/tickets`

**Request Body:**
```json
{ "token": "<dashboard-jwt>" }
```

**Response `200`:**
```json
{
  "total": 2,
  "tickets": [
    { "_id": "...", "title": "AC not working", "category": "Electrical", "status": "open", "createdAt": "..." },
    { "_id": "...", "title": "Water leakage", "category": "Maintenance", "status": "in-progress", "createdAt": "..." }
  ]
}
```

---

### Dashboard API Errors

| Status | Message | Reason |
|--------|---------|--------|
| `400` | `Token is required` | No token in body |
| `400` | `title, category and description are required` | Missing fields |
| `401` | `Invalid token` | Bad/tampered token |
| `401` | `Dashboard link has expired` | Token expired |
| `401` | `Invalid token payload` | Missing hostelId/tenantId in token |
| `404` | `Tenant not found` | Tenant deleted |
| `404` | `Hostel not found` | Hostel deleted |

---

## 13. Ticket API (Owner-facing)

> All routes require `Authorization: Bearer <owner-token>`

### Get Tickets by Hostel
**GET** `/api/tickets/hostel/:hostelId`

Returns all tickets with tenant info populated.

**Response `200`:**
```json
{
  "total": 1,
  "tickets": [{
    "_id": "...", "title": "Water leakage", "category": "Maintenance",
    "description": "...", "imageLink": null, "status": "in-progress",
    "tenantId": { "_id": "...", "name": "Dinesh", "phoneNumber": "9876543210", "roomId": "..." },
    "createdAt": "...", "updatedAt": "..."
  }]
}
```

---

### Get Tickets by Tenant
**GET** `/api/tickets/tenant/:tenantId`

**Response `200`:**
```json
{
  "total": 2,
  "tickets": [
    { "_id": "...", "title": "AC not working", "category": "Electrical", "status": "open" },
    { "_id": "...", "title": "Water leakage", "category": "Maintenance", "status": "in-progress" }
  ]
}
```

---

### Update Ticket Status
**PUT** `/api/tickets/:ticketId/status`

**Request Body:**
```json
{ "status": "resolved" }
```

**Allowed values:** `open` | `in-progress` | `resolved`

**Response `200`:**
```json
{ "message": "Ticket status updated", "ticket": { "_id": "...", "status": "resolved", ... } }
```

**Errors:**
```json
{ "message": "status must be one of: open, in-progress, resolved" }  // 400
{ "message": "Ticket not found" }                                     // 404
{ "message": "Unauthorized" }                                         // 403
```

---

## 14. Cron Jobs

### Daily Payment Cycle Generator
**File:** `cron/feeStatusCron.js`
**Schedule:** `0 0 * * *` — daily at midnight

- Generates next 30-day payment cycle for tenants whose current cycle has ended
- Adds `{month, year, isPaid: false}` to tenant `feeStatus` for the current month if missing

### Payment Reminder
**File:** `cron/paymentReminderCron.js`
**Schedule:** `0 12 * * *` — daily at 12:00 PM

- Finds all unpaid payments whose `periodStart <= today`
- Groups by tenant — sends **one email per tenant** with total outstanding amount
- Skips tenants with no email
- Repeats daily until `isPaid: true`

### Health Check
**File:** `cron/healthCheckCron.js`
**Schedule:** `*/12 * * * *` — every 12 minutes

- Logs `[HEALTH] Server is alive at <timestamp>`
- Keeps the Render free-tier server awake

---

## 15. Error Reference

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request / missing required fields |
| `401` | No token / invalid token / expired token |
| `403` | Valid token but not authorized for this resource |
| `404` | Resource not found |
| `500` | Internal server error |

### Common Auth Errors
```json
{ "message": "No token, authorization denied" }   // missing header
{ "message": "Invalid or expired token" }         // bad JWT
{ "message": "Owner not found" }                  // token valid but owner deleted
```

---

## 16. Quick Reference

### Owner APIs (Bearer token required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register-login` | Register or login |
| POST | `/api/hostel/create` | Create hostel |
| GET | `/api/hostel/list` | List owner's hostels |
| GET | `/api/hostel/analytics` | Owner analytics dashboard |
| GET | `/api/hostel/:hostelId` | Get hostel by ID |
| PUT | `/api/hostel/:hostelId` | Update hostel |
| DELETE | `/api/hostel/:hostelId` | Delete hostel + all data |
| POST | `/api/floor/create` | Create floor |
| GET | `/api/floor/:hostelId` | List floors |
| GET | `/api/floor/single/:floorId` | Get floor by ID |
| GET | `/api/floor/:hostelId/details/:floorNumber` | Floor with rooms and tenants |
| PUT | `/api/floor/:floorId` | Update floor |
| DELETE | `/api/floor/:floorId` | Delete floor + cascade |
| POST | `/api/room/create` | Create room |
| GET | `/api/room/:hostelId` | List rooms by hostel |
| GET | `/api/room/floor/:floorId` | List rooms by floor |
| GET | `/api/room/single/:roomId` | Get room by ID |
| PUT | `/api/room/:roomId` | Update room |
| DELETE | `/api/room/:roomId` | Delete room + tenants |
| POST | `/api/tenant/create` | Create tenant |
| GET | `/api/tenant/:hostelId` | List tenants by hostel |
| GET | `/api/tenant/single/:tenantId` | Get tenant by ID |
| PUT | `/api/tenant/:tenantId` | Update tenant |
| DELETE | `/api/tenant/:tenantId` | Delete tenant |
| POST | `/api/expense/create` | Create expense |
| GET | `/api/expense/:hostelId` | List expenses (filter: `?month=&year=`) |
| PUT | `/api/expense/:expenseId` | Update expense |
| DELETE | `/api/expense/:expenseId` | Delete expense |
| GET | `/api/payment/hostel/:hostelId` | All payments for hostel |
| GET | `/api/payment/:tenantId` | Payment cycles for tenant |
| PUT | `/api/payment/:paymentId` | Update payment status |
| GET | `/api/temporary-tenant/hostel/:hostelId` | List pending applications |
| POST | `/api/temporary-tenant/approve/:tempTenantId` | Approve application |
| DELETE | `/api/temporary-tenant/:tempTenantId` | Reject application |
| GET | `/api/tickets/hostel/:hostelId` | All tickets for hostel |
| GET | `/api/tickets/tenant/:tenantId` | Tickets by tenant |
| PUT | `/api/tickets/:ticketId/status` | Update ticket status |

### Public APIs (no auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/temporary-tenant/generate-token` | Generate 15-min form token |
| POST | `/api/temporary-tenant/submit` | Submit tenant application (form token as Bearer) |

### Tenant Dashboard APIs (token in request body)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/dashboard` | Full dashboard data |
| POST | `/api/dashboard/ticket` | Raise a support ticket |
| POST | `/api/dashboard/tickets` | View my tickets |
