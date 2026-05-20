const express = require('express');
const router = express.Router();
const { createRoom, getRoomsByHostel, getRoomsByFloor, getRoomById, updateRoom, deleteRoom } = require('../controller/roomController');
const { protect } = require('../middleware/authMiddleware');

// router.post('/create', protect, createRoom);
// router.get('/:hostelId', protect, getRoomsByHostel);
// router.get('/floor/:floorId', protect, getRoomsByFloor);
// router.get('/single/:roomId', protect, getRoomById);
// router.put('/:roomId', protect, updateRoom);
// router.delete('/:roomId', protect, deleteRoom);

router.post('/create', protect, createRoom);
router.get('/:hostelId', getRoomsByHostel);
router.get('/floor/:floorId', getRoomsByFloor);
router.get('/single/:roomId', getRoomById);
router.put('/:roomId', protect, updateRoom);
router.delete('/:roomId', protect, deleteRoom);
module.exports = router;
