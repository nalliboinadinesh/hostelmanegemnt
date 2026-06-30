# Hostel Controller API Reference

This document describes the endpoints handled by `controller/hostelController.js` and exposed in `routes/hostelRoutes.js`.

> Base path for all routes: `/api/hostel`
> All routes require `Authorization: Bearer <token>` in the request headers.

## Common Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Data model: Hostel

Fields accepted by the controller:
- `hostelName` (string, required for create)
- `hostelType` (string, required for create) — expected values: `boys`, `girls`, `mixed`
- `ownerName` (string, required for create)
- `email` (string, optional)
- `upiId` (string, optional)

## Endpoints

### 1. Create Hostel

**POST** `/api/hostel/create`

Creates a new hostel record for the authenticated owner.

Request body:
```json
{
  "hostelName": "Green Valley Hostel",
  "hostelType": "boys",
  "ownerName": "John Doe",
  "email": "john@example.com",
  "upiId": "john@oksbi"
}
```

Success response `201`:
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
    "upiId": "john@oksbi",
    "createdAt": "2026-05-16T00:00:00.000Z",
    "updatedAt": "2026-05-16T00:00:00.000Z"
  }
}
```

Errors:
- `400` missing `hostelName`, `hostelType`, or `ownerName`
- `401` unauthorized token issue
- `500` server error

### 2. List Hostels

**GET** `/api/hostel/list`

Returns all hostels owned by the authenticated owner.

Success response `200`:
```json
{
  "hostels": [
    {
      "_id": "664b2a...",
      "ownerId": "664a1f...",
      "ownerNumber": "9876543210",
      "hostelName": "Green Valley Hostel",
      "hostelType": "boys",
      "ownerName": "John Doe",
      "email": "john@example.com",
      "upiId": "john@oksbi",
      "createdAt": "2026-05-16T00:00:00.000Z",
      "updatedAt": "2026-05-16T00:00:00.000Z"
    }
  ]
}
```

Errors:
- `401` unauthorized token issue
- `500` server error

### 3. Get Hostel by ID

**GET** `/api/hostel/:hostelId`

Returns a single hostel record by `hostelId`, verifying ownership.

Success response `200`:
```json
{
  "hostel": {
    "_id": "664b2a...",
    "ownerId": "664a1f...",
    "ownerNumber": "9876543210",
    "hostelName": "Green Valley Hostel",
    "hostelType": "boys",
    "ownerName": "John Doe",
    "email": "john@example.com",
    "upiId": "john@oksbi",
    "createdAt": "2026-05-16T00:00:00.000Z",
    "updatedAt": "2026-05-16T00:00:00.000Z"
  }
}
```

Errors:
- `404` hostel not found or unauthorized
- `401` unauthorized token issue
- `500` server error

### 4. Update Hostel

**PUT** `/api/hostel/:hostelId`

Updates one or more hostel fields for the authenticated owner's hostel.

Request body (all fields optional):
```json
{
  "hostelName": "Blue Ridge Hostel",
  "hostelType": "girls",
  "ownerName": "Jane Doe",
  "email": "jane@example.com",
  "upiId": "jane@okhdfc"
}
```

Success response `200`:
```json
{
  "message": "Hostel updated successfully",
  "hostel": {
    "_id": "664b2a...",
    "hostelName": "Blue Ridge Hostel",
    "hostelType": "girls",
    "ownerName": "Jane Doe",
    "email": "jane@example.com",
    "upiId": "jane@okhdfc",
    "updatedAt": "2026-05-16T01:00:00.000Z"
  }
}
```

Errors:
- `404` hostel not found or unauthorized
- `401` unauthorized token issue
- `500` server error

### 5. Delete Hostel

**DELETE** `/api/hostel/:hostelId`

Deletes the selected hostel and cascades deletion of related data:
- Floors
- Rooms
- Tenants
- Payments
- Expenses
- Announcements
- Complaints
- Temporary tenants

Success response `200`:
```json
{ "message": "Hostel and all related data deleted successfully" }
```

Errors:
- `404` hostel not found or unauthorized
- `401` unauthorized token issue
- `500` server error

### 6. Owner Analytics

**GET** `/api/hostel/analytics`

Computes analytics across all hostels owned by the authenticated owner:
- today's collection
- monthly collection
- total dues
- bed occupancy
- count of paid and unpaid tenants

Success response `200`:
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
      "hostelId": "...",
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

Errors:
- `401` unauthorized token issue
- `500` server error
