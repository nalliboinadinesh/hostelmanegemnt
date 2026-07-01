// Room naming + join logic.
//
// Three room types per hostel keep owner-only data structurally separate from
// tenants (a tenant can never be placed in a :staff room, so they cannot receive
// owner-scoped events even with a tampered client):
//
//   hostel:<id>:staff   -> owner devices for that hostel (all tickets/tenants/stats)
//   hostel:<id>:public  -> every tenant of that hostel (non-sensitive broadcasts only)
//   tenant:<id>         -> a single tenant's private room (force-logout, their own data)

const Hostel = require('../models/Hostel');

const staffRoom = (hostelId) => `hostel:${hostelId}:staff`;
const publicRoom = (hostelId) => `hostel:${hostelId}:public`;
const tenantRoom = (tenantId) => `tenant:${tenantId}`;

// Places a freshly-connected authenticated socket into the correct rooms based
// on socket.user (set by the auth middleware). Returns the list of room names
// joined, for logging. An owner may own multiple hostels -> joins one staff room each.
async function joinRooms(socket) {
  const user = socket.user;

  if (user.role === 'owner') {
    const hostels = await Hostel.find({ ownerId: user.id }).select('_id').lean();
    const rooms = hostels.map((h) => staffRoom(h._id.toString()));
    rooms.forEach((r) => socket.join(r));
    return rooms;
  }

  if (user.role === 'tenant') {
    const rooms = [publicRoom(user.hostelId), tenantRoom(user.tenantId)];
    rooms.forEach((r) => socket.join(r));
    return rooms;
  }

  return [];
}

module.exports = { staffRoom, publicRoom, tenantRoom, joinRooms };
