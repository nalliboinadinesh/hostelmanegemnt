# Temporary Tenant API Documentation

**Base URL:** `http://localhost:4000`

---

## Overview

The Temporary Tenant system is a two-step flow:

1. **Owner** generates a short-lived JWT token (15 min) tied to a hostel
2. **Tenant** uses that token to fill and submit their details — no account needed
3. **Owner** reviews and either **approves** (moves to tenants) or **deletes** the submission

```
Owner generates token
        │
        ▼
Tenant submits form using token
        │
        ▼
Data saved in temporaryTenants collection
        │
        ├── Owner approves → moved to tenants + payments generated + temp deleted
        └── Owner rejects → temp deleted
```

---

## Model — TemporaryTenant

Collection: `temporaryTenants`

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
| createdAt | Date | Auto | |
| updatedAt | Date | Auto | |

---

## APIs

---

### 1. Generate Form Token

**POST** `/api/temporary-tenant/generate-token`

No authorization required. Owner calls this to generate a shareable 15-minute token for a specific hostel.

**Request Body:**
```json
{
  "hostelId": "6a086fb4f1e4c3bcfa2c37e1"
}
```

**Response `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "issuedAt": "2026-05-18T14:39:39.604Z",
  "expiresAt": "2026-05-18T14:54:39.604Z",
  "expiresInMinutes": 15
}
```

**Errors:**

| Status | Response |
|--------|----------|
| `400` | `{ "message": "hostelId is required" }` |
| `404` | `{ "message": "Hostel not found" }` |
| `500` | `{ "message": "Internal server error" }` |

---

### 2. Submit Tenant Form

**POST** `/api/temporary-tenant/submit`

No owner authorization required. Tenant submits their details using the form token generated in step 1.

The form accepts human-readable `floorNumber` and `roomNumber` instead of ObjectIds. The backend resolves them to the correct ObjectIds internally before saving.

**Headers:**
```
Authorization: Bearer <form_token_from_generate_token>
```

**Request Body:**
```json
{
  "floorNumber": 1,
  "roomNumber": "101",
  "name": "John Doe",
  "phoneNumber": "9876543210",
  "email": "john@example.com",
  "address": "123 Main St, Chennai",
  "parentNumber": "9876500000",
  "aadhaarNumber": "1234-5678-9012",
  "occupation": "Student",
  "joinedDate": "2026-05-01",
  "monthlyFee": 5000,
  "deposit": 10000
}
```

**Required fields:** `floorNumber`, `roomNumber`, `name`, `phoneNumber`

> `floorNumber` and `roomNumber` are the display values (e.g. floor 1, room 101). The backend looks them up against the hostel embedded in the form token and resolves them to ObjectIds before saving.

**Response `201`:**
```json
{
  "message": "Form submitted successfully",
  "temporaryTenant": {
    "_id": "6a0b24bda7a54af8243684ce",
    "hostelId": "6a086fb4f1e4c3bcfa2c37e1",
    "floorId": "6a08811d6b1b1a0a032d8ef4",
    "roomId": "6a08a90f382298f4c1a2ba0a",
    "name": "John Doe",
    "phoneNumber": "9876543210",
    "email": "john@example.com",
    "address": "123 Main St, Chennai",
    "parentNumber": "9876500000",
    "aadhaarNumber": "1234-5678-9012",
    "occupation": "Student",
    "joinedDate": "2026-05-01T00:00:00.000Z",
    "monthlyFee": 5000,
    "deposit": 10000,
    "paymentStatus": "pending",
    "feeStatus": [
      { "month": 5, "year": 2026, "isPaid": false }
    ],
    "createdAt": "2026-05-18T14:39:57.463Z",
    "updatedAt": "2026-05-18T14:39:57.463Z"
  }
}
```

**Errors:**

| Status | Response |
|--------|----------|
| `400` | `{ "message": "floorNumber, roomNumber, name and phoneNumber are required" }` |
| `400` | `{ "message": "No vacant beds available in this room" }` |
| `401` | `{ "message": "Form token is required" }` |
| `401` | `{ "message": "Form link has expired. Please request a new one." }` |
| `401` | `{ "message": "Invalid form token" }` |
| `404` | `{ "message": "Floor {floorNumber} not found in this hostel" }` |
| `404` | `{ "message": "Room {roomNumber} not found on floor {floorNumber}" }` |
| `500` | `{ "message": "Internal server error" }` |

---

### 3. Get Temporary Tenants by Hostel

**GET** `/api/temporary-tenant/hostel/:hostelId`

Owner authorization required. Returns all pending temporary tenant submissions for a specific hostel, sorted newest first.

**Headers:**
```
Authorization: Bearer <owner_jwt_token>
```

**URL Params:**
- `hostelId` — the `_id` of the hostel

**Response `200`:**
```json
{
  "hostelId": "6a086fb4f1e4c3bcfa2c37e1",
  "total": 2,
  "tenants": [
    {
      "_id": "6a0b24bda7a54af8243684ce",
      "hostelId": "6a086fb4f1e4c3bcfa2c37e1",
      "floorId": { "_id": "6a08811d6b1b1a0a032d8ef4", "floorNumber": 1 },
      "roomId": { "_id": "6a08a90f382298f4c1a2ba0a", "roomNumber": "101" },
      "name": "John Doe",
      "phoneNumber": "9876543210",
      "email": "john@example.com",
      "occupation": "Student",
      "joinedDate": "2026-05-01T00:00:00.000Z",
      "monthlyFee": 5000,
      "deposit": 10000,
      "paymentStatus": "pending",
      "feeStatus": [{ "month": 5, "year": 2026, "isPaid": false }],
      "createdAt": "2026-05-21T05:36:52.166Z",
      "updatedAt": "2026-05-21T05:36:52.166Z"
    }
  ]
}
```

**Errors:**

| Status | Response |
|--------|----------|
| `401` | `{ "message": "No token, authorization denied" }` |
| `403` | `{ "message": "Unauthorized or hostel not found" }` |
| `500` | `{ "message": "Internal server error" }` |

---

### 4. Approve Tenant

**POST** `/api/temporary-tenant/approve/:tempTenantId`

Owner authorization required. Moves the temporary tenant into the main `tenants` collection, updates room occupancy, generates 30-day payment cycles, and deletes the record from `temporaryTenants`.

**Headers:**
```
Authorization: Bearer <owner_jwt_token>
```

**URL Params:**
- `tempTenantId` — the `_id` of the temporary tenant record

**No request body required.**

**Response `201`:**
```json
{
  "message": "Tenant approved and moved to tenants successfully",
  "tenant": {
    "_id": "6a0b24f1a7a54af8243684d3",
    "hostelId": "6a086fb4f1e4c3bcfa2c37e1",
    "floorId": "6a08811d6b1b1a0a032d8ef4",
    "roomId": "6a08a90f382298f4c1a2ba0a",
    "name": "John Doe",
    "phoneNumber": "9876543210",
    "email": "john@example.com",
    "address": "123 Main St, Chennai",
    "occupation": "Student",
    "joinedDate": "2026-05-01T00:00:00.000Z",
    "monthlyFee": 5000,
    "deposit": 10000,
    "paymentStatus": "pending",
    "feeStatus": [
      { "month": 5, "year": 2026, "isPaid": false }
    ],
    "createdAt": "2026-05-18T14:40:49.936Z",
    "updatedAt": "2026-05-18T14:40:49.936Z"
  }
}
```

**What happens on approval:**
- Tenant record created in `tenants` collection
- Room `occupiedBeds` +1, `vacantBeds` -1
- 30-day payment cycles auto-generated from `joinedDate` to today in `payments` collection
- Temporary record deleted from `temporaryTenants`

**Errors:**

| Status | Response |
|--------|----------|
| `400` | `{ "message": "No vacant beds available in this room" }` |
| `401` | `{ "message": "No token, authorization denied" }` |
| `403` | `{ "message": "Unauthorized" }` |
| `404` | `{ "message": "Temporary tenant not found" }` |
| `404` | `{ "message": "Room not found" }` |
| `500` | `{ "message": "Internal server error" }` |

---

### 5. Delete Temporary Tenant

**DELETE** `/api/temporary-tenant/:tempTenantId`

Owner authorization required. Permanently removes the temporary tenant record without moving it to tenants. Use this to reject a submission.

**Headers:**
```
Authorization: Bearer <owner_jwt_token>
```

**URL Params:**
- `tempTenantId` — the `_id` of the temporary tenant record

**No request body required.**

**Response `200`:**
```json
{
  "message": "Temporary tenant deleted successfully"
}
```

**Errors:**

| Status | Response |
|--------|----------|
| `401` | `{ "message": "No token, authorization denied" }` |
| `403` | `{ "message": "Unauthorized" }` |
| `404` | `{ "message": "Temporary tenant not found" }` |
| `500` | `{ "message": "Internal server error" }` |

---

## API Quick Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/temporary-tenant/generate-token` | None | Generate 15-min form token |
| POST | `/api/temporary-tenant/submit` | Form token | Tenant submits form (floorNumber + roomNumber) |
| GET | `/api/temporary-tenant/hostel/:hostelId` | Owner token | List all pending submissions for a hostel |
| POST | `/api/temporary-tenant/approve/:tempTenantId` | Owner token | Approve and move to tenants |
| DELETE | `/api/temporary-tenant/:tempTenantId` | Owner token | Reject and delete |
