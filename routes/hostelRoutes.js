const express = require('express');
const router = express.Router();
const { createHostel, getHostelsByOwner, getHostelById, deleteHostel, updateHostel } = require('../controller/hostelController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create', protect, createHostel);
router.get('/list', protect, getHostelsByOwner);
router.get('/:hostelId', protect, getHostelById);
router.put('/:hostelId', protect, updateHostel);
router.delete('/:hostelId', protect, deleteHostel);

module.exports = router;
