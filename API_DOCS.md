# Hostel Management API Documentation

Base URL: `http://localhost:5000/api`

---

## Auth

### Register / Login
**POST** `/auth/register-login`

Request Body:
```json
{
  "ownerNumber": "9876543210"
}
```

Response — New User `201` (no hostel associated):
```json
{
  "token": "<jwt_token>",
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

Response — Existing User with Hostel `200`:
```json
{
  "token": "<jwt_token>",
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

Response — Existing User without Hostel `200`:
```json
{
  "token": "<jwt_token>",
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

Error `400`:
```json
{ "message": "ownerNumber is required" }
```

Error `500`:
```json
{ "message": "Internal server error message" }
```

---

---

## Hostel

> All hostel routes require `Authorization: Bearer <token>` header.

### Create Hostel
**POST** `/hostel/create`

Headers:
```
Authorization: Bearer <jwt_token>
```

Request Body:
```json
{
  "hostelName": "Green Valley Hostel",
  "hostelType": "boys",
  "ownerName": "John Doe",
  "email": "john@example.com"
}
```

Response `201`:
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

Error `400` — missing fields:
```json
{ "message": "hostelName, hostelType and ownerName are required" }
```

Error `400` — hostel already exists:
```json
{ "message": "Hostel already exists for this owner" }
```

Error `401` — no/invalid token:
```json
{ "message": "No token, authorization denied" }
```

### List Hostels
**GET** `/hostel/list`

Headers:
```
Authorization: Bearer <jwt_token>
```

Response `200`:
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
      "createdAt": "2026-05-16T00:00:00.000Z",
      "updatedAt": "2026-05-16T00:00:00.000Z"
    }
  ]
}
```

---

### Update Hostel
**PUT** `/hostel/:hostelId`

Headers:
```
Authorization: Bearer <jwt_token>
```

Request Body (all fields optional):
```json
{
  "hostelName": "Blue Ridge Hostel",
  "hostelType": "girls",
  "ownerName": "Jane Doe",
  "email": "jane@example.com"
}
```

Response `200`:
```json
{
  "message": "Hostel updated successfully",
  "hostel": {
    "_id": "664b2a...",
    "hostelName": "Blue Ridge Hostel",
    "hostelType": "girls",
    "ownerName": "Jane Doe",
    "email": "jane@example.com",
    "updatedAt": "2026-05-16T01:00:00.000Z"
  }
}
```

Error `404`:
```json
{ "message": "Hostel not found or unauthorized" }
```

---

### Delete Hostel
**DELETE** `/hostel/:hostelId`

Headers:
```
Authorization: Bearer <jwt_token>
```

Response `200`:
```json
{ "message": "Hostel deleted successfully" }
```

Error `404`:
```json
{ "message": "Hostel not found or unauthorized" }
```

---

### Get Hostel by ID
**GET** `/hostel/:hostelId`

Headers:
```
Authorization: Bearer <jwt_token>
```

Response `200`:
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
    "createdAt": "2026-05-16T00:00:00.000Z",
    "updatedAt": "2026-05-16T00:00:00.000Z"
  }
}
```

Error `404`:
```json
{ "message": "Hostel not found or unauthorized" }
```

---

## Floor

> All floor routes require `Authorization: Bearer <token>` header.

### Create Floor
**POST** `/floor/create`

Request Body:
```json
{
  "hostelId": "664b2a...",
  "floorNumber": 1
}
```

Response `201`:
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

Error `400` — duplicate floor number:
```json
{ "message": "Floor number already exists in this hostel" }
```

---

### Get Floors by Hostel
**GET** `/floor/:hostelId`

Response `200`:
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
**GET** `/floor/single/:floorId`

Response `200`:
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

### Update Floor
**PUT** `/floor/:floorId`

Request Body:
```json
{ "floorNumber": 3 }
```

Response `200`:
```json
{ "message": "Floor updated successfully", "floor": { ... } }
```

---

### Delete Floor
**DELETE** `/floor/:floorId`

Response `200`:
```json
{ "message": "Floor deleted successfully" }
```

Error `404`:
```json
{ "message": "Floor not found" }
```

Error `403`:
```json
{ "message": "Unauthorized" }
```

---

## Room

> All room routes require `Authorization: Bearer <token>` header.

### Create Room
**POST** `/room/create`

Request Body:
```json
{
  "hostelId": "664b2a...",
  "floorId": "664c3b...",
  "roomNumber": "101",
  "roomType": "single",
  "totalBeds": 2
}
```

Response `201`:
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

Error `400` — duplicate room:
```json
{ "message": "Room number already exists on this floor" }
```

Error `404` — floor not in hostel:
```json
{ "message": "Floor not found in this hostel" }
```

---

### Get Rooms by Hostel
**GET** `/room/:hostelId`

Response `200`:
```json
{
  "rooms": [
    {
      "_id": "664d4c...",
      "roomNumber": "101",
      "roomType": "single",
      "totalBeds": 2,
      "occupiedBeds": 0,
      "vacantBeds": 2,
      "floorId": { "_id": "664c3b...", "floorNumber": 1 }
    }
  ]
}
```

---

### Get Rooms by Floor
**GET** `/room/floor/:floorId`

Response `200`:
```json
{ "rooms": [ { ... } ] }
```

---

### Get Room by ID
**GET** `/room/single/:roomId`

Response `200`:
```json
{ "room": { ... } }
```

---

### Update Room
**PUT** `/room/:roomId`

Request Body (all fields optional):
```json
{
  "roomNumber": "102",
  "roomType": "double",
  "totalBeds": 3
}
```

Response `200`:
```json
{ "message": "Room updated successfully", "room": { ... } }
```

---

### Delete Room
**DELETE** `/room/:roomId`

Response `200`:
```json
{ "message": "Room deleted successfully" }
```

---

## Tenant

> All tenant routes require `Authorization: Bearer <token>` header.

### Create Tenant
**POST** `/tenant/create`

Request Body:
```json
{
  "hostelId": "664b2a...",
  "floorId": "664c3b...",
  "roomId": "664d4c...",
  "name": "John Doe",
  "phoneNumber": "9876543210",
  "email": "john@example.com",
  "address": "123 Main St",
  "parentNumber": "9876500000",
  "aadhaarNumber": "1234-5678-9012",
  "occupation": "Student",
  "joinedDate": "2026-05-16",
  "monthlyFee": 5000,
  "deposit": 10000,
  "paymentStatus": "pending"
}
```

Response `201`:
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
    "paymentStatus": "pending",
    "createdAt": "2026-05-16T00:00:00.000Z",
    "updatedAt": "2026-05-16T00:00:00.000Z"
  }
}
```

Error `400` — no vacant beds:
```json
{ "message": "No vacant beds available in this room" }
```

Error `404` — room not found:
```json
{ "message": "Room not found in this hostel/floor" }
```

---

### Get Tenants by Hostel
**GET** `/tenant/:hostelId`

Response `200`:
```json
{
  "tenants": [
    {
      "_id": "664e5d...",
      "name": "John Doe",
      "phoneNumber": "9876543210",
      "paymentStatus": "pending",
      "floorId": { "_id": "664c3b...", "floorNumber": 1 },
      "roomId": { "_id": "664d4c...", "roomNumber": "101", "roomType": "single" }
    }
  ]
}
```

---

### Get Tenant by ID
**GET** `/tenant/single/:tenantId`

Response `200`:
```json
{ "tenant": { ... } }
```

---

### Update Tenant
**PUT** `/tenant/:tenantId`

Request Body (all fields optional):
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

Response `200`:
```json
{ "message": "Tenant updated successfully", "tenant": { ... } }
```

---

### Delete Tenant
**DELETE** `/tenant/:tenantId`

Response `200`:
```json
{ "message": "Tenant deleted successfully" }
```

> Note: Deleting a tenant automatically decrements `occupiedBeds` and increments `vacantBeds` in the room.

---

### Get Floor Details with Rooms and Tenants
**GET** `/floor/:hostelId/details/:floorNumber`

Headers:
```
Authorization: Bearer <jwt_token>
```

Example: `GET /api/floor/664b2a.../details/1`

Response `200`:
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
          "joinedDate": "2026-05-16T00:00:00.000Z",
          "monthlyFee": 5000,
          "deposit": 10000
        }
      ]
    }
  ]
}
```

Error `404` — floor not found:
```json
{ "message": "Floor 1 not found" }
```

---

## Expense

> All expense routes require `Authorization: Bearer <token>` header.

### Create Expense
**POST** `/expense/create`

Request Body:
```json
{
  "hostelId": "664b2a...",
  "expenseReason": "Electricity Bill",
  "amount": 3500,
  "date": "2026-05-16",
  "paymentMethod": "cash",
  "note": "May month bill"
}
```

Response `201`:
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
    "note": "May month bill",
    "month": 5,
    "year": 2026,
    "createdAt": "2026-05-16T00:00:00.000Z",
    "updatedAt": "2026-05-16T00:00:00.000Z"
  }
}
```

---

### Get Expenses by Hostel
**GET** `/expense/:hostelId`

Optional query params: `?month=5&year=2026`

Response `200`:
```json
{
  "expenses": [
    {
      "_id": "664f6e...",
      "expenseReason": "Electricity Bill",
      "amount": 3500,
      "date": "2026-05-16T00:00:00.000Z",
      "paymentMethod": "cash",
      "month": 5,
      "year": 2026
    }
  ]
}
```

---

### Update Expense
**PUT** `/expense/:expenseId`

Request Body (all fields optional):
```json
{
  "expenseReason": "Water Bill",
  "amount": 1200,
  "date": "2026-05-18",
  "paymentMethod": "upi",
  "note": "Updated note"
}
```

Response `200`:
```json
{ "message": "Expense updated successfully", "expense": { ... } }
```

---

### Delete Expense
**DELETE** `/expense/:expenseId`

Response `200`:
```json
{ "message": "Expense deleted successfully" }
```

---

## Payment

> All payment routes require `Authorization: Bearer <token>` header.
> Payment cycles are auto-generated every 30 days from the tenant's `joinedDate`.

### Get Payments by Tenant
**GET** `/payment/:tenantId`

Response `200`:
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
      "note": ""
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

---

### Get Payments by Hostel
**GET** `/payment/hostel/:hostelId`

Response `200`:
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
      "cycles": [ { ... } ]
    }
  ]
}
```

---

### Update Payment Status
**PUT** `/payment/:paymentId`

Request Body:
```json
{
  "isPaid": true,
  "paymentMethod": "upi",
  "note": "Paid via GPay"
}
```

Response `200`:
```json
{
  "message": "Payment updated successfully",
  "payment": {
    "_id": "665a1b...",
    "isPaid": true,
    "paymentMethod": "upi",
    "note": "Paid via GPay"
  }
}
```
