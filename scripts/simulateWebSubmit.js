// LOCAL TEST HELPER — simulates the web "join form" submission against the
// locally-running backend, so you can watch the owner app's bell badge update
// live without deploying/repointing the real web dashboard.
//
// Usage (backend must be running on PORT):
//   node scripts/simulateWebSubmit.js            # picks the first hostel with a vacant room
//   node scripts/simulateWebSubmit.js <hostelId> # target a specific hostel
//
// It replicates the real web flow: sign a { hostelId } form token, then POST to
// /api/temporary-tenant/submit — which creates the pending tenant AND emits the
// `tenant:join_request` socket event.

const dotenv = require('dotenv');
dotenv.config();

const jwt = require('jsonwebtoken');
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const Hostel = require('../models/Hostel');
const Floor = require('../models/Floor');
const Room = require('../models/Room');

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 4000}`;

(async () => {
  await connectDB();

  const argHostelId = process.argv[2];

  // Find a room with a vacant bed (optionally within the requested hostel).
  const roomQuery = { vacantBeds: { $gt: 0 } };
  if (argHostelId) roomQuery.hostelId = argHostelId;

  const room = await Room.findOne(roomQuery).lean();
  if (!room) {
    console.error('❌ No room with a vacant bed found. Add a room with free beds first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const [hostel, floor] = await Promise.all([
    Hostel.findById(room.hostelId).lean(),
    Floor.findById(room.floorId).lean(),
  ]);

  const hostelId = room.hostelId.toString();

  // Sign a short-lived form token exactly like /generate-token does.
  const formToken = jwt.sign({ hostelId }, process.env.JWT_SECRET, { expiresIn: 900 });

  // Random phone so BUG-11's duplicate-pending guard doesn't block repeat runs.
  const rand = Math.floor(100000 + Math.random() * 899999);
  const payload = {
    floorNumber: floor.floorNumber,
    roomNumber: room.roomNumber,
    name: `Test Student ${rand}`,
    phoneNumber: `9${rand}0000`.slice(0, 10),
    email: `test${rand}@example.com`,
    address: '123 Test Street',
    occupation: 'Student',
    monthlyFee: 5000,
    deposit: 5000,
  };

  console.log(`→ Submitting to ${BASE_URL} for hostel "${hostel?.hostelName}" (${hostelId})`);
  console.log(`  floor ${payload.floorNumber}, room ${payload.roomNumber}, ${payload.name}`);

  const res = await fetch(`${BASE_URL}/api/temporary-tenant/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${formToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  console.log(`← ${res.status}`, body.message || body);
  if (res.ok) {
    console.log('✅ Submitted. The owner app (connected to this backend) should now show the badge live.');
  }

  await mongoose.disconnect();
  process.exit(res.ok ? 0 : 1);
})().catch(async (err) => {
  console.error('❌ Error:', err.message);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
