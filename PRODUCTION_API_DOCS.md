# Hostel Management — Production API Documentation

**Base URL:** `http://13.60.202.87:4000`  
**Content-Type:** `application/json`  
**Authentication:** Bearer token in `Authorization` header (except where noted)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Hostel](#2-hostel)
3. [Floor](#3-floor)
4. [Room](#4-room)
5. [Tenant](#5-tenant)
6. [Payment](#6-payment)
7. [Expense](#7-expense)
8. [Ticket (Owner)](#8-ticket-owner)
9. [Tenant Dashboard](#9-tenant-dashboard)
10. [Temporary Tenant](#10-temporary-tenant)

---

## Authentication

All protected routes require this header:

```
Authorization: Bearer <token>
```

The token is returned from the register/login endpoint and is valid for **30 days**.

---

## 1. Authentication

### POST `/api/auth/register-login`

Registers a new owner or logs in an existing one using their phone number. No password required.

**Auth required:** No

**Request Body**

| Field         | Type   | Required | Description              |
|---------------|--------|----------|--------------------------|
| `ownerNumber` | string | Yes      | Owner's mobile number    |

```json
{
  "ownerNumber": "9876543210"
}
```

**Response — New Owner `201`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "isExisted": false,
  "owner": {
    "_id": "6a2fb5b86f18f89d2c0d2502",
    "ownerNumber": "9876543210",
    "isExisted": false,
    "createdAt": "2026-06-15T08:20:08.478Z",
    "updatedAt": "2026-06-15T08:20:08.478Z"
  },
  "hostels": []
}
```

**Response — Existing Owner `200`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "isExisted": true,
  "owner": {
    "_id": "6a2fb5b86f18f89d2c0d2502",
    "ownerNumber": "9876543210",
    "isExisted": true,
    "createdAt": "2026-06-01T10:00:00.000Z",
    "updatedAt": "2026-06-15T08:20:08.478Z"
  },
  "hostels": [
    {
      "_id": "6a2fb6406f18f89d2c0d2505",
      "hostelName": "Sunrise PG",
      "hostelType": "boys",
      "ownerName": "Ravi Kumar",
      "email": "ravi@example.com"
    }
  ]
}
```

**Error Responses**

| Status | Message                    |
|--------|----------------------------|
| `400`  | `ownerNumber is required`  |
| `500`  | Internal server error      |

---

## 2. Hostel

### POST `/api/hostel/create`

Creates a new hostel under the authenticated owner.

**Auth required:** Yes

**Request Body**

| Field        | Type   | Required | Description                        |
|--------------|--------|----------|------------------------------------|
| `hostelName` | string | Yes      | Name of the hostel                 |
| `hostelType` | string | Yes      | `"boys"`, `"girls"`, or `"mixed"`  |
| `ownerName`  | string | Yes      | Full name of the owner             |
| `email`      | string | No       | Contact email for the hostel       |

```json
{
  "hostelName": "Sunrise PG",
  "hostelType": "boys",
  "ownerName": "Ravi Kumar",
  "email": "ravi@example.com"
}
```

**Response `201`**

```json
{
  "message": "Hostel created successfully",
  "hostel": {
    "_id": "6a2fb6406f18f89d2c0d2505",
    "ownerId": "6a2fb5b86f18f89d2c0d2502",
    "ownerNumber": "9876543210",
    "hostelName": "Sunrise PG",
    "hostelType": "boys",
    "ownerName": "Ravi Kumar",
    "email": "ravi@example.com",
    "createdAt": "2026-06-15T08:22:24.849Z",
    "updatedAt": "2026-06-15T08:22:24.849Z"
  }
}
```

**Error Responses**

| Status | Message                                              |
|--------|------------------------------------------------------|
| `400`  | `hostelName, hostelType and ownerName are required`  |
| `401`  | Unauthorized (invalid/missing token)                 |
| `500`  | Internal server error                                |

---

### GET `/api/hostel/list`

Returns all hostels owned by the authenticated owner.

**Auth required:** Yes

**Request Body:** None

**Response `200`**

```json
{
  "hostels": [
    {
      "_id": "6a2fb6406f18f89d2c0d2505",
      "ownerId": "6a2fb5b86f18f89d2c0d2502",
      "ownerNumber": "9876543210",
      "hostelName": "Sunrise PG",
      "hostelType": "boys",
      "ownerName": "Ravi Kumar",
      "email": "ravi@example.com",
      "createdAt": "2026-06-15T08:22:24.849Z",
      "updatedAt": "2026-06-15T08:22:24.849Z"
    }
  ]
}
```

---

### GET `/api/hostel/analytics`

Returns financial and occupancy analytics across all hostels owned by the authenticated owner, with a per-hostel breakdown.

**Auth required:** Yes

**Request Body:** None

**Response `200`**

```json
{
  "overall": {
    "todayCollection": 5000,
    "monthlyCollection": 45000,
    "totalDues": 12000,
    "totalTenants": 20,
    "vacantBeds": 8,
    "totalBeds": 30,
    "occupiedBeds": 22,
    "paidTenants": 15,
    "unpaidTenants": 5
  },
  "hostels": [
    {
      "hostelId": "6a2fb6406f18f89d2c0d2505",
      "hostelName": "Sunrise PG",
      "hostelType": "boys",
      "todayCollection": 5000,
      "monthlyCollection": 45000,
      "totalDues": 12000,
      "totalTenants": 20,
      "vacantBeds": 8,
      "totalBeds": 30,
      "occupiedBeds": 22,
      "paidTenants": 15,
      "unpaidTenants": 5
    }
  ]
}
```

---

### GET `/api/hostel/:hostelId`

Returns a single hostel by ID.

**Auth required:** Yes

**URL Params:** `hostelId` — MongoDB ObjectId of the hostel

**Response `200`**

```json
{
  "hostel": {
    "_id": "6a2fb6406f18f89d2c0d2505",
    "ownerId": "6a2fb5b86f18f89d2c0d2502",
    "ownerNumber": "9876543210",
    "hostelName": "Sunrise PG",
    "hostelType": "boys",
    "ownerName": "Ravi Kumar",
    "email": "ravi@example.com",
    "createdAt": "2026-06-15T08:22:24.849Z",
    "updatedAt": "2026-06-15T08:22:24.849Z"
  }
}
```

**Error Responses**

| Status | Message                            |
|--------|------------------------------------|
| `404`  | `Hostel not found or unauthorized` |

---

### PUT `/api/hostel/:hostelId`

Updates hostel details. Only send fields you want to change.

**Auth required:** Yes

**URL Params:** `hostelId`

**Request Body** (all fields optional)

| Field        | Type   | Description                       |
|--------------|--------|-----------------------------------|
| `hostelName` | string | New name of the hostel            |
| `hostelType` | string | `"boys"`, `"girls"`, `"mixed"`    |
| `ownerName`  | string | Updated owner name                |
| `email`      | string | Updated email                     |

```json
{
  "hostelName": "Sunrise PG Phase 2",
  "email": "new@example.com"
}
```

**Response `200`**

```json
{
  "message": "Hostel updated successfully",
  "hostel": {
    "_id": "6a2fb6406f18f89d2c0d2505",
    "hostelName": "Sunrise PG Phase 2",
    "hostelType": "boys",
    "ownerName": "Ravi Kumar",
    "email": "new@example.com"
  }
}
```

---

### DELETE `/api/hostel/:hostelId`

Deletes a hostel and **all associated data** (floors, rooms, tenants, payments, expenses, announcements, complaints, temporary tenants).

**Auth required:** Yes

**URL Params:** `hostelId`

**Response `200`**

```json
{
  "message": "Hostel and all related data deleted successfully"
}
```

**Error Responses**

| Status | Message                            |
|--------|------------------------------------|
| `404`  | `Hostel not found or unauthorized` |

---

## 3. Floor

### POST `/api/floor/create`

Creates a new floor in a hostel.

**Auth required:** Yes

**Request Body**

| Field         | Type   | Required | Description                   |
|---------------|--------|----------|-------------------------------|
| `hostelId`    | string | Yes      | MongoDB ObjectId of the hostel |
| `floorNumber` | number | Yes      | Floor number (e.g. `0`, `1`, `2`) |

```json
{
  "hostelId": "6a2fb6406f18f89d2c0d2505",
  "floorNumber": 1
}
```

**Response `201`**

```json
{
  "message": "Floor created successfully",
  "floor": {
    "_id": "6a2fb7206f18f89d2c0d2510",
    "hostelId": "6a2fb6406f18f89d2c0d2505",
    "floorNumber": 1,
    "createdAt": "2026-06-15T08:30:00.000Z",
    "updatedAt": "2026-06-15T08:30:00.000Z"
  }
}
```

**Error Responses**

| Status | Message                                         |
|--------|-------------------------------------------------|
| `400`  | `hostelId and floorNumber are required`         |
| `400`  | `Floor number already exists in this hostel`    |
| `404`  | `Hostel not found or unauthorized`              |

---

### GET `/api/floor/:hostelId`

Returns all floors in a hostel, sorted by floor number.

**Auth required:** Yes

**URL Params:** `hostelId`

**Response `200`**

```json
{
  "floors": [
    {
      "_id": "6a2fb7206f18f89d2c0d2510",
      "hostelId": "6a2fb6406f18f89d2c0d2505",
      "floorNumber": 1
    },
    {
      "_id": "6a2fb7306f18f89d2c0d2511",
      "hostelId": "6a2fb6406f18f89d2c0d2505",
      "floorNumber": 2
    }
  ]
}
```

---

### GET `/api/floor/:hostelId/details/:floorNumber`

Returns a floor with all its rooms and tenants in each room.

**Auth required:** Yes

**URL Params:** `hostelId`, `floorNumber`

**Response `200`**

```json
{
  "floorNumber": 1,
  "floorId": "6a2fb7206f18f89d2c0d2510",
  "hostelId": "6a2fb6406f18f89d2c0d2505",
  "rooms": [
    {
      "room": {
        "_id": "6a2fb8006f18f89d2c0d2520",
        "roomNumber": "101",
        "roomType": "single",
        "totalBeds": 2,
        "occupiedBeds": 1,
        "vacantBeds": 1
      },
      "tenants": [
        {
          "_id": "6a2fb9006f18f89d2c0d2530",
          "name": "Arjun Mehta",
          "phoneNumber": "9876543210",
          "email": "arjun@example.com",
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

### GET `/api/floor/single/:floorId`

Returns a single floor by its ID with hostel info populated.

**Auth required:** Yes

**URL Params:** `floorId`

**Response `200`**

```json
{
  "floor": {
    "_id": "6a2fb7206f18f89d2c0d2510",
    "hostelId": {
      "_id": "6a2fb6406f18f89d2c0d2505",
      "hostelName": "Sunrise PG"
    },
    "floorNumber": 1
  }
}
```

---

### PUT `/api/floor/:floorId`

Updates a floor's number.

**Auth required:** Yes

**URL Params:** `floorId`

**Request Body**

| Field         | Type   | Required | Description          |
|---------------|--------|----------|----------------------|
| `floorNumber` | number | Yes      | New floor number     |

```json
{
  "floorNumber": 3
}
```

**Response `200`**

```json
{
  "message": "Floor updated successfully",
  "floor": {
    "_id": "6a2fb7206f18f89d2c0d2510",
    "hostelId": "6a2fb6406f18f89d2c0d2505",
    "floorNumber": 3
  }
}
```

---

### DELETE `/api/floor/:floorId`

Deletes a floor and all associated rooms and tenants (cascade).

**Auth required:** Yes

**URL Params:** `floorId`

**Response `200`**

```json
{
  "message": "Floor and associated rooms and tenants deleted successfully"
}
```

---

## 4. Room

### POST `/api/room/create`

Creates a new room in a hostel floor.

**Auth required:** Yes

**Request Body**

| Field        | Type   | Required | Description                                      |
|--------------|--------|----------|--------------------------------------------------|
| `hostelId`   | string | Yes      | MongoDB ObjectId of the hostel                   |
| `floorId`    | string | Yes      | MongoDB ObjectId of the floor                    |
| `roomNumber` | string | Yes      | Room identifier (e.g. `"101"`, `"A1"`)           |
| `roomType`   | string | Yes      | e.g. `"single"`, `"double"`, `"triple"`, `"AC"` |
| `totalBeds`  | number | Yes      | Total number of beds in the room                 |

```json
{
  "hostelId": "6a2fb6406f18f89d2c0d2505",
  "floorId": "6a2fb7206f18f89d2c0d2510",
  "roomNumber": "101",
  "roomType": "double",
  "totalBeds": 2
}
```

**Response `201`**

```json
{
  "message": "Room created successfully",
  "room": {
    "_id": "6a2fb8006f18f89d2c0d2520",
    "hostelId": "6a2fb6406f18f89d2c0d2505",
    "floorId": "6a2fb7206f18f89d2c0d2510",
    "roomNumber": "101",
    "roomType": "double",
    "totalBeds": 2,
    "occupiedBeds": 0,
    "vacantBeds": 2,
    "createdAt": "2026-06-15T08:35:00.000Z",
    "updatedAt": "2026-06-15T08:35:00.000Z"
  }
}
```

**Error Responses**

| Status | Message                                              |
|--------|------------------------------------------------------|
| `400`  | `hostelId, floorId, roomNumber, roomType and totalBeds are required` |
| `400`  | `Room number already exists on this floor`           |
| `404`  | `Hostel not found or unauthorized`                   |
| `404`  | `Floor not found in this hostel`                     |

---

### GET `/api/room/:hostelId`

Returns all rooms in a hostel with floor info populated.

**Auth required:** Yes

**URL Params:** `hostelId`

**Response `200`**

```json
{
  "rooms": [
    {
      "_id": "6a2fb8006f18f89d2c0d2520",
      "hostelId": "6a2fb6406f18f89d2c0d2505",
      "floorId": {
        "_id": "6a2fb7206f18f89d2c0d2510",
        "floorNumber": 1
      },
      "roomNumber": "101",
      "roomType": "double",
      "totalBeds": 2,
      "occupiedBeds": 1,
      "vacantBeds": 1
    }
  ]
}
```

---

### GET `/api/room/floor/:floorId`

Returns all rooms on a specific floor.

**Auth required:** Yes

**URL Params:** `floorId`

**Response `200`**

```json
{
  "rooms": [
    {
      "_id": "6a2fb8006f18f89d2c0d2520",
      "roomNumber": "101",
      "roomType": "double",
      "totalBeds": 2,
      "occupiedBeds": 1,
      "vacantBeds": 1
    }
  ]
}
```

---

### GET `/api/room/single/:roomId`

Returns a single room by its ID with floor info populated.

**Auth required:** Yes

**URL Params:** `roomId`

**Response `200`**

```json
{
  "room": {
    "_id": "6a2fb8006f18f89d2c0d2520",
    "hostelId": "6a2fb6406f18f89d2c0d2505",
    "floorId": {
      "_id": "6a2fb7206f18f89d2c0d2510",
      "floorNumber": 1
    },
    "roomNumber": "101",
    "roomType": "double",
    "totalBeds": 2,
    "occupiedBeds": 1,
    "vacantBeds": 1
  }
}
```

---

### PUT `/api/room/:roomId`

Updates room details. Only send fields you want to change.

**Auth required:** Yes

**URL Params:** `roomId`

**Request Body** (all optional)

| Field        | Type   | Description                          |
|--------------|--------|--------------------------------------|
| `roomNumber` | string | New room number                      |
| `roomType`   | string | New room type                        |
| `totalBeds`  | number | New total beds (recalculates vacant) |

```json
{
  "totalBeds": 3,
  "roomType": "triple"
}
```

**Response `200`**

```json
{
  "message": "Room updated successfully",
  "room": {
    "_id": "6a2fb8006f18f89d2c0d2520",
    "roomNumber": "101",
    "roomType": "triple",
    "totalBeds": 3,
    "occupiedBeds": 1,
    "vacantBeds": 2
  }
}
```

---

### DELETE `/api/room/:roomId`

Deletes a room and all tenants + payments inside it (cascade).

**Auth required:** Yes

**URL Params:** `roomId`

**Response `200`**

```json
{
  "message": "Room and associated tenants deleted successfully"
}
```

---

## 5. Tenant

### POST `/api/tenant/create`

Creates a new tenant, assigns them to a room, auto-generates 30-day payment cycles from join date to today, and sends a welcome email.

**Auth required:** Yes

**Request Body**

| Field           | Type   | Required | Description                                   |
|-----------------|--------|----------|-----------------------------------------------|
| `hostelId`      | string | Yes      | MongoDB ObjectId of the hostel                |
| `floorId`       | string | Yes      | MongoDB ObjectId of the floor                 |
| `roomId`        | string | Yes      | MongoDB ObjectId of the room                  |
| `name`          | string | Yes      | Full name of the tenant                       |
| `phoneNumber`   | string | Yes      | Tenant's mobile number                        |
| `email`         | string | No       | Tenant's email (used to send welcome email)   |
| `address`       | string | No       | Permanent address                             |
| `parentNumber`  | string | No       | Parent/guardian contact number                |
| `aadhaarNumber` | string | No       | Aadhaar card number                           |
| `occupation`    | string | No       | e.g. `"Student"`, `"Working Professional"`   |
| `joinedDate`    | string | No       | ISO date string — e.g. `"2026-01-01"`         |
| `monthlyFee`    | number | No       | Monthly rent amount                           |
| `deposit`       | number | No       | Security deposit amount                       |
| `paymentStatus` | string | No       | `"paid"` or `"pending"` (default: `"pending"`) |

```json
{
  "hostelId": "6a2fb6406f18f89d2c0d2505",
  "floorId": "6a2fb7206f18f89d2c0d2510",
  "roomId": "6a2fb8006f18f89d2c0d2520",
  "name": "Arjun Mehta",
  "phoneNumber": "9876543210",
  "email": "arjun@example.com",
  "address": "12 MG Road, Bangalore",
  "parentNumber": "9123456780",
  "aadhaarNumber": "1234 5678 9012",
  "occupation": "Student",
  "joinedDate": "2026-01-01",
  "monthlyFee": 5000,
  "deposit": 10000
}
```

**Response `201`**

```json
{
  "message": "Tenant created successfully",
  "tenant": {
    "_id": "6a2fb9006f18f89d2c0d2530",
    "hostelId": "6a2fb6406f18f89d2c0d2505",
    "floorId": "6a2fb7206f18f89d2c0d2510",
    "roomId": "6a2fb8006f18f89d2c0d2520",
    "name": "Arjun Mehta",
    "phoneNumber": "9876543210",
    "email": "arjun@example.com",
    "address": "12 MG Road, Bangalore",
    "parentNumber": "9123456780",
    "aadhaarNumber": "1234 5678 9012",
    "occupation": "Student",
    "joinedDate": "2026-01-01T00:00:00.000Z",
    "monthlyFee": 5000,
    "deposit": 10000,
    "paymentStatus": "pending",
    "feeStatus": [
      { "month": 6, "year": 2026, "isPaid": false }
    ],
    "createdAt": "2026-06-15T09:00:00.000Z",
    "updatedAt": "2026-06-15T09:00:00.000Z"
  }
}
```

**Error Responses**

| Status | Message                                                 |
|--------|---------------------------------------------------------|
| `400`  | `hostelId, floorId, roomId, name and phoneNumber are required` |
| `400`  | `No vacant beds available in this room`                 |
| `404`  | `Hostel not found or unauthorized`                      |
| `404`  | `Room not found in this hostel/floor`                   |

---

### GET `/api/tenant/:hostelId`

Returns all tenants in a hostel with floor and room info populated.

**Auth required:** Yes

**URL Params:** `hostelId`

**Response `200`**

```json
{
  "tenants": [
    {
      "_id": "6a2fb9006f18f89d2c0d2530",
      "name": "Arjun Mehta",
      "phoneNumber": "9876543210",
      "email": "arjun@example.com",
      "occupation": "Student",
      "joinedDate": "2026-01-01T00:00:00.000Z",
      "monthlyFee": 5000,
      "deposit": 10000,
      "paymentStatus": "pending",
      "floorId": {
        "_id": "6a2fb7206f18f89d2c0d2510",
        "floorNumber": 1
      },
      "roomId": {
        "_id": "6a2fb8006f18f89d2c0d2520",
        "roomNumber": "101",
        "roomType": "double"
      }
    }
  ]
}
```

---

### GET `/api/tenant/single/:tenantId`

Returns a single tenant by ID.

**Auth required:** Yes

**URL Params:** `tenantId`

**Response `200`**

```json
{
  "tenant": {
    "_id": "6a2fb9006f18f89d2c0d2530",
    "name": "Arjun Mehta",
    "phoneNumber": "9876543210",
    "email": "arjun@example.com",
    "address": "12 MG Road, Bangalore",
    "parentNumber": "9123456780",
    "aadhaarNumber": "1234 5678 9012",
    "occupation": "Student",
    "joinedDate": "2026-01-01T00:00:00.000Z",
    "monthlyFee": 5000,
    "deposit": 10000,
    "paymentStatus": "pending",
    "feeStatus": [
      { "month": 6, "year": 2026, "isPaid": false }
    ],
    "floorId": { "_id": "...", "floorNumber": 1 },
    "roomId": { "_id": "...", "roomNumber": "101", "roomType": "double" }
  }
}
```

---

### PUT `/api/tenant/:tenantId`

Updates tenant details. Only send fields you want to change.

**Auth required:** Yes

**URL Params:** `tenantId`

**Request Body** (all optional)

| Field           | Type   | Description                        |
|-----------------|--------|------------------------------------|
| `name`          | string | Updated name                       |
| `phoneNumber`   | string | Updated phone                      |
| `email`         | string | Updated email                      |
| `address`       | string | Updated address                    |
| `parentNumber`  | string | Updated parent contact             |
| `aadhaarNumber` | string | Updated Aadhaar                    |
| `occupation`    | string | Updated occupation                 |
| `joinedDate`    | string | Updated join date                  |
| `monthlyFee`    | number | Updated monthly rent               |
| `deposit`       | number | Updated deposit                    |
| `paymentStatus` | string | `"paid"` or `"pending"`            |

```json
{
  "monthlyFee": 5500,
  "paymentStatus": "paid"
}
```

**Response `200`**

```json
{
  "message": "Tenant updated successfully",
  "tenant": { "...updated tenant object..." }
}
```

---

### DELETE `/api/tenant/:tenantId`

Deletes a tenant, frees up a bed in their room, and removes all their payment records.

**Auth required:** Yes

**URL Params:** `tenantId`

**Response `200`**

```json
{
  "message": "Tenant deleted successfully"
}
```

---

## 6. Payment

### GET `/api/payment/hostel/:hostelId`

Returns all tenants in the hostel with their full payment cycle summary.

**Auth required:** Yes

**URL Params:** `hostelId`

**Response `200`**

```json
{
  "payments": [
    {
      "tenantId": "6a2fb9006f18f89d2c0d2530",
      "tenantName": "Arjun Mehta",
      "phoneNumber": "9876543210",
      "joinedDate": "2026-01-01T00:00:00.000Z",
      "monthlyFee": 5000,
      "paid": 3,
      "unpaid": 2,
      "cycles": [
        {
          "_id": "6a2fba006f18f89d2c0d2540",
          "periodStart": "2026-01-01T00:00:00.000Z",
          "periodEnd": "2026-01-31T00:00:00.000Z",
          "amount": 5000,
          "isPaid": true,
          "paymentMethod": "UPI",
          "paymentDate": "2026-01-05T00:00:00.000Z",
          "note": "January rent"
        }
      ]
    }
  ]
}
```

---

### GET `/api/payment/:tenantId`

Returns all 30-day payment cycles for a specific tenant with a summary.

**Auth required:** Yes

**URL Params:** `tenantId`

**Response `200`**

```json
{
  "tenantId": "6a2fb9006f18f89d2c0d2530",
  "tenantName": "Arjun Mehta",
  "monthlyFee": 5000,
  "joinedDate": "2026-01-01T00:00:00.000Z",
  "totalCycles": 5,
  "paid": 3,
  "unpaid": 2,
  "cycles": [
    {
      "_id": "6a2fba006f18f89d2c0d2540",
      "periodStart": "2026-01-01T00:00:00.000Z",
      "periodEnd": "2026-01-31T00:00:00.000Z",
      "amount": 5000,
      "isPaid": true,
      "paymentMethod": "UPI",
      "paymentDate": "2026-01-05T00:00:00.000Z",
      "note": "January rent"
    }
  ]
}
```

---

### PUT `/api/payment/:paymentId`

Marks a payment cycle as paid or unpaid. Automatically syncs the tenant's `feeStatus` and `paymentStatus`.

**Auth required:** Yes

**URL Params:** `paymentId`

**Request Body** (all optional — send only what you want to update)

| Field           | Type    | Description                                         |
|-----------------|---------|-----------------------------------------------------|
| `isPaid`        | boolean | `true` to mark paid, `false` to mark unpaid         |
| `paymentMethod` | string  | e.g. `"Cash"`, `"UPI"`, `"Bank Transfer"`, `"Cheque"` |
| `paymentDate`   | string  | ISO date string of when payment was made            |
| `amount`        | number  | Override the payment amount                         |
| `note`          | string  | Any note about this payment                         |

```json
{
  "isPaid": true,
  "paymentMethod": "UPI",
  "paymentDate": "2026-06-15",
  "note": "Paid via PhonePe"
}
```

**Response `200`**

```json
{
  "message": "Payment updated successfully",
  "payment": {
    "_id": "6a2fba006f18f89d2c0d2540",
    "hostelId": "6a2fb6406f18f89d2c0d2505",
    "tenantId": "6a2fb9006f18f89d2c0d2530",
    "amount": 5000,
    "periodStart": "2026-01-01T00:00:00.000Z",
    "periodEnd": "2026-01-31T00:00:00.000Z",
    "isPaid": true,
    "paymentMethod": "UPI",
    "paymentDate": "2026-06-15T00:00:00.000Z",
    "note": "Paid via PhonePe"
  }
}
```

---

## 7. Expense

### POST `/api/expense/create`

Records a new hostel expense.

**Auth required:** Yes

**Request Body**

| Field           | Type   | Required | Description                                        |
|-----------------|--------|----------|----------------------------------------------------|
| `hostelId`      | string | Yes      | MongoDB ObjectId of the hostel                     |
| `expenseReason` | string | Yes      | Reason for the expense                             |
| `amount`        | number | Yes      | Amount spent                                       |
| `date`          | string | Yes      | ISO date string — e.g. `"2026-06-15"`              |
| `paymentMethod` | string | No       | e.g. `"Cash"`, `"UPI"`, `"Bank Transfer"`          |
| `note`          | string | No       | Additional notes                                   |

```json
{
  "hostelId": "6a2fb6406f18f89d2c0d2505",
  "expenseReason": "Plumbing repair",
  "amount": 2500,
  "date": "2026-06-15",
  "paymentMethod": "Cash",
  "note": "Fixed bathroom leak in room 201"
}
```

**Response `201`**

```json
{
  "message": "Expense created successfully",
  "expense": {
    "_id": "6a2fbb006f18f89d2c0d2550",
    "hostelId": "6a2fb6406f18f89d2c0d2505",
    "expenseReason": "Plumbing repair",
    "amount": 2500,
    "date": "2026-06-15T00:00:00.000Z",
    "paymentMethod": "Cash",
    "note": "Fixed bathroom leak in room 201",
    "month": 6,
    "year": 2026,
    "createdAt": "2026-06-15T10:00:00.000Z",
    "updatedAt": "2026-06-15T10:00:00.000Z"
  }
}
```

**Error Responses**

| Status | Message                                                   |
|--------|-----------------------------------------------------------|
| `400`  | `hostelId, expenseReason, amount and date are required`   |
| `404`  | `Hostel not found or unauthorized`                        |

---

### GET `/api/expense/:hostelId`

Returns all expenses for a hostel. Supports optional month/year filtering.

**Auth required:** Yes

**URL Params:** `hostelId`

**Query Params** (optional)

| Param   | Type   | Description                        |
|---------|--------|------------------------------------|
| `month` | number | Filter by month (1–12)             |
| `year`  | number | Filter by year (e.g. `2026`)       |

**Example:** `GET /api/expense/6a2fb6406f18f89d2c0d2505?month=6&year=2026`

**Response `200`**

```json
{
  "expenses": [
    {
      "_id": "6a2fbb006f18f89d2c0d2550",
      "hostelId": "6a2fb6406f18f89d2c0d2505",
      "expenseReason": "Plumbing repair",
      "amount": 2500,
      "date": "2026-06-15T00:00:00.000Z",
      "paymentMethod": "Cash",
      "note": "Fixed bathroom leak in room 201",
      "month": 6,
      "year": 2026
    }
  ]
}
```

---

### PUT `/api/expense/:expenseId`

Updates an expense record. Only send fields you want to change.

**Auth required:** Yes

**URL Params:** `expenseId`

**Request Body** (all optional)

| Field           | Type   | Description                             |
|-----------------|--------|-----------------------------------------|
| `expenseReason` | string | Updated reason                          |
| `amount`        | number | Updated amount                          |
| `date`          | string | Updated date (recalculates month/year)  |
| `paymentMethod` | string | Updated payment method                  |
| `note`          | string | Updated note                            |

```json
{
  "amount": 3000,
  "note": "Additional materials included"
}
```

**Response `200`**

```json
{
  "message": "Expense updated successfully",
  "expense": { "...updated expense object..." }
}
```

---

### DELETE `/api/expense/:expenseId`

Deletes an expense record.

**Auth required:** Yes

**URL Params:** `expenseId`

**Response `200`**

```json
{
  "message": "Expense deleted successfully"
}
```

---

## 8. Ticket (Owner)

Tickets are raised by tenants via the dashboard and managed by the owner via these endpoints.

### GET `/api/tickets/hostel/:hostelId`

Returns all tickets for a hostel, with tenant details populated, sorted newest first.

**Auth required:** Yes

**URL Params:** `hostelId`

**Response `200`**

```json
{
  "total": 2,
  "tickets": [
    {
      "_id": "6a2fbc006f18f89d2c0d2560",
      "hostelId": "6a2fb6406f18f89d2c0d2505",
      "tenantId": {
        "_id": "6a2fb9006f18f89d2c0d2530",
        "name": "Arjun Mehta",
        "phoneNumber": "9876543210",
        "roomId": "6a2fb8006f18f89d2c0d2520"
      },
      "title": "AC not working",
      "category": "Maintenance",
      "description": "The AC in my room has stopped cooling.",
      "imageLink": "https://example.com/image.jpg",
      "status": "open",
      "createdAt": "2026-06-15T10:30:00.000Z",
      "updatedAt": "2026-06-15T10:30:00.000Z"
    }
  ]
}
```

---

### GET `/api/tickets/tenant/:tenantId`

Returns all tickets raised by a specific tenant.

**Auth required:** Yes

**URL Params:** `tenantId`

**Response `200`**

```json
{
  "total": 1,
  "tickets": [
    {
      "_id": "6a2fbc006f18f89d2c0d2560",
      "hostelId": "6a2fb6406f18f89d2c0d2505",
      "tenantId": "6a2fb9006f18f89d2c0d2530",
      "title": "AC not working",
      "category": "Maintenance",
      "description": "The AC in my room has stopped cooling.",
      "imageLink": null,
      "status": "open",
      "createdAt": "2026-06-15T10:30:00.000Z",
      "updatedAt": "2026-06-15T10:30:00.000Z"
    }
  ]
}
```

---

### PUT `/api/tickets/:ticketId/status`

Updates the status of a ticket.

**Auth required:** Yes

**URL Params:** `ticketId`

**Request Body**

| Field    | Type   | Required | Allowed Values                           |
|----------|--------|----------|------------------------------------------|
| `status` | string | Yes      | `"open"`, `"in-progress"`, `"resolved"` |

```json
{
  "status": "in-progress"
}
```

**Response `200`**

```json
{
  "message": "Ticket status updated",
  "ticket": {
    "_id": "6a2fbc006f18f89d2c0d2560",
    "title": "AC not working",
    "category": "Maintenance",
    "status": "in-progress",
    "updatedAt": "2026-06-15T11:00:00.000Z"
  }
}
```

**Error Responses**

| Status | Message                                            |
|--------|----------------------------------------------------|
| `400`  | `status must be one of: open, in-progress, resolved` |
| `403`  | `Unauthorized`                                     |
| `404`  | `Ticket not found`                                 |

---

## 9. Tenant Dashboard

These endpoints are for the **tenant-facing dashboard**. They do not use the owner Bearer token — instead they use a **dashboard token** (JWT containing `hostelId` + `tenantId`) passed in the **request body**.

The dashboard token is generated automatically when a tenant is created and embedded in their welcome email link.

---

### POST `/api/dashboard`

Returns the full tenant dashboard: profile, hostel info, room, payment cycles, and tickets.

**Auth required:** No (uses dashboard token in body)

**Request Body**

| Field   | Type   | Required | Description                          |
|---------|--------|----------|--------------------------------------|
| `token` | string | Yes      | Dashboard JWT from the welcome link  |

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200`**

```json
{
  "tenant": {
    "id": "6a2fb9006f18f89d2c0d2530",
    "name": "Arjun Mehta",
    "phoneNumber": "9876543210",
    "email": "arjun@example.com",
    "occupation": "Student",
    "joinedDate": "2026-01-01T00:00:00.000Z",
    "paymentStatus": "pending"
  },
  "hostel": {
    "id": "6a2fb6406f18f89d2c0d2505",
    "hostelName": "Sunrise PG",
    "hostelType": "boys",
    "ownerName": "Ravi Kumar",
    "ownerNumber": "9876543210",
    "email": "ravi@example.com"
  },
  "room": {
    "id": "6a2fb8006f18f89d2c0d2520",
    "roomNumber": "101",
    "roomType": "double",
    "totalBeds": 2
  },
  "payments": {
    "monthlyRent": 5000,
    "deposit": 10000,
    "totalDues": 10000,
    "paidCycles": 3,
    "unpaidCycles": 2,
    "lastPaidDate": "2026-04-05T00:00:00.000Z",
    "cycles": [
      {
        "_id": "6a2fba006f18f89d2c0d2540",
        "periodStart": "2026-01-01T00:00:00.000Z",
        "periodEnd": "2026-01-31T00:00:00.000Z",
        "amount": 5000,
        "isPaid": true,
        "paymentDate": "2026-01-05T00:00:00.000Z",
        "paymentMethod": "UPI"
      }
    ]
  },
  "tickets": [
    {
      "_id": "6a2fbc006f18f89d2c0d2560",
      "title": "AC not working",
      "category": "Maintenance",
      "description": "The AC in my room has stopped cooling.",
      "imageLink": null,
      "status": "open",
      "createdAt": "2026-06-15T10:30:00.000Z",
      "updatedAt": "2026-06-15T10:30:00.000Z"
    }
  ]
}
```

**Error Responses**

| Status | Message                          |
|--------|----------------------------------|
| `400`  | `Token is required`              |
| `401`  | `Invalid token`                  |
| `401`  | `Invalid token payload`          |
| `404`  | `Tenant not found`               |
| `404`  | `Hostel not found`               |

---

### POST `/api/dashboard/ticket`

Allows a tenant to raise a new support/complaint ticket.

**Auth required:** No (uses dashboard token in body)

**Request Body**

| Field         | Type   | Required | Description                                       |
|---------------|--------|----------|---------------------------------------------------|
| `token`       | string | Yes      | Dashboard JWT                                     |
| `title`       | string | Yes      | Short title of the issue                          |
| `category`    | string | Yes      | e.g. `"Maintenance"`, `"Cleanliness"`, `"Other"` |
| `description` | string | Yes      | Detailed description of the issue                 |
| `imageLink`   | string | No       | URL to an uploaded image                          |

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "title": "Leaking tap",
  "category": "Maintenance",
  "description": "The tap in the bathroom is leaking continuously.",
  "imageLink": "https://example.com/images/tap.jpg"
}
```

**Response `201`**

```json
{
  "message": "Ticket raised successfully",
  "ticket": {
    "_id": "6a2fbc006f18f89d2c0d2560",
    "hostelId": "6a2fb6406f18f89d2c0d2505",
    "tenantId": "6a2fb9006f18f89d2c0d2530",
    "title": "Leaking tap",
    "category": "Maintenance",
    "description": "The tap in the bathroom is leaking continuously.",
    "imageLink": "https://example.com/images/tap.jpg",
    "status": "open",
    "createdAt": "2026-06-15T11:00:00.000Z",
    "updatedAt": "2026-06-15T11:00:00.000Z"
  }
}
```

**Error Responses**

| Status | Message                                        |
|--------|------------------------------------------------|
| `400`  | `title, category and description are required` |
| `401`  | `Invalid token`                                |
| `404`  | `Tenant not found`                             |

---

### POST `/api/dashboard/tickets`

Returns all tickets raised by the tenant identified by the dashboard token.

**Auth required:** No (uses dashboard token in body)

**Request Body**

| Field   | Type   | Required | Description     |
|---------|--------|----------|-----------------|
| `token` | string | Yes      | Dashboard JWT   |

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200`**

```json
{
  "total": 2,
  "tickets": [
    {
      "_id": "6a2fbc006f18f89d2c0d2560",
      "title": "AC not working",
      "category": "Maintenance",
      "description": "The AC in my room has stopped cooling.",
      "status": "resolved",
      "createdAt": "2026-06-10T10:00:00.000Z",
      "updatedAt": "2026-06-12T14:00:00.000Z"
    }
  ]
}
```

---

## 10. Temporary Tenant

Used for a self-registration flow where the owner shares a form link with a prospective tenant. The tenant fills the form and the owner approves or rejects.

---

### POST `/api/temporary-tenant/generate-token`

Generates a short-lived (15-minute) form token tied to a hostel. Share this token with the prospective tenant as a form link.

**Auth required:** No

**Request Body**

| Field      | Type   | Required | Description                    |
|------------|--------|----------|--------------------------------|
| `hostelId` | string | Yes      | MongoDB ObjectId of the hostel |

```json
{
  "hostelId": "6a2fb6406f18f89d2c0d2505"
}
```

**Response `200`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "hostelId": "6a2fb6406f18f89d2c0d2505",
  "issuedAt": "2026-06-15T11:00:00.000Z",
  "expiresAt": "2026-06-15T11:15:00.000Z",
  "expiresInMinutes": 15
}
```

---

### POST `/api/temporary-tenant/submit`

Submits the tenant registration form. Uses the form token in the `Authorization` header.

**Auth required:** No (form token via `Authorization: Bearer <form_token>`)

**Headers**

```
Authorization: Bearer <form_token>
```

**Request Body**

| Field           | Type   | Required | Description                           |
|-----------------|--------|----------|---------------------------------------|
| `floorNumber`   | number | Yes      | Floor number to be assigned to        |
| `roomNumber`    | string | Yes      | Room number to be assigned to         |
| `name`          | string | Yes      | Full name of the tenant               |
| `phoneNumber`   | string | Yes      | Contact number                        |
| `email`         | string | No       | Email address                         |
| `address`       | string | No       | Permanent address                     |
| `parentNumber`  | string | No       | Parent/guardian number                |
| `aadhaarNumber` | string | No       | Aadhaar number                        |
| `occupation`    | string | No       | Occupation                            |
| `joinedDate`    | string | No       | Intended join date                    |
| `monthlyFee`    | number | No       | Expected monthly rent                 |
| `deposit`       | number | No       | Security deposit                      |

```json
{
  "floorNumber": 1,
  "roomNumber": "101",
  "name": "Priya Sharma",
  "phoneNumber": "9988776655",
  "email": "priya@example.com",
  "occupation": "Student",
  "joinedDate": "2026-07-01",
  "monthlyFee": 5000,
  "deposit": 10000
}
```

**Response `201`**

```json
{
  "message": "Form submitted successfully",
  "temporaryTenant": {
    "_id": "6a2fbd006f18f89d2c0d2570",
    "hostelId": "6a2fb6406f18f89d2c0d2505",
    "floorId": "6a2fb7206f18f89d2c0d2510",
    "roomId": "6a2fb8006f18f89d2c0d2520",
    "name": "Priya Sharma",
    "phoneNumber": "9988776655",
    "email": "priya@example.com",
    "occupation": "Student",
    "joinedDate": "2026-07-01T00:00:00.000Z",
    "monthlyFee": 5000,
    "deposit": 10000,
    "paymentStatus": "pending",
    "createdAt": "2026-06-15T11:05:00.000Z"
  }
}
```

**Error Responses**

| Status | Message                                                    |
|--------|------------------------------------------------------------|
| `400`  | `floorNumber, roomNumber, name and phoneNumber are required` |
| `400`  | `No vacant beds available in this room`                    |
| `401`  | `Form token is required`                                   |
| `401`  | `Form link has expired. Please request a new one.`         |
| `401`  | `Invalid form token`                                       |
| `404`  | `Floor X not found in this hostel`                         |
| `404`  | `Room X not found on floor Y`                              |

---

### GET `/api/temporary-tenant/hostel/:hostelId`

Returns all pending temporary tenants for a hostel.

**Auth required:** Yes

**URL Params:** `hostelId`

**Response `200`**

```json
{
  "hostelId": "6a2fb6406f18f89d2c0d2505",
  "total": 1,
  "tenants": [
    {
      "_id": "6a2fbd006f18f89d2c0d2570",
      "name": "Priya Sharma",
      "phoneNumber": "9988776655",
      "email": "priya@example.com",
      "occupation": "Student",
      "joinedDate": "2026-07-01T00:00:00.000Z",
      "monthlyFee": 5000,
      "deposit": 10000,
      "floorId": {
        "_id": "6a2fb7206f18f89d2c0d2510",
        "floorNumber": 1
      },
      "roomId": {
        "_id": "6a2fb8006f18f89d2c0d2520",
        "roomNumber": "101"
      },
      "createdAt": "2026-06-15T11:05:00.000Z"
    }
  ]
}
```

---

### POST `/api/temporary-tenant/approve/:tempTenantId`

Approves a temporary tenant — promotes them to a full tenant, assigns the bed, auto-generates payment cycles, and sends a welcome email.

**Auth required:** Yes

**URL Params:** `tempTenantId`

**Request Body:** None

**Response `201`**

```json
{
  "message": "Tenant approved and moved to tenants successfully",
  "tenant": {
    "_id": "6a2fb9006f18f89d2c0d2531",
    "hostelId": "6a2fb6406f18f89d2c0d2505",
    "floorId": "6a2fb7206f18f89d2c0d2510",
    "roomId": "6a2fb8006f18f89d2c0d2520",
    "name": "Priya Sharma",
    "phoneNumber": "9988776655",
    "email": "priya@example.com",
    "monthlyFee": 5000,
    "deposit": 10000,
    "paymentStatus": "pending",
    "createdAt": "2026-06-15T11:10:00.000Z"
  }
}
```

**Error Responses**

| Status | Message                                   |
|--------|-------------------------------------------|
| `400`  | `No vacant beds available in this room`   |
| `403`  | `Unauthorized`                            |
| `404`  | `Temporary tenant not found`              |
| `404`  | `Room not found`                          |

---

### DELETE `/api/temporary-tenant/:tempTenantId`

Rejects and deletes a temporary tenant application.

**Auth required:** Yes

**URL Params:** `tempTenantId`

**Response `200`**

```json
{
  "message": "Temporary tenant deleted successfully"
}
```

---

## Common Error Codes

| Status | Meaning                                                   |
|--------|-----------------------------------------------------------|
| `400`  | Bad Request — missing or invalid fields                   |
| `401`  | Unauthorized — missing, invalid, or expired token         |
| `403`  | Forbidden — token valid but resource doesn't belong to you |
| `404`  | Not Found — resource doesn't exist                        |
| `500`  | Internal Server Error — check server logs                 |

---

## Notes

- All IDs are MongoDB ObjectIds (24-character hex strings).
- All dates are returned in ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- Payment cycles are **30-day windows** generated automatically from `joinedDate` to today when a tenant is created or approved.
- The `feeStatus` array on a tenant tracks paid/unpaid status per calendar month and is synced automatically when a payment is updated.
- The dashboard token has **no expiry** — it's a permanent link for the tenant.
- The form token (for tenant self-registration) expires in **15 minutes**.
