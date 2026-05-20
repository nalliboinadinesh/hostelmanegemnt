# Hostel Management System — Complete Documentation

**Base URL:** `http://localhost:4000`
**Version:** 1.0.0
**Database:** MongoDB Atlas

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Structure](#3-project-structure)
4. [Environment Setup](#4-environment-setup)
5. [Database Models](#5-database-models)
6. [Authentication & Middleware](#6-authentication--middleware)
7. [API Reference](#7-api-reference)
   - [Auth](#71-auth)
   - [Hostel](#72-hostel)
   - [Floor](#73-floor)
   - [Room](#74-room)
   - [Tenant](#75-tenant)
   - [Expense](#76-expense)
   - [Payment](#77-payment)
   - [Temporary Tenant](#78-temporary-tenant)
8. [Cron Jobs](#8-cron-jobs)
9. [Cascade Delete Behaviour](#9-cascade-delete-behaviour)
10. [Error Reference](#10-error-reference)
11. [API Quick Reference Table](#11-api-quick-reference-table)
12. [Deployment](#12-deployment)

---

## 1. Project Overview

A backend REST API for hostel management. Owners register using their phone number, create and manage multiple hostels, floors, rooms, and tenants. The system auto-generates 30-day rent payment cycles per tenant, tracks expenses, and includes a public tenant self-registration form flow via short-lived tokens.

---

## 2. Tech Stack & Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | 4.21.2 | Web framework |
| mongoose | ^9.6.2 | MongoDB ODM |
| jsonwebtoken | ^9.0.3 | JWT auth |
| dotenv | ^17.4.2 | Environment config |
| node-cron | ^4.2.1 | Scheduled jobs |
| cors | ^2.8.6 | Cross-origin requests |
| nodemon | ^3.1.14 | Dev auto-restart |

---

## 3. Project Structure

```
hostelManagement/
├── config/
│   └── db.js                        # MongoDB connection
├── controller/
│   ├── authController.js
│   ├── hostelController.js
│   ├── floorController.js
│   ├── roomController.js
│   ├── tenantController.js
│   ├── expenseController.js
│   ├── paymentController.js
│   └── temporaryTenantController.js
├── cron/
│   ├── feeStatusCron.js             # Daily payment cycle generator
│   └── healthCheckCron.js           # 12-min heartbeat
├── middleware/
│   └── authMiddleware.js            # JWT protect middleware
├── models/
│   ├── Owner.js
│   ├── Hostel.js
│   ├── Floor.js
│   ├── Room.js
│   ├── Tenant.js
│   ├── Expense.js
│   ├── Payment.js
│   └── TemporaryTenant.js
├── routes/
│   ├── authRoutes.js
│   ├── hostelRoutes.js
│   ├── floorRoutes.js
│   ├── roomRoutes.js
│   ├── tenantRoutes.js
│   ├── expenseRoutes.js
│   ├── paymentRoutes.js
│   └── temporaryTenantRoutes.js
├── .env
├── server.js
└── package.json
```

---

## 4. Environment Setup

Create a `.env` file at the project root:

```env
PORT=4000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=<app>
JWT_SECRET=your_strong_secret_key
```

Start the server:
```bash
# Development
npx nodemon server.js

# Production
node server.js
```

---

## 5. Database Models

### Owner — Collection: `owners`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| ownerNumber | String | Yes | Unique, phone number |
| isExisted | Boolean | No | true if hostel exists, default: false |
| createdAt | Date | Auto | |
| updatedAt | Date | Auto | |

### Hostel — Collection: `hostels`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| ownerId | ObjectId | Yes | Ref: Owner |
| ownerNumber | String | Yes | |
| hostelName | String | Yes | |
| hostelType | String | Yes | e.g. boys / girls / co-living |
| ownerName | String | Yes | |
| email | String | No | |

### Floor — Collection: `floors`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| hostelId | ObjectId | Yes | Ref: Hostel |
| floorNumber | Number | Yes | |

### Room — Collection: `rooms`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| hostelId | ObjectId | Yes | Ref: Hostel |
| floorId | ObjectId | Yes | Ref: Floor |
| roomNumber | String | Yes | |
| roomType | String | Yes | e.g. single / double / triple |
| totalBeds | Number | Yes | |
| occupiedBeds | Number | No | Auto-managed, default: 0 |
| vacantBeds | Number | No | Auto-managed, default: 0 |

### Tenant — Collection: `tenants`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| hostelId | ObjectId | Yes | Ref: Hostel |
| floorId | ObjectId | Yes | Ref: Floor |
| roomId | ObjectId | Yes | Ref: Room |
| name | String | Yes | |
| phoneNumber | String | Yes | |
| email | String | No | |
| address | String | No | |
| parentNumber | String | No | |
| aadhaarNumber | String | No | |
| occupation | String | No | |
| joinedDate | Date | No | |
| monthlyFee | Number | No | |
| deposit | Number | No | |
| paymentStatus | String | No | default: pending |
| feeStatus | Array | No | [{month, year, isPaid}] |

### Expense — Collection: `expenses`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| hostelId | ObjectId | Yes | Ref: Hostel |
| expenseReason | String | Yes | |
| amount | Number | Yes | |
| date | Date | Yes | |
| paymentMethod | String | No | |
| note | String | No | |
| month | Number | No | Auto from date |
| year | Number | No | Auto from date |

### Payment — Collection: `payments`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| hostelId | ObjectId | Yes | Ref: Hostel |
| tenantId | ObjectId | Yes | Ref: Tenant |
| amount | Number | Yes | |
| periodStart | Date | Yes | Cycle start |
| periodEnd | Date | Yes | periodStart + 30 days |
| isPaid | Boolean | No | default: false |
| paymentMethod | String | No | |
| paymentDate | Date | No | Actual date paid |
| note | String | No | |

### TemporaryTenant — Collection: `temporaryTenants`
Same schema as Tenant. Stores public form submissions before owner approval.

---

## 6. Authentication & Middleware

### JWT Token
- Owner token expires in **30 days**
- Form token (temporary tenant) expires in **15 minutes**
- Pass token in header: `Authorization: Bearer <token>`

### protect middleware
Applied to all routes except `/api/auth/register-login`, `/api/temporary-tenant/generate-token`, and `/api/temporary-tenant/submit`.

Verifies JWT, loads owner from DB, attaches to `req.owner`.

---

## 7. API Reference

> Protected routes require: `Authorization: Bearer <token>`

---

### 7.1 Auth

#### Register / Login
**POST** `/api/auth/register-login` — No auth required

**Request Body:**
```json
{ "ownerNumber": "9876543210" }
```

**Response — New Owner `201`:**
```json
{
  "token": "eyJhbGci...",
  "isExisted": false,
  "owner": { "_id": "...", "ownerNumber": "9876543210", "isExisted": false },
  "hostels": []
}
```

**Response — Existing Owner `200`:**
```json
{
  "token": "eyJhbGci...",
  "isExisted": true,
  "owner": { "_id": "...", "ownerNumber": "9876543210", "isExisted": true },
  "hostels": [
    { "_id": "...", "hostelName": "SOSA", "hostelType": "boys", "ownerName": "Sosa" }
  ]
}
```

| Status | Message |
|--------|---------|
| `400` | ownerNumber is required |
| `500` | Internal server error |

---

### 7.2 Hostel

#### Create Hostel
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

**Response `201`:**
```json
{
  "message": "Hostel created successfully",
  "hostel": {
    "_id": "664b2a...", "ownerId": "664a1f...", "ownerNumber": "9876543210",
    "hostelName": "Green Valley Hostel", "hostelType": "boys",
    "ownerName": "John Doe", "email": "john@example.com"
  }
}
```

| Status | Message |
|--------|---------|
| `400` | hostelName, hostelType and ownerName are required |
| `401` | No token, authorization denied |

---

#### Get All Hostels
**GET** `/api/hostel/list`

**Response `200`:**
```json
{ "hostels": [{ "_id": "...", "hostelName": "Green Valley Hostel", ... }] }
```

---

#### Get Hostel by ID
**GET** `/api/hostel/:hostelId`

**Response `200`:**
```json
{ "hostel": { "_id": "...", "hostelName": "Green Valley Hostel", ... } }
```

| Status | Message |
|--------|---------|
| `404` | Hostel not found or unauthorized |

---

#### Update Hostel
**PUT** `/api/hostel/:hostelId` — All fields optional

**Request Body:**
```json
{ "hostelName": "Blue Ridge", "hostelType": "girls", "ownerName": "Jane", "email": "jane@example.com" }
```

**Response `200`:**
```json
{ "message": "Hostel updated successfully", "hostel": { ... } }
```

---

#### Delete Hostel
**DELETE** `/api/hostel/:hostelId`

**Response `200`:**
```json
{ "message": "Hostel deleted successfully" }
```

> Updates `owner.isExisted` to false if no hostels remain.

---

### 7.3 Floor

#### Create Floor
**POST** `/api/floor/create`

**Request Body:**
```json
{ "hostelId": "664b2a...", "floorNumber": 1 }
```

**Response `201`:**
```json
{
  "message": "Floor created successfully",
  "floor": { "_id": "664c3b...", "hostelId": "664b2a...", "floorNumber": 1 }
}
```

| Status | Message |
|--------|---------|
| `400` | hostelId and floorNumber are required |
| `400` | Floor number already exists in this hostel |
| `404` | Hostel not found or unauthorized |

---

#### Get Floors by Hostel
**GET** `/api/floor/:hostelId`

**Response `200`:**
```json
{ "floors": [{ "_id": "...", "floorNumber": 1 }, { "_id": "...", "floorNumber": 2 }] }
```

---

#### Get Floor by ID
**GET** `/api/floor/single/:floorId`

**Response `200`:**
```json
{ "floor": { "_id": "...", "hostelId": { "_id": "...", "hostelName": "..." }, "floorNumber": 1 } }
```

---

#### Get Floor Details with Rooms and Tenants
**GET** `/api/floor/:hostelId/details/:floorNumber`

**Response `200`:**
```json
{
  "floorNumber": 1,
  "floorId": "664c3b...",
  "hostelId": "664b2a...",
  "rooms": [
    {
      "room": { "_id": "...", "roomNumber": "101", "roomType": "single", "totalBeds": 2, "occupiedBeds": 1, "vacantBeds": 1 },
      "tenants": [
        { "_id": "...", "name": "John Doe", "phoneNumber": "9876543210", "occupation": "Student", "paymentStatus": "pending", "monthlyFee": 5000 }
      ]
    }
  ]
}
```

---

#### Update Floor
**PUT** `/api/floor/:floorId`

**Request Body:** `{ "floorNumber": 3 }`

**Response `200`:** `{ "message": "Floor updated successfully", "floor": { ... } }`

---

#### Delete Floor
**DELETE** `/api/floor/:floorId`

**Response `200`:**
```json
{ "message": "Floor and associated rooms and tenants deleted successfully" }
```

> Cascade deletes: floor → all rooms → all tenants → all payments

---

### 7.4 Room

#### Create Room
**POST** `/api/room/create`

**Request Body:**
```json
{
  "hostelId": "664b2a...", "floorId": "664c3b...",
  "roomNumber": "101", "roomType": "single", "totalBeds": 2
}
```

**Response `201`:**
```json
{
  "message": "Room created successfully",
  "room": { "_id": "...", "roomNumber": "101", "roomType": "single", "totalBeds": 2, "occupiedBeds": 0, "vacantBeds": 2 }
}
```

| Status | Message |
|--------|---------|
| `400` | hostelId, floorId, roomNumber, roomType and totalBeds are required |
| `400` | Room number already exists on this floor |
| `404` | Floor not found in this hostel |

---

#### Get Rooms by Hostel
**GET** `/api/room/:hostelId`

**Response `200`:**
```json
{ "rooms": [{ "_id": "...", "roomNumber": "101", "floorId": { "floorNumber": 1 }, ... }] }
```

---

#### Get Rooms by Floor
**GET** `/api/room/floor/:floorId`

**Response `200`:** `{ "rooms": [ { ... } ] }`

---

#### Get Room by ID
**GET** `/api/room/single/:roomId`

**Response `200`:** `{ "room": { ... } }`

---

#### Update Room
**PUT** `/api/room/:roomId` — All fields optional

**Request Body:**
```json
{ "roomNumber": "102", "roomType": "double", "totalBeds": 3 }
```

**Response `200`:** `{ "message": "Room updated successfully", "room": { ... } }`

> `vacantBeds` auto-recalculated as `totalBeds - occupiedBeds` when `totalBeds` is updated.

---

#### Delete Room
**DELETE** `/api/room/:roomId`

**Response `200`:**
```json
{ "message": "Room and associated tenants deleted successfully" }
```

> Cascade deletes: room → all tenants → all payments

---

### 7.5 Tenant

#### Create Tenant
**POST** `/api/tenant/create`

On creation: room `occupiedBeds` +1, `vacantBeds` -1. 30-day payment cycles auto-generated from `joinedDate` to today.

**Request Body:**
```json
{
  "hostelId": "664b2a...", "floorId": "664c3b...", "roomId": "664d4c...",
  "name": "John Doe", "phoneNumber": "9876543210",
  "email": "john@example.com", "address": "123 Main St",
  "parentNumber": "9876500000", "aadhaarNumber": "1234-5678-9012",
  "occupation": "Student", "joinedDate": "2026-01-01",
  "monthlyFee": 5000, "deposit": 10000, "paymentStatus": "pending"
}
```

**Required:** `hostelId`, `floorId`, `roomId`, `name`, `phoneNumber`

**Response `201`:**
```json
{
  "message": "Tenant created successfully",
  "tenant": {
    "_id": "664e5d...", "name": "John Doe", "phoneNumber": "9876543210",
    "joinedDate": "2026-01-01T00:00:00.000Z", "monthlyFee": 5000,
    "paymentStatus": "pending",
    "feeStatus": [{ "month": 5, "year": 2026, "isPaid": false }]
  }
}
```

| Status | Message |
|--------|---------|
| `400` | hostelId, floorId, roomId, name and phoneNumber are required |
| `400` | No vacant beds available in this room |
| `404` | Room not found in this hostel/floor |
| `404` | Hostel not found or unauthorized |

---

#### Get Tenants by Hostel
**GET** `/api/tenant/:hostelId`

**Response `200`:**
```json
{
  "tenants": [
    {
      "_id": "...", "name": "John Doe", "phoneNumber": "9876543210",
      "paymentStatus": "pending",
      "feeStatus": [{ "month": 5, "year": 2026, "isPaid": false }],
      "floorId": { "floorNumber": 1 },
      "roomId": { "roomNumber": "101", "roomType": "single" }
    }
  ]
}
```

---

#### Get Tenant by ID
**GET** `/api/tenant/single/:tenantId`

**Response `200`:** `{ "tenant": { ... } }` (with populated floorId and roomId)

---

#### Update Tenant
**PUT** `/api/tenant/:tenantId` — All fields optional

**Request Body:**
```json
{
  "name": "Jane Doe", "phoneNumber": "9876500001", "email": "jane@example.com",
  "address": "456 Side St", "occupation": "Engineer",
  "monthlyFee": 6000, "deposit": 12000, "paymentStatus": "paid"
}
```

**Response `200`:** `{ "message": "Tenant updated successfully", "tenant": { ... } }`

---

#### Delete Tenant
**DELETE** `/api/tenant/:tenantId`

**Response `200`:** `{ "message": "Tenant deleted successfully" }`

> Decrements room `occupiedBeds`, increments `vacantBeds`. Deletes all payment records.

---

### 7.6 Expense

#### Create Expense
**POST** `/api/expense/create`

`month` and `year` are auto-extracted from `date`.

**Request Body:**
```json
{
  "hostelId": "664b2a...", "expenseReason": "Electricity Bill",
  "amount": 3500, "date": "2026-05-16",
  "paymentMethod": "cash", "note": "May month bill"
}
```

**Required:** `hostelId`, `expenseReason`, `amount`, `date`

**Response `201`:**
```json
{
  "message": "Expense created successfully",
  "expense": {
    "_id": "...", "expenseReason": "Electricity Bill", "amount": 3500,
    "date": "2026-05-16T00:00:00.000Z", "paymentMethod": "cash",
    "month": 5, "year": 2026
  }
}
```

---

#### Get Expenses by Hostel
**GET** `/api/expense/:hostelId`

Optional query params: `?month=5&year=2026`

**Response `200`:**
```json
{ "expenses": [{ "_id": "...", "expenseReason": "Electricity Bill", "amount": 3500, "month": 5, "year": 2026 }] }
```

---

#### Update Expense
**PUT** `/api/expense/:expenseId` — All fields optional

**Request Body:**
```json
{ "expenseReason": "Water Bill", "amount": 1200, "date": "2026-05-18", "paymentMethod": "upi", "note": "Updated" }
```

**Response `200`:** `{ "message": "Expense updated successfully", "expense": { ... } }`

> If `date` is updated, `month` and `year` are recalculated automatically.

---

#### Delete Expense
**DELETE** `/api/expense/:expenseId`

**Response `200`:** `{ "message": "Expense deleted successfully" }`

---

### 7.7 Payment

Payment cycles are auto-generated every 30 days from each tenant's `joinedDate`. Each tenant has their own independent cycle dates.

#### Get Payments by Tenant
**GET** `/api/payment/:tenantId`

**Response `200`:**
```json
{
  "tenantId": "664e5d...", "tenantName": "John Doe",
  "monthlyFee": 5000, "joinedDate": "2026-01-01T00:00:00.000Z",
  "totalCycles": 5, "paid": 4, "unpaid": 1,
  "cycles": [
    {
      "_id": "665a1b...",
      "periodStart": "2026-01-01T00:00:00.000Z",
      "periodEnd": "2026-01-31T00:00:00.000Z",
      "amount": 5000, "isPaid": true,
      "paymentMethod": "upi",
      "paymentDate": "2026-01-15T00:00:00.000Z",
      "note": "Paid via GPay"
    },
    {
      "_id": "665a1c...",
      "periodStart": "2026-01-31T00:00:00.000Z",
      "periodEnd": "2026-03-02T00:00:00.000Z",
      "amount": 5000, "isPaid": false,
      "paymentMethod": null, "paymentDate": null, "note": null
    }
  ]
}
```

---

#### Get Payments by Hostel
**GET** `/api/payment/hostel/:hostelId`

**Response `200`:**
```json
{
  "payments": [
    {
      "tenantId": "...", "tenantName": "John Doe", "phoneNumber": "9876543210",
      "joinedDate": "2026-01-01T00:00:00.000Z", "monthlyFee": 5000,
      "paid": 4, "unpaid": 1,
      "cycles": [{ "_id": "...", "periodStart": "...", "periodEnd": "...", "amount": 5000, "isPaid": true, "paymentMethod": "upi", "paymentDate": "...", "note": "..." }]
    }
  ]
}
```

---

#### Update Payment
**PUT** `/api/payment/:paymentId` — All fields optional

**Request Body:**
```json
{
  "isPaid": true,
  "paymentMethod": "upi",
  "paymentDate": "2026-05-18",
  "amount": 5000,
  "note": "Paid via GPay"
}
```

**Response `200`:**
```json
{
  "message": "Payment updated successfully",
  "payment": {
    "_id": "...", "isPaid": true, "paymentMethod": "upi",
    "paymentDate": "2026-05-18T00:00:00.000Z",
    "amount": 5000, "note": "Paid via GPay",
    "periodStart": "2026-01-01T00:00:00.000Z",
    "periodEnd": "2026-01-31T00:00:00.000Z"
  }
}
```

| Status | Message |
|--------|---------|
| `403` | Unauthorized |
| `404` | Payment not found |

---

### 7.8 Temporary Tenant

A two-step public form flow for tenant self-registration.

#### Step 1 — Generate Form Token
**POST** `/api/temporary-tenant/generate-token` — No auth required

**Request Body:**
```json
{ "hostelId": "664b2a..." }
```

**Response `200`:**
```json
{
  "token": "eyJhbGci...",
  "hostelId": "664b2a...",
  "issuedAt": "2026-05-18T14:39:39.604Z",
  "expiresAt": "2026-05-18T14:54:39.604Z",
  "expiresInMinutes": 15
}
```

---

#### Step 2 — Submit Tenant Form
**POST** `/api/temporary-tenant/submit`

Header: `Authorization: Bearer <form_token>`

**Request Body:**
```json
{
  "floorId": "664c3b...", "roomId": "664d4c...",
  "name": "John Doe", "phoneNumber": "9876543210",
  "email": "john@example.com", "address": "123 Main St",
  "parentNumber": "9876500000", "aadhaarNumber": "1234-5678-9012",
  "occupation": "Student", "joinedDate": "2026-05-01",
  "monthlyFee": 5000, "deposit": 10000
}
```

**Required:** `floorId`, `roomId`, `name`, `phoneNumber`

**Response `201`:**
```json
{
  "message": "Form submitted successfully",
  "temporaryTenant": { "_id": "...", "name": "John Doe", "phoneNumber": "9876543210", ... }
}
```

| Status | Message |
|--------|---------|
| `401` | Form token is required |
| `401` | Form link has expired. Please request a new one. |
| `401` | Invalid form token |
| `400` | No vacant beds available in this room |

---

#### Approve Tenant
**POST** `/api/temporary-tenant/approve/:tempTenantId` — Owner auth required

No request body needed.

**Response `201`:**
```json
{
  "message": "Tenant approved and moved to tenants successfully",
  "tenant": { "_id": "...", "name": "John Doe", ... }
}
```

On approval:
- Tenant created in `tenants` collection
- Room `occupiedBeds` +1, `vacantBeds` -1
- 30-day payment cycles generated from `joinedDate` to today
- Temp record deleted from `temporaryTenants`

---

#### Delete Temporary Tenant
**DELETE** `/api/temporary-tenant/:tempTenantId` — Owner auth required

**Response `200`:** `{ "message": "Temporary tenant deleted successfully" }`

---

### 7.9 Dashboard

#### Owner Dashboard
**GET** `/api/dashboard` — Owner auth required

Returns overall stats across all hostels owned by the logged-in owner, plus a branch-wise breakdown for each hostel.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

No request body required.

**Response `200`:**
```json
{
  "overall": {
    "totalHostels": 2,
    "totalTenants": 45,
    "totalBeds": 60,
    "occupiedBeds": 45,
    "vacantBeds": 15,
    "todayCollection": { "amount": 10000, "count": 2 },
    "monthlyCollection": { "amount": 85000, "count": 17 },
    "totalDues": { "amount": 30000, "count": 6 },
    "paidTenants": 17,
    "unpaidTenants": 28
  },
  "branches": [
    {
      "hostelId": "664b2a...",
      "hostelName": "Green Valley Hostel",
      "hostelType": "boys",
      "totalTenants": 25,
      "totalBeds": 35,
      "occupiedBeds": 25,
      "vacantBeds": 10,
      "todayCollection": { "amount": 6000, "count": 1 },
      "monthlyCollection": { "amount": 50000, "count": 10 },
      "totalDues": { "amount": 15000, "count": 3 },
      "paidTenants": 10,
      "unpaidTenants": 15
    },
    {
      "hostelId": "664b2b...",
      "hostelName": "Blue Ridge Hostel",
      "hostelType": "girls",
      "totalTenants": 20,
      "totalBeds": 25,
      "occupiedBeds": 20,
      "vacantBeds": 5,
      "todayCollection": { "amount": 4000, "count": 1 },
      "monthlyCollection": { "amount": 35000, "count": 7 },
      "totalDues": { "amount": 15000, "count": 3 },
      "paidTenants": 7,
      "unpaidTenants": 13
    }
  ]
}
```

**Field Descriptions:**

| Field | Description |
|-------|-------------|
| `totalHostels` | Total number of hostels owned |
| `totalTenants` | Total tenants across all hostels |
| `totalBeds` | Sum of all beds across all rooms |
| `occupiedBeds` | Currently occupied beds |
| `vacantBeds` | Currently available beds |
| `todayCollection.amount` | Total rent collected today (payments with `paymentDate` = today and `isPaid: true`) |
| `todayCollection.count` | Number of payments collected today |
| `monthlyCollection.amount` | Total rent collected this calendar month |
| `monthlyCollection.count` | Number of payments collected this month |
| `totalDues.amount` | Total overdue amount (unpaid cycles whose `periodEnd` has passed) |
| `totalDues.count` | Number of overdue cycles |
| `paidTenants` | Tenants who have at least one paid cycle this month |
| `unpaidTenants` | Tenants who have not paid this month |

**Errors:**

| Status | Message |
|--------|---------|
| `401` | No token, authorization denied |
| `500` | Internal server error |

---

## 8. Cron Jobs

### Payment Cycle Generator
**File:** `cron/feeStatusCron.js`
**Schedule:** `0 0 * * *` — Daily at 00:00

- Finds all tenants with `joinedDate` and `monthlyFee > 0`
- For each tenant, finds their latest payment cycle
- If `periodEnd <= today`, generates the next 30-day cycle with `isPaid: false`
- Prevents duplicates by checking before creating
- Also adds current month/year to `feeStatus` array if missing
- Each tenant follows their own cycle dates — not a shared calendar

### Health Check
**File:** `cron/healthCheckCron.js`
**Schedule:** `*/12 * * * *` — Every 12 minutes

Logs `[HEALTH] Server is alive at <timestamp>`. Keeps the server awake on platforms like Render free tier.

---

## 9. Cascade Delete Behaviour

| Delete Action | Also Deletes |
|---------------|-------------|
| Delete Floor | All rooms on that floor → all tenants in those rooms → all payments of those tenants |
| Delete Room | All tenants in that room → all payments of those tenants |
| Delete Tenant | All payment records for that tenant |
| Delete Hostel | Only the hostel (no cascade — rooms/floors/tenants remain) |

---

## 10. Error Reference

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request / missing fields / duplicate / no vacant beds |
| `401` | No token / invalid token / expired token |
| `403` | Valid token but not authorized for this resource |
| `404` | Resource not found |
| `500` | Internal server error |

Common messages:
```
"No token, authorization denied"
"Invalid or expired token"
"Owner not found"
"Hostel not found or unauthorized"
"Floor not found or unauthorized"
"Room not found"
"Tenant not found"
"No vacant beds available in this room"
"Floor number already exists in this hostel"
"Room number already exists on this floor"
"Form link has expired. Please request a new one."
```

---

## 11. API Quick Reference Table

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register-login` | None | Register or login |
| POST | `/api/hostel/create` | Owner | Create hostel |
| GET | `/api/hostel/list` | Owner | List owner's hostels |
| GET | `/api/hostel/:hostelId` | Owner | Get hostel by ID |
| PUT | `/api/hostel/:hostelId` | Owner | Update hostel |
| DELETE | `/api/hostel/:hostelId` | Owner | Delete hostel |
| POST | `/api/floor/create` | Owner | Create floor |
| GET | `/api/floor/:hostelId` | Owner | List floors |
| GET | `/api/floor/single/:floorId` | Owner | Get floor by ID |
| GET | `/api/floor/:hostelId/details/:floorNumber` | Owner | Floor with rooms & tenants |
| PUT | `/api/floor/:floorId` | Owner | Update floor |
| DELETE | `/api/floor/:floorId` | Owner | Delete floor (cascade) |
| POST | `/api/room/create` | Owner | Create room |
| GET | `/api/room/:hostelId` | Owner | List rooms by hostel |
| GET | `/api/room/floor/:floorId` | Owner | List rooms by floor |
| GET | `/api/room/single/:roomId` | Owner | Get room by ID |
| PUT | `/api/room/:roomId` | Owner | Update room |
| DELETE | `/api/room/:roomId` | Owner | Delete room (cascade) |
| POST | `/api/tenant/create` | Owner | Create tenant |
| GET | `/api/tenant/:hostelId` | Owner | List tenants by hostel |
| GET | `/api/tenant/single/:tenantId` | Owner | Get tenant by ID |
| PUT | `/api/tenant/:tenantId` | Owner | Update tenant |
| DELETE | `/api/tenant/:tenantId` | Owner | Delete tenant |
| POST | `/api/expense/create` | Owner | Create expense |
| GET | `/api/expense/:hostelId` | Owner | List expenses (filter by month/year) |
| PUT | `/api/expense/:expenseId` | Owner | Update expense |
| DELETE | `/api/expense/:expenseId` | Owner | Delete expense |
| GET | `/api/payment/:tenantId` | Owner | Get payment cycles for tenant |
| GET | `/api/payment/hostel/:hostelId` | Owner | Get all payments for hostel |
| PUT | `/api/payment/:paymentId` | Owner | Update payment status |
| POST | `/api/temporary-tenant/generate-token` | None | Generate 15-min form token |
| POST | `/api/temporary-tenant/submit` | Form token | Tenant submits form |
| POST | `/api/temporary-tenant/approve/:tempTenantId` | Owner | Approve temp tenant |
| DELETE | `/api/temporary-tenant/:tempTenantId` | Owner | Reject temp tenant |
| GET | `/api/dashboard` | Owner | Owner dashboard — overall + branch-wise stats |

---

## 12. Deployment

### Render
- Build Command: `npm install`
- Start Command: `node server.js`
- Environment Variables: `PORT`, `MONGO_URI`, `JWT_SECRET`

### Docker
```bash
docker compose up -d --build
```

### AWS EC2
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
git clone <repo> && cd hostelManagement
# Create .env with production values
docker compose up -d --build
```

### Environment Variables
| Key | Description |
|-----|-------------|
| PORT | Server port (e.g. 4000) |
| MONGO_URI | MongoDB Atlas connection string |
| JWT_SECRET | Strong secret for JWT signing |
