const express = require('express');
const router = express.Router();
const { createFloor, getFloorsByHostel, getFloorById, updateFloor, deleteFloor, getFloorDetails } = require('../controller/floorController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create', protect, createFloor);
router.get('/:hostelId/details/:floorNumber', protect, getFloorDetails);
router.get('/:hostelId', protect, getFloorsByHostel);
router.get('/single/:floorId', protect, getFloorById);
router.put('/:floorId', protect, updateFloor);
router.delete('/:floorId', protect, deleteFloor);

module.exports = router;
