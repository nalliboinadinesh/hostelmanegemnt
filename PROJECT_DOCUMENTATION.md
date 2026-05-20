# Hostel Management System — Full API Documentation

**Base URL:** `http://localhost:4000`
**Auth:** All protected routes require `Authorization: Bearer <token>` header.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Database Models](#4-database-models)
5. [Authentication API](#5-authentication-api)
6. [Hostel API](#6-hostel-api)
7. [Floor API](#7-floor-api)
8. [Room API](#8-room-api)
9. [Tenant API](#9-tenant-api)
10. [Expense API](#10-expense-api)
11. [Payment API](#11-payment-api)
12. [Temporary Tenant API](#12-temporary-tenant-api)
13. [Cron Jobs](#13-cron-jobs)
14. [Error Reference](#14-error-reference)

---

## 1. Project Overview

A backend REST API for managing hostels. Owners can register, create hostels, manage floors, rooms, tenants, track expenses, and monitor rent payments on 30-day billing cycles.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js v20 |
| Framework | Express.js v4 |
| Database | MongoDB (Mongoose v9) |
| Auth | JWT (jsonwebtoken) |
| Scheduler | node-cron |
| Config | dotenv |

---

## 3. Project Structure

```
hostelManagement/
├── config/
│   └── db.js               # MongoDB connection
├── controller/
│   ├── authController.js
│   ├── hostelController.js
│   ├── floorController.js
│   ├── roomController.js
│   ├── tenantController.js
│   ├── expenseController.js
│   └── paymentController.js
├── cron/
│   └── feeStatusCron.js    # Monthly payment cycle generator
├── middleware/
│   └── authMiddleware.js   # JWT protect middleware
├── models/
│   ├── Owner.js
│   ├── Hostel.js
│   ├── Floor.js
│   ├── Room.js
│   ├── Tenant.js
│   ├── Expense.js
│   └── Payment.js
├── routes/
│   ├── authRoutes.js
│   ├── hostelRoutes.js
│   ├── floorRoutes.js
│   ├── roomRoutes.js
│   ├── tenantRoutes.js
│   ├── expenseRoutes.js
│   └── paymentRoutes.js
├── .env
├── server.js
└── package.json
```

---

## 4. Database Models

### Owner
| Field | Type | Notes |
|-------|------|-------|
| ownerNumber | String | Unique, required |
| isExisted | Boolean | true if hostel exists |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

### Hostel
| Field | Type | Notes |
|-------|------|-------|
| ownerId | ObjectId | Ref: Owner |
| ownerNumber | String | |
| hostelName | String | Required |
| hostelType | String | Required |
| ownerName | String | Required |
| email | String | |

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
| paymentStatus | String | default: pending |
| feeStatus | Array | [{month, year, isPaid}] |

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
| periodEnd | Date | Cycle end (start + 30 days) |
| isPaid | Boolean | default: false |
| paymentMethod | String | |
| note | String | |

---

## 5. Authentication API

### Register / Login
**POST** `/api/auth/register-login`

No auth header required. If the owner number exists, returns token + `isExisted` based on whether a hostel is linked. If new, creates the owner.

**Request Body:**
```json
{
  "ownerNumber": "9876543210"
}
```

**Response — New Owner `201`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "isExisted": false,
  "owner": {
    "_id": "664a1f...",
    "ownerNumber": "9876543210",
    "isExisted": false,
    "createdAt": "2026-05-16T00:00:00.000Z",
    "updatedAt": "2026-05-16T00:00:00.000Z"
  }
}
```

**Response — Existing Owner with Hostel `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "isExisted": true,
  "owner": {
    "_id": "664a1f...",
    "ownerNumber": "9876543210",
    "isExisted": true,
    "createdAt": "2026-05-16T00:00:00.000Z",
    "updatedAt": "2026-05-16T00:00:00.000Z"
  }
}
```

**Response — Existing Owner without Hostel `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "isExisted": false,
  "owner": { ... }
}
```

**Errors:**
```json
{ "message": "ownerNumber is required" }         // 400
{ "message": "Internal server error message" }   // 500
```

---

## 6. Hostel API

> All routes require `Authorization: Bearer <token>`

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

**Response `201`:**
```json
{
  "message": "Hostel created successfully",
  "hostel": {
    "_id": "664b2a...",
    "ownerId": "664a1f...",
    "ownerNumber": "9876543210",
    "hostelName": "Green Valley Hostel",
    "hostelType": "boys",
    "ownerName": "John Doe",
    "email": "john@example.com",
    "createdAt": "2026-05-16T00:00:00.000Z",
    "updatedAt": "2026-05-16T00:00:00.000Z"
  }
}
```

**Errors:**
```json
{ "message": "hostelName, hostelType and ownerName are required" }  // 400
{ "message": "Hostel already exists for this owner" }               // 400
{ "message": "No token, authorization denied" }                     // 401
```

---

### Get All Hostels
**GET** `/api/hostel/list`

No body required.

**Response `200`:**
```json
{
  "hostels": [
    {
      "_id": "664b2a...",
      "hostelName": "Green Valley Hostel",
      "hostelType": "boys",
      "ownerName": "John Doe",
      "email": "john@example.com"
    }
  ]
}
```

---

### Get Owner Analytics
**GET** `/api/hostel/analytics`

Returns a full analytics summary for the authenticated owner — overall across all hostels, plus a per-hostel breakdown.

**Overall fields:**

| Field | Description |
|-------|-------------|
| `todayCollection` | Sum of payments marked paid with `paymentDate` = today |
| `monthlyCollection` | Sum of payments marked paid with `paymentDate` in current month |
| `totalDues` | Sum of all unpaid payment amounts |
| `totalTenants` | Total active tenants across all hostels |
| `vacantBeds` | Total vacant beds across all rooms |
| `totalBeds` | Total beds across all rooms |
| `occupiedBeds` | Total occupied beds across all rooms |
| `paidTenants` | Tenants with at least one paid payment this month |
| `unpaidTenants` | Tenants with no paid payment this month |

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
      "hostelId": "664b2a...",
      "hostelName": "Green Valley Hostel",
      "hostelType": "boys",
      "todayCollection": 5000,
      "monthlyCollection": 28000,
      "totalDues": 12000,
      "totalTenants": 10,
      "vacantBeds": 2,
      "totalBeds": 12,
      "occupiedBeds": 10,
      "paidTenants": 7,
      "unpaidTenants": 3
    },
    {
      "hostelId": "664b3c...",
      "hostelName": "Blue Ridge Hostel",
      "hostelType": "girls",
      "todayCollection": 3000,
      "monthlyCollection": 17000,
      "totalDues": 8000,
      "totalTenants": 8,
      "vacantBeds": 4,
      "totalBeds": 12,
      "occupiedBeds": 8,
      "paidTenants": 5,
      "unpaidTenants": 3
    }
  ]
}
```

> `paidTenants` and `unpaidTenants` are based on whether the tenant has a payment with `isPaid: true` and `paymentDate` falling in the current calendar month.

---

### Get Hostel by ID
**GET** `/api/hostel/:hostelId`

**Response `200`:**
```json
{
  "hostel": {
    "_id": "664b2a...",
    "hostelName": "Green Valley Hostel",
    "hostelType": "boys",
    "ownerName": "John Doe",
    "email": "john@example.com"
  }
}
```

**Errors:**
```json
{ "message": "Hostel not found or unauthorized" }  // 404
```

---

### Update Hostel
**PUT** `/api/hostel/:hostelId`

All fields optional.

**Request Body:**
```json
{
  "hostelName": "Blue Ridge Hostel",
  "hostelType": "girls",
  "ownerName": "Jane Doe",
  "email": "jane@example.com"
}
```

**Response `200`:**
```json
{
  "message": "Hostel updated successfully",
  "hostel": { "_id": "664b2a...", "hostelName": "Blue Ridge Hostel", ... }
}
```

---

### Delete Hostel
**DELETE** `/api/hostel/:hostelId`

**Response `200`:**
```json
{ "message": "Hostel deleted successfully" }
```

> Deleting a hostel updates `owner.isExisted` to `false` if no hostels remain.

---

## 7. Floor API

> All routes require `Authorization: Bearer <token>`

### Create Floor
**POST** `/api/floor/create`

**Request Body:**
```json
{
  "hostelId": "664b2a...",
  "floorNumber": 1
}
```

**Response `201`:**
```json
{
  "message": "Floor created successfully",
  "floor": {
    "_id": "664c3b...",
    "hostelId": "664b2a...",
    "floorNumber": 1,
    "createdAt": "2026-05-16T00:00:00.000Z",
    "updatedAt": "2026-05-16T00:00:00.000Z"
  }
}
```

**Errors:**
```json
{ "message": "hostelId and floorNumber are required" }          // 400
{ "message": "Floor number already exists in this hostel" }     // 400
{ "message": "Hostel not found or unauthorized" }               // 404
```

---

### Get All Floors by Hostel
**GET** `/api/floor/:hostelId`

**Response `200`:**
```json
{
  "floors": [
    { "_id": "664c3b...", "hostelId": "664b2a...", "floorNumber": 1 },
    { "_id": "664c3c...", "hostelId": "664b2a...", "floorNumber": 2 }
  ]
}
```

---

### Get Floor by ID
**GET** `/api/floor/single/:floorId`

**Response `200`:**
```json
{
  "floor": {
    "_id": "664c3b...",
    "hostelId": { "_id": "664b2a...", "hostelName": "Green Valley Hostel" },
    "floorNumber": 1
  }
}
```

---

### Get Floor Details with Rooms and Tenants
**GET** `/api/floor/:hostelId/details/:floorNumber`

Returns all rooms on the floor with their tenants nested inside.

**Response `200`:**
```json
{
  "floorNumber": 1,
  "floorId": "664c3b...",
  "hostelId": "664b2a...",
  "rooms": [
    {
      "room": {
        "_id": "664d4c...",
        "roomNumber": "101",
        "roomType": "single",
        "totalBeds": 2,
        "occupiedBeds": 1,
        "vacantBeds": 1
      },
      "tenants": [
        {
          "_id": "664e5d...",
          "name": "John Doe",
          "phoneNumber": "9876543210",
          "email": "john@example.com",
          "occupation": "Student",
          "paymentStatus": "paid",
          "joinedDate": "2026-01-01T00:00:00.000Z",
          "monthlyFee": 5000,
          "deposit": 10000
        }
      ]
    }
  ]
}
```

---

### Update Floor
**PUT** `/api/floor/:floorId`

**Request Body:**
```json
{ "floorNumber": 3 }
```

**Response `200`:**
```json
{ "message": "Floor updated successfully", "floor": { ... } }
```

---

### Delete Floor
**DELETE** `/api/floor/:floorId`

**Response `200`:**
```json
{ "message": "Floor deleted successfully" }
```

---

## 8. Room API

> All routes require `Authorization: Bearer <token>`

### Create Room
**POST** `/api/room/create`

**Request Body:**
```json
{
  "hostelId": "664b2a...",
  "floorId": "664c3b...",
  "roomNumber": "101",
  "roomType": "single",
  "totalBeds": 2
}
```

**Response `201`:**
```json
{
  "message": "Room created successfully",
  "room": {
    "_id": "664d4c...",
    "hostelId": "664b2a...",
    "floorId": "664c3b...",
    "roomNumber": "101",
    "roomType": "single",
    "totalBeds": 2,
    "occupiedBeds": 0,
    "vacantBeds": 2,
    "createdAt": "2026-05-16T00:00:00.000Z",
    "updatedAt": "2026-05-16T00:00:00.000Z"
  }
}
```

**Errors:**
```json
{ "message": "hostelId, floorId, roomNumber, roomType and totalBeds are required" }  // 400
{ "message": "Room number already exists on this floor" }                            // 400
{ "message": "Floor not found in this hostel" }                                      // 404
```

---

### Get Rooms by Hostel
**GET** `/api/room/:hostelId`

**Response `200`:**
```json
{
  "rooms": [
    {
      "_id": "664d4c...",
      "roomNumber": "101",
      "roomType": "single",
      "totalBeds": 2,
      "occupiedBeds": 1,
      "vacantBeds": 1,
      "floorId": { "_id": "664c3b...", "floorNumber": 1 }
    }
  ]
}
```

---

### Get Rooms by Floor
**GET** `/api/room/floor/:floorId`

**Response `200`:**
```json
{ "rooms": [ { "_id": "664d4c...", "roomNumber": "101", ... } ] }
```

---

### Get Room by ID
**GET** `/api/room/single/:roomId`

**Response `200`:**
```json
{
  "room": {
    "_id": "664d4c...",
    "roomNumber": "101",
    "roomType": "single",
    "totalBeds": 2,
    "occupiedBeds": 1,
    "vacantBeds": 1,
    "floorId": { "_id": "664c3b...", "floorNumber": 1 }
  }
}
```

---

### Update Room
**PUT** `/api/room/:roomId`

All fields optional.

**Request Body:**
```json
{
  "roomNumber": "102",
  "roomType": "double",
  "totalBeds": 3
}
```

**Response `200`:**
```json
{ "message": "Room updated successfully", "room": { ... } }
```

> `vacantBeds` is auto-recalculated as `totalBeds - occupiedBeds` when `totalBeds` is updated.

---

### Delete Room
**DELETE** `/api/room/:roomId`

**Response `200`:**
```json
{ "message": "Room deleted successfully" }
```

---

## 9. Tenant API

> All routes require `Authorization: Bearer <token>`

### Create Tenant
**POST** `/api/tenant/create`

On creation: room `occupiedBeds` increments, `vacantBeds` decrements. Payment cycles are auto-generated from `joinedDate` to today.

**Request Body:**
```json
{
  "hostelId": "664b2a...",
  "floorId": "664c3b...",
  "roomId": "664d4c...",
  "name": "John Doe",
  "phoneNumber": "9876543210",
  "email": "john@example.com",
  "address": "123 Main St, Chennai",
  "parentNumber": "9876500000",
  "aadhaarNumber": "1234-5678-9012",
  "occupation": "Student",
  "joinedDate": "2026-01-01",
  "monthlyFee": 5000,
  "deposit": 10000,
  "paymentStatus": "pending"
}
```

**Required fields:** `hostelId`, `floorId`, `roomId`, `name`, `phoneNumber`

**Response `201`:**
```json
{
  "message": "Tenant created successfully",
  "tenant": {
    "_id": "664e5d...",
    "hostelId": "664b2a...",
    "floorId": "664c3b...",
    "roomId": "664d4c...",
    "name": "John Doe",
    "phoneNumber": "9876543210",
    "email": "john@example.com",
    "address": "123 Main St, Chennai",
    "parentNumber": "9876500000",
    "aadhaarNumber": "1234-5678-9012",
    "occupation": "Student",
    "joinedDate": "2026-01-01T00:00:00.000Z",
    "monthlyFee": 5000,
    "deposit": 10000,
    "paymentStatus": "pending",
    "feeStatus": [
      { "month": 5, "year": 2026, "isPaid": false }
    ],
    "createdAt": "2026-05-16T00:00:00.000Z",
    "updatedAt": "2026-05-16T00:00:00.000Z"
  }
}
```

**Errors:**
```json
{ "message": "hostelId, floorId, roomId, name and phoneNumber are required" }  // 400
{ "message": "No vacant beds available in this room" }                         // 400
{ "message": "Room not found in this hostel/floor" }                           // 404
{ "message": "Hostel not found or unauthorized" }                              // 404
```

---

### Get Tenants by Hostel
**GET** `/api/tenant/:hostelId`

**Response `200`:**
```json
{
  "tenants": [
    {
      "_id": "664e5d...",
      "name": "John Doe",
      "phoneNumber": "9876543210",
      "paymentStatus": "pending",
      "feeStatus": [ { "month": 5, "year": 2026, "isPaid": false } ],
      "floorId": { "_id": "664c3b...", "floorNumber": 1 },
      "roomId": { "_id": "664d4c...", "roomNumber": "101", "roomType": "single" }
    }
  ]
}
```

---

### Get Tenant by ID
**GET** `/api/tenant/single/:tenantId`

**Response `200`:**
```json
{
  "tenant": {
    "_id": "664e5d...",
    "name": "John Doe",
    "phoneNumber": "9876543210",
    "email": "john@example.com",
    "address": "123 Main St",
    "occupation": "Student",
    "joinedDate": "2026-01-01T00:00:00.000Z",
    "monthlyFee": 5000,
    "deposit": 10000,
    "paymentStatus": "pending",
    "feeStatus": [ { "month": 5, "year": 2026, "isPaid": false } ],
    "floorId": { "_id": "664c3b...", "floorNumber": 1 },
    "roomId": { "_id": "664d4c...", "roomNumber": "101", "roomType": "single" }
  }
}
```

---

### Update Tenant
**PUT** `/api/tenant/:tenantId`

All fields optional.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "phoneNumber": "9876500001",
  "email": "jane@example.com",
  "address": "456 Side St",
  "parentNumber": "9876500002",
  "aadhaarNumber": "9876-5432-1098",
  "occupation": "Engineer",
  "joinedDate": "2026-06-01",
  "monthlyFee": 6000,
  "deposit": 12000,
  "paymentStatus": "paid"
}
```

**Response `200`:**
```json
{ "message": "Tenant updated successfully", "tenant": { ... } }
```

---

### Delete Tenant
**DELETE** `/api/tenant/:tenantId`

On deletion: room `occupiedBeds` decrements, `vacantBeds` increments. All payment records for this tenant are also deleted.

**Response `200`:**
```json
{ "message": "Tenant deleted successfully" }
```

---

## 10. Expense API

> All routes require `Authorization: Bearer <token>`

### Create Expense
**POST** `/api/expense/create`

`month` and `year` are auto-extracted from the `date` field.

**Request Body:**
```json
{
  "hostelId": "664b2a...",
  "expenseReason": "Electricity Bill",
  "amount": 3500,
  "date": "2026-05-16",
  "paymentMethod": "cash",
  "note": "May month electricity bill"
}
```

**Required fields:** `hostelId`, `expenseReason`, `amount`, `date`

**Response `201`:**
```json
{
  "message": "Expense created successfully",
  "expense": {
    "_id": "664f6e...",
    "hostelId": "664b2a...",
    "expenseReason": "Electricity Bill",
    "amount": 3500,
    "date": "2026-05-16T00:00:00.000Z",
    "paymentMethod": "cash",
    "note": "May month electricity bill",
    "month": 5,
    "year": 2026,
    "createdAt": "2026-05-16T00:00:00.000Z",
    "updatedAt": "2026-05-16T00:00:00.000Z"
  }
}
```

---

### Get Expenses by Hostel
**GET** `/api/expense/:hostelId`

Optional query params to filter: `?month=5&year=2026`

**Response `200`:**
```json
{
  "expenses": [
    {
      "_id": "664f6e...",
      "expenseReason": "Electricity Bill",
      "amount": 3500,
      "date": "2026-05-16T00:00:00.000Z",
      "paymentMethod": "cash",
      "note": "May month electricity bill",
      "month": 5,
      "year": 2026
    }
  ]
}
```

---

### Update Expense
**PUT** `/api/expense/:expenseId`

All fields optional. If `date` is updated, `month` and `year` are recalculated automatically.

**Request Body:**
```json
{
  "expenseReason": "Water Bill",
  "amount": 1200,
  "date": "2026-05-18",
  "paymentMethod": "upi",
  "note": "Updated note"
}
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

> All routes require `Authorization: Bearer <token>`

Payment cycles are auto-generated every 30 days from the tenant's `joinedDate`. Only `isPaid`, `paymentMethod`, and `note` can be updated — amount and dates are locked.

### Get Payments by Tenant
**GET** `/api/payment/:tenantId`

Returns all 30-day cycles with a paid/unpaid summary.

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

**Errors:**
```json
{ "message": "Tenant not found" }   // 404
{ "message": "Unauthorized" }       // 403
```

---

### Get Payments by Hostel
**GET** `/api/payment/hostel/:hostelId`

Returns all tenants with their payment cycle summaries.

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

---

### Update Payment Status
**PUT** `/api/payment/:paymentId`

**Request Body:**
```json
{
  "isPaid": true,
  "paymentMethod": "upi",
  "note": "Paid via GPay"
}
```

All fields optional.

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

**Errors:**
```json
{ "message": "Payment not found" }  // 404
{ "message": "Unauthorized" }       // 403
```

---

## 12. Temporary Tenant API

Temporary tenants are pending applicants who submitted a form via a time-limited token link. Owners review and either approve (converts to a full tenant) or delete them.

**Base path:** `/api/temporary-tenant`

---

### Generate Form Token
**POST** `/api/temporary-tenant/generate-token`

No auth required. Generates a 15-minute JWT that must be passed when submitting the tenant form.

**Request Body:**
```json
{ "hostelId": "664b2a..." }
```

**Response `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "hostelId": "664b2a...",
  "issuedAt": "2026-05-20T10:00:00.000Z",
  "expiresAt": "2026-05-20T10:15:00.000Z",
  "expiresInMinutes": 15
}
```

**Errors:**
```json
{ "message": "hostelId is required" }   // 400
{ "message": "Hostel not found" }       // 404
```

---

### Submit Tenant Form
**POST** `/api/temporary-tenant/submit`

No owner auth required. Uses the form token from `generate-token` as the Bearer token.

**Headers:**
```
Authorization: Bearer <form-token>
```

**Request Body:**
```json
{
  "floorId": "664c3b...",
  "roomId": "664d4c...",
  "name": "John Doe",
  "phoneNumber": "9876543210",
  "email": "john@example.com",
  "address": "123 Main St, Chennai",
  "parentNumber": "9876500000",
  "aadhaarNumber": "1234-5678-9012",
  "occupation": "Student",
  "joinedDate": "2026-06-01",
  "monthlyFee": 5000,
  "deposit": 10000
}
```

**Required fields:** `floorId`, `roomId`, `name`, `phoneNumber`

**Response `201`:**
```json
{
  "message": "Form submitted successfully",
  "temporaryTenant": {
    "_id": "665b7f...",
    "hostelId": "664b2a...",
    "floorId": "664c3b...",
    "roomId": "664d4c...",
    "name": "John Doe",
    "phoneNumber": "9876543210",
    "email": "john@example.com",
    "address": "123 Main St, Chennai",
    "parentNumber": "9876500000",
    "aadhaarNumber": "1234-5678-9012",
    "occupation": "Student",
    "joinedDate": "2026-06-01T00:00:00.000Z",
    "monthlyFee": 5000,
    "deposit": 10000,
    "paymentStatus": "pending",
    "feeStatus": [ { "month": 5, "year": 2026, "isPaid": false } ],
    "createdAt": "2026-05-20T10:05:00.000Z",
    "updatedAt": "2026-05-20T10:05:00.000Z"
  }
}
```

**Errors:**
```json
{ "message": "Form token is required" }                          // 401
{ "message": "Form link has expired. Please request a new one." } // 401
{ "message": "Invalid form token" }                              // 401
{ "message": "floorId, roomId, name and phoneNumber are required" } // 400
{ "message": "No vacant beds available in this room" }           // 400
{ "message": "Room not found in this hostel/floor" }             // 404
```

---

### Get Temporary Tenants by Hostel
**GET** `/api/temporary-tenant/hostel/:hostelId`

> Requires `Authorization: Bearer <owner-token>`

Returns all pending temporary tenants for the given hostel. Only accessible by the hostel owner.

**Response `200`:**
```json
{
  "hostelId": "664b2a...",
  "total": 2,
  "tenants": [
    {
      "_id": "665b7f...",
      "name": "John Doe",
      "phoneNumber": "9876543210",
      "email": "john@example.com",
      "occupation": "Student",
      "joinedDate": "2026-06-01T00:00:00.000Z",
      "monthlyFee": 5000,
      "deposit": 10000,
      "paymentStatus": "pending",
      "floorId": { "_id": "664c3b...", "floorNumber": 1, "floorName": "Ground Floor" },
      "roomId": { "_id": "664d4c...", "roomNumber": "101", "roomName": "Room A" },
      "createdAt": "2026-05-20T10:05:00.000Z"
    }
  ]
}
```

**Errors:**
```json
{ "message": "Unauthorized or hostel not found" }  // 403
```

---

### Approve Temporary Tenant
**POST** `/api/temporary-tenant/approve/:tempTenantId`

> Requires `Authorization: Bearer <owner-token>`

Converts the temporary tenant into a full tenant. Also:
- Increments room `occupiedBeds`, decrements `vacantBeds`
- Auto-generates 30-day payment cycles from `joinedDate` to today
- Deletes the temporary tenant record

**Response `201`:**
```json
{
  "message": "Tenant approved and moved to tenants successfully",
  "tenant": {
    "_id": "664e5d...",
    "hostelId": "664b2a...",
    "floorId": "664c3b...",
    "roomId": "664d4c...",
    "name": "John Doe",
    "phoneNumber": "9876543210",
    "paymentStatus": "pending",
    "feeStatus": [ { "month": 5, "year": 2026, "isPaid": false } ],
    "createdAt": "2026-05-20T10:10:00.000Z"
  }
}
```

**Errors:**
```json
{ "message": "Temporary tenant not found" }        // 404
{ "message": "Room not found" }                    // 404
{ "message": "No vacant beds available in this room" } // 400
{ "message": "Unauthorized" }                      // 403
```

---

### Delete Temporary Tenant
**DELETE** `/api/temporary-tenant/:tempTenantId`

> Requires `Authorization: Bearer <owner-token>`

Rejects and removes the temporary tenant record without creating a full tenant.

**Response `200`:**
```json
{ "message": "Temporary tenant deleted successfully" }
```

**Errors:**
```json
{ "message": "Temporary tenant not found" }  // 404
{ "message": "Unauthorized" }                // 403
```

---

## 13. Cron Jobs

## 13. Cron Jobs

### Monthly Fee Reset & Payment Cycle Generator

**File:** `cron/feeStatusCron.js`
**Schedule:** `0 0 1 * *` — Runs at 00:00 on the 1st of every month

**What it does:**

1. Adds `{ month, year, isPaid: false }` to `feeStatus` array of every tenant that doesn't already have an entry for the current month/year.

2. Finds the last payment cycle for each tenant and creates the next 30-day cycle with `isPaid: false`. Skips if the cycle already exists.

**Starts automatically** after MongoDB connects in `server.js`.

---

## 14. Error Reference

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request / missing required fields / duplicate |
| `401` | No token or invalid token |
| `403` | Valid token but not authorized for this resource |
| `404` | Resource not found |
| `500` | Internal server error |

### Common Auth Errors
```json
{ "message": "No token, authorization denied" }   // Missing header
{ "message": "Invalid or expired token" }         // Bad/expired JWT
{ "message": "Owner not found" }                  // Token valid but owner deleted
```

---

## 15. API Quick Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register-login` | No | Register or login |
| POST | `/api/hostel/create` | Yes | Create hostel |
| GET | `/api/hostel/list` | Yes | List owner's hostels |
| GET | `/api/hostel/analytics` | Yes | Owner analytics (overall + per-hostel) |
| GET | `/api/hostel/:hostelId` | Yes | Get hostel by ID |
| PUT | `/api/hostel/:hostelId` | Yes | Update hostel |
| DELETE | `/api/hostel/:hostelId` | Yes | Delete hostel |
| POST | `/api/floor/create` | Yes | Create floor |
| GET | `/api/floor/:hostelId` | Yes | List floors |
| GET | `/api/floor/single/:floorId` | Yes | Get floor by ID |
| GET | `/api/floor/:hostelId/details/:floorNumber` | Yes | Floor with rooms & tenants |
| PUT | `/api/floor/:floorId` | Yes | Update floor |
| DELETE | `/api/floor/:floorId` | Yes | Delete floor |
| POST | `/api/room/create` | Yes | Create room |
| GET | `/api/room/:hostelId` | Yes | List rooms by hostel |
| GET | `/api/room/floor/:floorId` | Yes | List rooms by floor |
| GET | `/api/room/single/:roomId` | Yes | Get room by ID |
| PUT | `/api/room/:roomId` | Yes | Update room |
| DELETE | `/api/room/:roomId` | Yes | Delete room |
| POST | `/api/tenant/create` | Yes | Create tenant |
| GET | `/api/tenant/:hostelId` | Yes | List tenants by hostel |
| GET | `/api/tenant/single/:tenantId` | Yes | Get tenant by ID |
| PUT | `/api/tenant/:tenantId` | Yes | Update tenant |
| DELETE | `/api/tenant/:tenantId` | Yes | Delete tenant |
| POST | `/api/expense/create` | Yes | Create expense |
| GET | `/api/expense/:hostelId` | Yes | List expenses (filter by month/year) |
| PUT | `/api/expense/:expenseId` | Yes | Update expense |
| DELETE | `/api/expense/:expenseId` | Yes | Delete expense |
| GET | `/api/payment/:tenantId` | Yes | Get payment cycles for tenant |
| GET | `/api/payment/hostel/:hostelId` | Yes | Get all payments for hostel |
| PUT | `/api/payment/:paymentId` | Yes | Mark payment paid/unpaid |
| POST | `/api/temporary-tenant/generate-token` | No | Generate 15-min form token |
| POST | `/api/temporary-tenant/submit` | Form token | Submit tenant application form |
| GET | `/api/temporary-tenant/hostel/:hostelId` | Yes | List temporary tenants by hostel |
| POST | `/api/temporary-tenant/approve/:tempTenantId` | Yes | Approve & convert to full tenant |
| DELETE | `/api/temporary-tenant/:tempTenantId` | Yes | Reject & delete temporary tenant |
| GET | `/health` | No | Server health check |
