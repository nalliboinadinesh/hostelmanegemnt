const Floor = require('../models/Floor');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');

// verify hostel belongs to the logged-in owner
const verifyHostelOwner = async (hostelId, ownerId) => {
  return await Hostel.findOne({ _id: hostelId, ownerId });
};

// POST /api/floor/create
const createFloor = async (req, res) => {
  try {
    const { hostelId, floorNumber } = req.body;

    if (!hostelId || floorNumber === undefined) {
      return res.status(400).json({ message: 'hostelId and floorNumber are required' });
    }

    const hostel = await verifyHostelOwner(hostelId, req.owner._id);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found or unauthorized' });
    }

    const existing = await Floor.findOne({ hostelId, floorNumber });
    if (existing) {
      return res.status(400).json({ message: 'Floor number already exists in this hostel' });
    }

    const floor = await Floor.create({ hostelId, floorNumber });
    res.status(201).json({ message: 'Floor created successfully', floor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/floor/:hostelId
const getFloorsByHostel = async (req, res) => {
  try {
    const hostel = await verifyHostelOwner(req.params.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found or unauthorized' });
    }

    const floors = await Floor.find({ hostelId: req.params.hostelId }).sort({ floorNumber: 1 });
    res.status(200).json({ floors });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/floor/single/:floorId
const getFloorById = async (req, res) => {
  try {
    const floor = await Floor.findById(req.params.floorId).populate('hostelId');
    if (!floor) {
      return res.status(404).json({ message: 'Floor not found' });
    }

    const hostel = await verifyHostelOwner(floor.hostelId._id, req.owner._id);
    if (!hostel) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.status(200).json({ floor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/floor/:floorId
const updateFloor = async (req, res) => {
  try {
    const { floorNumber } = req.body;

    const floor = await Floor.findById(req.params.floorId);
    if (!floor) {
      return res.status(404).json({ message: 'Floor not found' });
    }

    const hostel = await verifyHostelOwner(floor.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (floorNumber !== undefined) {
      const duplicate = await Floor.findOne({ hostelId: floor.hostelId, floorNumber, _id: { $ne: floor._id } });
      if (duplicate) {
        return res.status(400).json({ message: 'Floor number already exists in this hostel' });
      }
      floor.floorNumber = floorNumber;
    }

    await floor.save();
    res.status(200).json({ message: 'Floor updated successfully', floor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/floor/:floorId
const deleteFloor = async (req, res) => {
  try {
    const floor = await Floor.findById(req.params.floorId);
    if (!floor) {
      return res.status(404).json({ message: 'Floor not found' });
    }

    const hostel = await verifyHostelOwner(floor.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await floor.deleteOne();
    res.status(200).json({ message: 'Floor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/floor/:hostelId/details/:floorNumber
const getFloorDetails = async (req, res) => {
  try {
    const { hostelId, floorNumber } = req.params;

    const hostel = await verifyHostelOwner(hostelId, req.owner._id);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found or unauthorized' });
    }

    const floor = await Floor.findOne({ hostelId, floorNumber: Number(floorNumber) });
    if (!floor) {
      return res.status(404).json({ message: `Floor ${floorNumber} not found` });
    }

    const rooms = await Room.find({ hostelId, floorId: floor._id });

    const roomsWithTenants = await Promise.all(
      rooms.map(async (room) => {
        const tenants = await Tenant.find({ roomId: room._id }, 'name phoneNumber email occupation paymentStatus joinedDate monthlyFee deposit');
        return {
          room: {
            _id: room._id,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            totalBeds: room.totalBeds,
            occupiedBeds: room.occupiedBeds,
            vacantBeds: room.vacantBeds,
          },
          tenants,
        };
      })
    );

    res.status(200).json({
      floorNumber: floor.floorNumber,
      floorId: floor._id,
      hostelId,
      rooms: roomsWithTenants,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createFloor, getFloorsByHostel, getFloorById, updateFloor, deleteFloor, getFloorDetails };
