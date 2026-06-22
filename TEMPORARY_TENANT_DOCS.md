# Temporary Tenant API Documentation

**Base URL:** `http://13.60.202.87:4000`  
**Content-Type:** `application/json`

---

## Overview

The Temporary Tenant flow is a **two-step self-registration system**:

```
Owner generates form token
        ↓
Owner shares link with prospective tenant
        ↓
Tenant fills and submits the form (using form token)
        ↓
Owner reviews pending applications
        ↓
Owner approves (→ becomes full Tenant) or rejects (→ deleted)
```

---

## Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/temporary-tenant/generate-token` | Owner token | Generate 15-min form token |
| POST | `/api/temporary-tenant/submit` | Form token (header) | Tenant submits registration form |
| GET | `/api/temporary-tenant/hostel/:hostelId` | Owner token | List all pending applications |
| POST | `/api/temporary-tenant/approve/:tempTenantId` | Owner token | Approve → promote to full tenant |
| DELETE | `/api/temporary-tenant/:tempTenantId` | Owner token | Reject and delete application |

---

## 1. POST `/api/temporary-tenant/generate-token`

**What it does:** Generates a short-lived 15-minute JWT tied to a specific hostel. The owner shares this token (embedded in a form URL) with a prospective tenant. Only works for hostels owned by the authenticated owner.

**Auth required:** Yes — owner Bearer token

**Header**
```
Authorization: Bearer <owner_token>
```

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `hostelId` | string | Yes | MongoDB ObjectId of the hostel |

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
  "issuedAt": "2026-06-21T11:00:00.000Z",
  "expiresAt": "2026-06-21T11:15:00.000Z",
  "expiresInMinutes": 15
}
```

**How to use the token:**
Build a form link and share it with the tenant:
```
https://your-form-app.com/register?token=<token>
```
The tenant's frontend reads this token and sends it in the `Authorization` header when submitting the form.

**Error Responses**

| Status | Message |
|---|---|
| `400` | `hostelId is required` |
| `401` | `No token, authorization denied` |
| `404` | `Hostel not found or unauthorized` |
| `500` | `<error details>` |

---

## 2. POST `/api/temporary-tenant/submit`

**What it does:** Public form submission endpoint. Reads the 15-minute form token from the `Authorization` header. Automatically resolves `floorNumber` → floorId and `roomNumber` → roomId. Checks for vacant beds. Blocks duplicate submissions from the same phone number. Creates a pending `TemporaryTenant` record for the owner to review.

**Auth required:** No — form token via Authorization header

**Header**
```
Authorization: Bearer <form_token_from_generate-token>
```

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `floorNumber` | number | Yes | Floor number (not ID) — e.g. `1`, `2` |
| `roomNumber` | string | Yes | Room number (not ID) — e.g. `"101"` |
| `name` | string | Yes | Full name |
| `phoneNumber` | string | Yes | Mobile number |
| `email` | string | No | Email address |
| `address` | string | No | Permanent address |
| `parentNumber` | string | No | Parent/guardian contact |
| `aadhaarNumber` | string | No | Aadhaar card number |
| `occupation` | string | No | e.g. `"Student"`, `"Working Professional"` |
| `joinedDate` | string | No | Expected join date — ISO format `"2026-07-01"` |
| `monthlyFee` | number | No | Expected monthly rent |
| `deposit` | number | No | Security deposit amount |

```json
{
  "floorNumber": 1,
  "roomNumber": "101",
  "name": "Priya Sharma",
  "phoneNumber": "9988776655",
  "email": "priya@example.com",
  "address": "45 Anna Nagar, Chennai",
  "parentNumber": "9944332211",
  "aadhaarNumber": "5678 1234 9012",
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
    "address": "45 Anna Nagar, Chennai",
    "parentNumber": "9944332211",
    "aadhaarNumber": "5678 1234 9012",
    "occupation": "Student",
    "joinedDate": "2026-07-01T00:00:00.000Z",
    "monthlyFee": 5000,
    "deposit": 10000,
    "paymentStatus": "pending",
    "feeStatus": [
      { "month": 6, "year": 2026, "isPaid": false }
    ],
    "createdAt": "2026-06-21T11:05:00.000Z",
    "updatedAt": "2026-06-21T11:05:00.000Z"
  }
}
```

**Error Responses**

| Status | Message |
|---|---|
| `400` | `floorNumber, roomNumber, name and phoneNumber are required` |
| `400` | `No vacant beds available in this room` |
| `400` | `A registration with this phone number is already pending approval` |
| `401` | `Form token is required` |
| `401` | `Form link has expired. Please request a new one.` |
| `401` | `Invalid form token` |
| `404` | `Floor 1 not found in this hostel` |
| `404` | `Room 101 not found on floor 1` |
| `500` | `<error details>` |

---

## 3. GET `/api/temporary-tenant/hostel/:hostelId`

**What it does:** Returns all pending temporary tenant applications for a hostel, sorted newest first. Floor and room details are populated.

**Auth required:** Yes — owner Bearer token

**URL Param:** `hostelId`

**Request Body:** None

**Response `200`**
```json
{
  "hostelId": "6a2fb6406f18f89d2c0d2505",
  "total": 2,
  "tenants": [
    {
      "_id": "6a2fbd006f18f89d2c0d2570",
      "hostelId": "6a2fb6406f18f89d2c0d2505",
      "floorId": {
        "_id": "6a2fb7206f18f89d2c0d2510",
        "floorNumber": 1
      },
      "roomId": {
        "_id": "6a2fb8006f18f89d2c0d2520",
        "roomNumber": "101"
      },
      "name": "Priya Sharma",
      "phoneNumber": "9988776655",
      "email": "priya@example.com",
      "occupation": "Student",
      "joinedDate": "2026-07-01T00:00:00.000Z",
      "monthlyFee": 5000,
      "deposit": 10000,
      "paymentStatus": "pending",
      "createdAt": "2026-06-21T11:05:00.000Z"
    }
  ]
}
```

**Error Responses**

| Status | Message |
|---|---|
| `401` | `No token, authorization denied` |
| `403` | `Unauthorized or hostel not found` |
| `500` | `<error details>` |

---

## 4. POST `/api/temporary-tenant/approve/:tempTenantId`

**What it does:** Approves a temporary tenant and promotes them to a full tenant. The owner can override any field from the temp record by passing it in the request body. Fields not provided fall back to the temp record's values. Steps performed:
1. Verifies hostel ownership
2. Resolves room from request body `roomId` (or falls back to temp record's roomId)
3. Checks room still has vacant beds
4. Creates a `Tenant` record using request body fields (with temp record as fallback)
5. Increments `occupiedBeds`, decrements `vacantBeds` on the room
6. Generates 30-day payment cycles from `joinedDate` to today
7. Deletes the temporary tenant record
8. Sends welcome email with permanent dashboard link (after response)

**Auth required:** Yes — owner Bearer token

**URL Param:** `tempTenantId`

**Request Body** (all optional — falls back to temp record values if not provided)

| Field | Type | Description |
|---|---|---|
| `name` | string | Override tenant name |
| `phoneNumber` | string | Override phone number |
| `email` | string | Override email |
| `address` | string | Override address |
| `parentNumber` | string | Override parent contact |
| `aadhaarNumber` | string | Override Aadhaar number |
| `occupation` | string | Override occupation |
| `joinedDate` | string | Override join date — ISO format |
| `monthlyFee` | number | Override monthly rent |
| `deposit` | number | Override deposit |
| `paymentStatus` | string | `"paid"` or `"pending"` — default `"pending"` |
| `floorId` | string | Override floor (ObjectId) |
| `roomId` | string | Override room (ObjectId) |

```json
{
  "name": "Priya Sharma",
  "joinedDate": "2026-07-01",
  "monthlyFee": 6000,
  "deposit": 12000,
  "paymentStatus": "pending",
  "roomId": "6a2fb8006f18f89d2c0d2520"
}
```

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
    "address": "45 Anna Nagar, Chennai",
    "parentNumber": "9944332211",
    "aadhaarNumber": "5678 1234 9012",
    "occupation": "Student",
    "joinedDate": "2026-07-01T00:00:00.000Z",
    "monthlyFee": 6000,
    "deposit": 12000,
    "paymentStatus": "pending",
    "feeStatus": [
      { "month": 7, "year": 2026, "isPaid": false }
    ],
    "createdAt": "2026-06-21T11:10:00.000Z",
    "updatedAt": "2026-06-21T11:10:00.000Z"
  }
}
```

**Error Responses**

| Status | Message |
|---|---|
| `400` | `No vacant beds available in this room` |
| `401` | `No token, authorization denied` |
| `403` | `Unauthorized` |
| `404` | `Temporary tenant not found` |
| `404` | `Room not found` |
| `500` | `<error details>` |

---

## 5. DELETE `/api/temporary-tenant/:tempTenantId`

**What it does:** Rejects and permanently deletes a temporary tenant application. No room bed counts are affected since the tenant was never officially assigned.

**Auth required:** Yes — owner Bearer token

**URL Param:** `tempTenantId`

**Request Body:** None

**Response `200`**
```json
{
  "message": "Temporary tenant deleted successfully"
}
```

**Error Responses**

| Status | Message |
|---|---|
| `401` | `No token, authorization denied` |
| `403` | `Unauthorized` |
| `404` | `Temporary tenant not found` |
| `500` | `<error details>` |

---

## TemporaryTenant Model Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | Auto | MongoDB document ID |
| `hostelId` | ObjectId | Yes | Reference to Hostel |
| `floorId` | ObjectId | Yes | Reference to Floor |
| `roomId` | ObjectId | Yes | Reference to Room |
| `name` | string | Yes | Full name |
| `phoneNumber` | string | Yes | Mobile number |
| `email` | string | No | Email address |
| `address` | string | No | Permanent address |
| `parentNumber` | string | No | Parent/guardian contact |
| `aadhaarNumber` | string | No | Aadhaar number |
| `occupation` | string | No | Occupation |
| `joinedDate` | Date | No | Intended join date |
| `monthlyFee` | number | No | Monthly rent |
| `deposit` | number | No | Security deposit |
| `paymentStatus` | string | No | Default `"pending"` |
| `feeStatus` | array | No | `[{ month, year, isPaid }]` |
| `createdAt` | Date | Auto | Submission timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |
