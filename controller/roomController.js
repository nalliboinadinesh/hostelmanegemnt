const Room = require('../models/Room');
const Hostel = require('../models/Hostel');
const Floor = require('../models/Floor');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');

const verifyHostelOwner = async (hostelId, ownerId) => {
  return await Hostel.findOne({ _id: hostelId, ownerId });
};

// POST /api/room/create
const createRoom = async (req, res) => {
  try {
    const { hostelId, floorId, roomNumber, roomType, totalBeds } = req.body;

    if (!hostelId || !floorId || !roomNumber || !roomType || totalBeds === undefined) {
      return res.status(400).json({ message: 'hostelId, floorId, roomNumber, roomType and totalBeds are required' });
    }

    const hostel = await verifyHostelOwner(hostelId, req.owner._id);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found or unauthorized' });
    }

    const floor = await Floor.findOne({ _id: floorId, hostelId });
    if (!floor) {
      return res.status(404).json({ message: 'Floor not found in this hostel' });
    }

    const existing = await Room.findOne({ hostelId, floorId, roomNumber });
    if (existing) {
      return res.status(400).json({ message: 'Room number already exists on this floor' });
    }

    const room = await Room.create({
      hostelId,
      floorId,
      roomNumber,
      roomType,
      totalBeds,
      occupiedBeds: 0,
      vacantBeds: totalBeds,
    });

    res.status(201).json({ message: 'Room created successfully', room });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/room/:hostelId
const getRoomsByHostel = async (req, res) => {
  try {
    const hostel = await verifyHostelOwner(req.params.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found or unauthorized' });
    }

    const rooms = await Room.find({ hostelId: req.params.hostelId }).populate('floorId', 'floorNumber');
    res.status(200).json({ rooms });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/room/floor/:floorId
const getRoomsByFloor = async (req, res) => {
  try {
    const floor = await Floor.findById(req.params.floorId);
    if (!floor) {
      return res.status(404).json({ message: 'Floor not found' });
    }

    const hostel = await verifyHostelOwner(floor.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const rooms = await Room.find({ floorId: req.params.floorId });
    res.status(200).json({ rooms });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/room/single/:roomId
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId).populate('floorId', 'floorNumber');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const hostel = await verifyHostelOwner(room.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.status(200).json({ room });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/room/:roomId
const updateRoom = async (req, res) => {
  try {
    const { roomNumber, roomType, totalBeds } = req.body;

    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const hostel = await verifyHostelOwner(room.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (roomNumber) {
      const duplicate = await Room.findOne({ hostelId: room.hostelId, floorId: room.floorId, roomNumber, _id: { $ne: room._id } });
      if (duplicate) {
        return res.status(400).json({ message: 'Room number already exists on this floor' });
      }
      room.roomNumber = roomNumber;
    }

    if (roomType) room.roomType = roomType;

    if (totalBeds !== undefined) {
      room.totalBeds = totalBeds;
      room.vacantBeds = totalBeds - room.occupiedBeds;
    }

    await room.save();
    res.status(200).json({ message: 'Room updated successfully', room });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/room/:roomId
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const hostel = await verifyHostelOwner(room.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Cascade: delete all tenants in this room + their payments
    const tenants = await Tenant.find({ roomId: room._id });
    const tenantIds = tenants.map(t => t._id);
    if (tenantIds.length > 0) {
      await Payment.deleteMany({ tenantId: { $in: tenantIds } });
      await Tenant.deleteMany({ _id: { $in: tenantIds } });
    }

    await room.deleteOne();
    res.status(200).json({ message: 'Room and associated tenants deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createRoom, getRoomsByHostel, getRoomsByFloor, getRoomById, updateRoom, deleteRoom };
