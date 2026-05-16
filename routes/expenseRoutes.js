const express = require('express');
const router = express.Router();
const { createExpense, getExpensesByHostel, updateExpense, deleteExpense } = require('../controller/expenseController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create', protect, createExpense);
router.get('/:hostelId', protect, getExpensesByHostel);
router.put('/:expenseId', protect, updateExpense);
router.delete('/:expenseId', protect, deleteExpense);

module.exports = router;
