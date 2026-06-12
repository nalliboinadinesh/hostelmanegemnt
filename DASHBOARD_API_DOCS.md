# Dashboard & Ticket API Documentation

**Base URL:** `http://localhost:4000` (local) / `https://hostelmanegemnt.onrender.com` (production)

---

## Overview

Two sets of APIs:

1. **Dashboard APIs** — tenant-facing, authenticated via a JWT passed as `?token=` in the URL query param. No owner login needed.
2. **Ticket APIs** — owner-facing, authenticated via `Authorization: Bearer <owner-token>` header.

---

## How the Dashboard Token Works

When a tenant is created, a dashboard link is generated and sent (or logged):

```
http://localhost:3000?token=<jwt>&hostelId=<id>&tenantId=<id>
```

The JWT is signed with `JWT_SECRET` and contains:
```json
{ "hostelId": "...", "tenantId": "..." }
```

The frontend reads `token` from the URL and passes it to all dashboard endpoints as `?token=<jwt>`.

---

## Dashboard APIs

### 1. Get Tenant Dashboard

**POST** `/api/dashboard`

Returns all tenant data in one call — tenant info, hostel, room, payments, and tickets.

**Request Body:**
```json
{ "token": "<dashboard-jwt>" }
```

**Response `200`:**
```json
{
  "tenant": {
    "id": "6a0ff577affb63d57c0e3257",
    "name": "Dinesh",
    "phoneNumber": "9876543210",
    "email": "nalliboinadinesh9441@gmail.com",
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
  },
  "tickets": [
    {
      "_id": "6a102d037a667377a110c4b6",
      "title": "Water leakage",
      "category": "Maintenance",
      "description": "There is water leaking from the bathroom ceiling since yesterday.",
      "imageLink": null,
      "status": "in-progress",
      "createdAt": "2026-05-22T10:16:35.123Z",
      "updatedAt": "2026-05-22T10:20:00.000Z"
    }
  ]
}
```

---

### 2. Raise a Ticket

**POST** `/api/dashboard/ticket`

**Request Body:**
```json
{
  "token": "<dashboard-jwt>",
  "title": "Water leakage",
  "category": "Maintenance",
  "description": "There is water leaking from the bathroom ceiling since yesterday.",
  "imageLink": "https://example.com/photo.jpg"
}
```

**Required:** `token`, `title`, `category`, `description`  
**Optional:** `imageLink` (defaults to `null`)

**Response `201`:**
```json
{
  "message": "Ticket raised successfully",
  "ticket": {
    "_id": "6a102d037a667377a110c4b6",
    "hostelId": "6a0e99d89417ce2f00af00a1",
    "tenantId": "6a0ff577affb63d57c0e3257",
    "title": "Water leakage",
    "category": "Maintenance",
    "description": "There is water leaking from the bathroom ceiling since yesterday.",
    "imageLink": null,
    "status": "open",
    "createdAt": "2026-05-22T10:16:35.123Z",
    "updatedAt": "2026-05-22T10:16:35.123Z"
  }
}
```

---

### 3. Get My Tickets

**POST** `/api/dashboard/tickets`

Returns all tickets raised by the authenticated tenant, sorted newest first.

**Request Body:**
```json
{ "token": "<dashboard-jwt>" }
```

**Response `200`:**
```json
{
  "total": 1,
  "tickets": [
    {
      "_id": "6a102d037a667377a110c4b6",
      "hostelId": "6a0e99d89417ce2f00af00a1",
      "tenantId": "6a0ff577affb63d57c0e3257",
      "title": "Water leakage",
      "category": "Maintenance",
      "description": "There is water leaking from the bathroom ceiling since yesterday.",
      "imageLink": null,
      "status": "in-progress",
      "createdAt": "2026-05-22T10:16:35.123Z",
      "updatedAt": "2026-05-22T10:20:00.000Z"
    }
  ]
}
```

---

## Dashboard API Errors

| Status | Message | Reason |
|--------|---------|--------|
| `400` | `Token is required` | No `?token=` in query |
| `400` | `title, category and description are required` | Missing required fields on ticket create |
| `401` | `Invalid token` | Token is malformed or tampered |
| `401` | `Dashboard link has expired` | Token has an expiry and it passed |
| `401` | `Invalid token payload` | Token missing hostelId or tenantId |
| `404` | `Tenant not found` | Tenant deleted or wrong token |
| `404` | `Hostel not found` | Hostel deleted |

---

## Ticket APIs (Owner)

> All routes require `Authorization: Bearer <owner-token>` header.

---

### 4. Get All Tickets by Hostel

**GET** `/api/tickets/hostel/:hostelId`

Returns all tickets for a hostel with tenant name and phone populated, sorted newest first.

**Response `200`:**
```json
{
  "total": 2,
  "tickets": [
    {
      "_id": "6a102d037a667377a110c4b6",
      "hostelId": "6a0e99d89417ce2f00af00a1",
      "tenantId": {
        "_id": "6a0ff577affb63d57c0e3257",
        "name": "Dinesh",
        "phoneNumber": "9876543210",
        "roomId": "6a0e99d89417ce2f00af00a3"
      },
      "title": "Water leakage",
      "category": "Maintenance",
      "description": "There is water leaking from the bathroom ceiling.",
      "imageLink": null,
      "status": "in-progress",
      "createdAt": "2026-05-22T10:16:35.123Z",
      "updatedAt": "2026-05-22T10:20:00.000Z"
    }
  ]
}
```

---

### 5. Get Tickets by Tenant

**GET** `/api/tickets/tenant/:tenantId`

Returns all tickets raised by a specific tenant.

**Response `200`:**
```json
{
  "total": 1,
  "tickets": [
    {
      "_id": "6a102d037a667377a110c4b6",
      "title": "Water leakage",
      "category": "Maintenance",
      "description": "There is water leaking from the bathroom ceiling.",
      "imageLink": null,
      "status": "in-progress",
      "createdAt": "2026-05-22T10:16:35.123Z"
    }
  ]
}
```

---

### 6. Update Ticket Status

**PUT** `/api/tickets/:ticketId/status`

**Request Body:**
```json
{ "status": "resolved" }
```

**Allowed values:** `open` | `in-progress` | `resolved`

**Response `200`:**
```json
{
  "message": "Ticket status updated",
  "ticket": {
    "_id": "6a102d037a667377a110c4b6",
    "hostelId": "6a0e99d89417ce2f00af00a1",
    "tenantId": "6a0ff577affb63d57c0e3257",
    "title": "Water leakage",
    "category": "Maintenance",
    "description": "There is water leaking from the bathroom ceiling.",
    "imageLink": null,
    "status": "resolved",
    "createdAt": "2026-05-22T10:16:35.123Z",
    "updatedAt": "2026-05-22T10:25:00.000Z"
  }
}
```

**Errors:**
```json
{ "message": "status must be one of: open, in-progress, resolved" }  // 400
{ "message": "Ticket not found" }                                     // 404
{ "message": "Unauthorized" }                                         // 403
```

---

## Ticket Fields Reference

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Ticket ID |
| `hostelId` | ObjectId | Hostel the ticket belongs to |
| `tenantId` | ObjectId | Tenant who raised the ticket |
| `title` | String | Short title of the issue |
| `category` | String | Category (e.g. Maintenance, Cleanliness, Electrical) |
| `description` | String | Detailed description of the issue |
| `imageLink` | String | URL to an image (optional, default `null`) |
| `status` | String | `open` / `in-progress` / `resolved` (default: `open`) |
| `createdAt` | Date | Auto-generated |
| `updatedAt` | Date | Auto-updated on status change |

---

## Quick Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/dashboard` | token in body | Full tenant dashboard (includes tickets) |
| POST | `/api/dashboard/ticket` | token in body | Raise a new ticket |
| POST | `/api/dashboard/tickets` | token in body | View my tickets |
| GET | `/api/tickets/hostel/:hostelId` | Owner token | All tickets for a hostel |
| GET | `/api/tickets/tenant/:tenantId` | Owner token | All tickets by a tenant |
| PUT | `/api/tickets/:ticketId/status` | Owner token | Update ticket status |
