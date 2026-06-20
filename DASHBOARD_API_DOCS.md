# Tenant Dashboard API Documentation

**Base URL:** `http://13.60.202.87:4000`  
**Content-Type:** `application/json`  
**Auth:** No Bearer token needed — all dashboard endpoints use a **dashboard JWT** passed in the **request body**.

---

## How the Dashboard Token Works

When a tenant is created or approved, the backend generates a **permanent JWT** containing:
```json
{ "hostelId": "<hostelId>", "tenantId": "<tenantId>" }
```

This token has **no expiry**. It is embedded in the welcome email as:
```
https://tenora-eight.vercel.app/api/dashboard?token=<jwt>
```

The frontend reads `?token=` from the URL, stores it in `localStorage`, and uses it for all API calls below.

---

## Endpoints

### 1. POST `/api/dashboard`

**What it does:**  
Returns the complete tenant dashboard — profile, hostel info, room details, full payment cycle history with summary, and all support tickets raised by the tenant.

**Request Body**

| Field   | Type   | Required | Description                         |
|---------|--------|----------|-------------------------------------|
| `token` | string | Yes      | Dashboard JWT from the welcome link |

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200`**

```json
{
  "tenant": {
    "id": "6a350db7b206aa3747c7737f",
    "name": "Dinesh",
    "phoneNumber": "9441000000",
    "email": "nalliboinadinesh9441@gmail.com",
    "occupation": "Student",
    "joinedDate": "2026-06-18T00:00:00.000Z",
    "paymentStatus": "pending"
  },
  "hostel": {
    "id": "6a2fec55fa6ab467217527f7",
    "hostelName": "Sosa",
    "hostelType": "boys",
    "ownerName": "Abhinav",
    "ownerNumber": "6303615517",
    "email": "rohithranga2006@gmail.com"
  },
  "room": {
    "id": "6a337ec1fa6ab467217527f9",
    "roomNumber": "101",
    "roomType": "NON AC",
    "totalBeds": 4
  },
  "payments": {
    "monthlyRent": 7500,
    "deposit": 3000,
    "totalDues": 7500,
    "paidCycles": 0,
    "unpaidCycles": 1,
    "lastPaidDate": null,
    "cycles": [
      {
        "_id": "6a337fdefa6ab467217527fc",
        "periodStart": "2026-06-18T00:00:00.000Z",
        "periodEnd": "2026-07-18T00:00:00.000Z",
        "amount": 7500,
        "isPaid": false,
        "paymentDate": null,
        "paymentMethod": null
      }
    ]
  },
  "tickets": []
}
```

**Response Fields**

**`tenant` object**

| Field           | Type   | Description                              |
|-----------------|--------|------------------------------------------|
| `id`            | string | Tenant's MongoDB ObjectId                |
| `name`          | string | Full name                                |
| `phoneNumber`   | string | Mobile number                            |
| `email`         | string | Email address                            |
| `occupation`    | string | Occupation                               |
| `joinedDate`    | string | ISO date when tenant joined              |
| `paymentStatus` | string | `"paid"` or `"pending"`                  |

**`hostel` object**

| Field        | Type   | Description                    |
|--------------|--------|--------------------------------|
| `id`         | string | Hostel ObjectId                |
| `hostelName` | string | Name of the hostel             |
| `hostelType` | string | `"boys"`, `"girls"`, `"mixed"` |
| `ownerName`  | string | Owner's name                   |
| `ownerNumber`| string | Owner's phone number           |
| `email`      | string | Hostel contact email           |

**`room` object**

| Field        | Type   | Description                   |
|--------------|--------|-------------------------------|
| `id`         | string | Room ObjectId                 |
| `roomNumber` | string | Room identifier e.g. `"101"` |
| `roomType`   | string | e.g. `"NON AC"`, `"AC"`      |
| `totalBeds`  | number | Total beds in this room       |

**`payments` object**

| Field          | Type    | Description                                      |
|----------------|---------|--------------------------------------------------|
| `monthlyRent`  | number  | Monthly rent amount in ₹                         |
| `deposit`      | number  | Security deposit amount in ₹                     |
| `totalDues`    | number  | Total unpaid amount across all cycles             |
| `paidCycles`   | number  | Count of paid 30-day cycles                      |
| `unpaidCycles` | number  | Count of unpaid 30-day cycles                    |
| `lastPaidDate` | string  | ISO date of last successful payment, or `null`   |
| `cycles`       | array   | All 30-day payment cycles (see below)            |

**`cycles[]` item**

| Field           | Type    | Description                                       |
|-----------------|---------|---------------------------------------------------|
| `_id`           | string  | Payment record ObjectId                           |
| `periodStart`   | string  | Start date of this 30-day cycle                   |
| `periodEnd`     | string  | End date of this 30-day cycle                     |
| `amount`        | number  | Rent amount for this cycle in ₹                   |
| `isPaid`        | boolean | `true` if paid, `false` if pending                |
| `paymentDate`   | string  | ISO date of payment, or `null` if not paid        |
| `paymentMethod` | string  | `"Cash"`, `"UPI"`, `"Bank Transfer"`, or `null`   |

**`tickets[]` item**

| Field         | Type   | Description                                          |
|---------------|--------|------------------------------------------------------|
| `_id`         | string | Ticket ObjectId                                      |
| `title`       | string | Short title of the issue                             |
| `category`    | string | e.g. `"Maintenance"`, `"Cleanliness"`, `"Other"`    |
| `description` | string | Full description of the issue                        |
| `imageLink`   | string | URL to an attached image, or `null`                  |
| `status`      | string | `"open"`, `"in-progress"`, or `"resolved"`           |
| `createdAt`   | string | ISO timestamp when ticket was raised                 |
| `updatedAt`   | string | ISO timestamp of last status update                  |

**Error Responses**

| Status | Body                                      |
|--------|-------------------------------------------|
| `400`  | `{ "message": "Token is required" }`      |
| `401`  | `{ "message": "Invalid token" }`          |
| `401`  | `{ "message": "Invalid token payload" }`  |
| `404`  | `{ "message": "Tenant not found" }`       |
| `404`  | `{ "message": "Hostel not found" }`       |
| `500`  | `{ "message": "<error details>" }`        |

---

### 2. POST `/api/dashboard/ticket`

**What it does:**  
Allows a tenant to raise a new support/complaint ticket from their dashboard. The ticket is created with `status: "open"` and immediately visible to the hostel owner.

**Request Body**

| Field         | Type   | Required | Description                                       |
|---------------|--------|----------|---------------------------------------------------|
| `token`       | string | Yes      | Dashboard JWT                                     |
| `title`       | string | Yes      | Short title of the issue                          |
| `category`    | string | Yes      | Type of issue (see allowed values below)          |
| `description` | string | Yes      | Detailed description of the problem               |
| `imageLink`   | string | No       | URL to an uploaded image (optional)               |

**Allowed `category` values:**  
`"Maintenance"`, `"Cleanliness"`, `"Electrical"`, `"Water"`, `"Internet"`, `"Furniture"`, `"Food"`, `"Bathroom"`, `"Other"`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "title": "AC not working",
  "category": "Maintenance",
  "description": "The AC in my room stopped cooling since last night. Please send a technician.",
  "imageLink": "https://example.com/images/ac-issue.jpg"
}
```

**Response `201`**

```json
{
  "message": "Ticket raised successfully",
  "ticket": {
    "_id": "6a2fbc006f18f89d2c0d2560",
    "hostelId": "6a2fec55fa6ab467217527f7",
    "tenantId": "6a350db7b206aa3747c7737f",
    "title": "AC not working",
    "category": "Maintenance",
    "description": "The AC in my room stopped cooling since last night. Please send a technician.",
    "imageLink": "https://example.com/images/ac-issue.jpg",
    "status": "open",
    "createdAt": "2026-06-19T10:30:00.000Z",
    "updatedAt": "2026-06-19T10:30:00.000Z"
  }
}
```

**Error Responses**

| Status | Body                                                      |
|--------|-----------------------------------------------------------|
| `400`  | `{ "message": "title, category and description are required" }` |
| `400`  | `{ "message": "Token is required" }`                      |
| `401`  | `{ "message": "Invalid token" }`                          |
| `404`  | `{ "message": "Tenant not found" }`                       |
| `500`  | `{ "message": "<error details>" }`                        |

---

### 3. POST `/api/dashboard/tickets`

**What it does:**  
Returns all tickets raised by the tenant identified by the dashboard token, sorted newest first.

**Request Body**

| Field   | Type   | Required | Description      |
|---------|--------|----------|------------------|
| `token` | string | Yes      | Dashboard JWT    |

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
      "hostelId": "6a2fec55fa6ab467217527f7",
      "tenantId": "6a350db7b206aa3747c7737f",
      "title": "AC not working",
      "category": "Maintenance",
      "description": "The AC in my room stopped cooling since last night.",
      "imageLink": "https://example.com/images/ac-issue.jpg",
      "status": "in-progress",
      "createdAt": "2026-06-19T10:30:00.000Z",
      "updatedAt": "2026-06-19T11:00:00.000Z"
    },
    {
      "_id": "6a2fbc106f18f89d2c0d2561",
      "hostelId": "6a2fec55fa6ab467217527f7",
      "tenantId": "6a350db7b206aa3747c7737f",
      "title": "Leaking tap",
      "category": "Water",
      "description": "Bathroom tap leaking continuously.",
      "imageLink": null,
      "status": "resolved",
      "createdAt": "2026-06-10T08:00:00.000Z",
      "updatedAt": "2026-06-12T14:00:00.000Z"
    }
  ]
}
```

**Error Responses**

| Status | Body                                     |
|--------|------------------------------------------|
| `400`  | `{ "message": "Token is required" }`     |
| `401`  | `{ "message": "Invalid token" }`         |
| `500`  | `{ "message": "<error details>" }`       |

---

## Ticket Status Flow

```
open  →  in-progress  →  resolved
```

- Tenant creates ticket → status is always `"open"`
- Owner updates to `"in-progress"` when working on it
- Owner marks `"resolved"` when done
- Tenant can see status updates in real time via `POST /api/dashboard` or `POST /api/dashboard/tickets`

---

## Frontend Integration Notes

### Reading token from URL
When tenant clicks the dashboard link from email:
```
https://tenora-eight.vercel.app/api/dashboard?token=<jwt>
```
The frontend reads the `?token=` query param, saves to `localStorage`, then calls `POST /api/dashboard` with it.

### Token storage
```js
// On page load — read from URL
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
if (token) localStorage.setItem('tenant_token', token);

// On every API call — read from storage
const token = localStorage.getItem('tenant_token');
```

### Dashboard data structure (TypeScript types)
```ts
interface DashboardResponse {
  tenant: {
    id: string;
    name: string;
    phoneNumber: string;
    email: string;
    occupation: string;
    joinedDate: string;
    paymentStatus: 'paid' | 'pending';
  };
  hostel: {
    id: string;
    hostelName: string;
    hostelType: string;
    ownerName: string;
    ownerNumber: string;
    email: string;
  };
  room: {
    id: string;
    roomNumber: string;
    roomType: string;
    totalBeds: number;
  };
  payments: {
    monthlyRent: number;
    deposit: number;
    totalDues: number;
    paidCycles: number;
    unpaidCycles: number;
    lastPaidDate: string | null;
    cycles: Array<{
      _id: string;
      periodStart: string;
      periodEnd: string;
      amount: number;
      isPaid: boolean;
      paymentDate: string | null;
      paymentMethod: string | null;
    }>;
  };
  tickets: Array<{
    _id: string;
    title: string;
    category: string;
    description: string;
    imageLink: string | null;
    status: 'open' | 'in-progress' | 'resolved';
    createdAt: string;
    updatedAt: string;
  }>;
}
```

---

## Live Test

Test the dashboard API with satish's token:

```bash
curl -X POST http://13.60.202.87:4000/api/dashboard \
  -H "Content-Type: application/json" \
  -d '{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJob3N0ZWxJZCI6IjZhMmZlYzU1ZmE2YWI0NjcyMTc1MjdmNyIsInRlbmFudElkIjoiNmEzMzdmZGVmYTZhYjQ2NzIxNzUyN2ZiIiwiaWF0IjoxNzgxNzU5OTY3fQ.gZ3glhEDWy_hAcArWWVJXYCffzDkXanQwTQ-5s8z0VU"}'
```
