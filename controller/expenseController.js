const Expense = require('../models/Expense');
const Hostel = require('../models/Hostel');

const verifyHostelOwner = async (hostelId, ownerId) => {
  return await Hostel.findOne({ _id: hostelId, ownerId });
};

// POST /api/expense/create
const createExpense = async (req, res) => {
  try {
    const { hostelId, expenseReason, amount, date, paymentMethod, note } = req.body;

    if (!hostelId || !expenseReason || !amount || !date) {
      return res.status(400).json({ message: 'hostelId, expenseReason, amount and date are required' });
    }

    const hostel = await verifyHostelOwner(hostelId, req.owner._id);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found or unauthorized' });
    }

    const expenseDate = new Date(date);

    const expense = await Expense.create({
      hostelId,
      expenseReason,
      amount,
      date: expenseDate,
      paymentMethod,
      note,
      month: expenseDate.getMonth() + 1,
      year: expenseDate.getFullYear(),
    });

    res.status(201).json({ message: 'Expense created successfully', expense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/expense/:hostelId
const getExpensesByHostel = async (req, res) => {
  try {
    const hostel = await verifyHostelOwner(req.params.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found or unauthorized' });
    }

    const { month, year } = req.query;
    const filter = { hostelId: req.params.hostelId };
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);

    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.status(200).json({ expenses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/expense/:expenseId
const updateExpense = async (req, res) => {
  try {
    const { expenseReason, amount, date, paymentMethod, note } = req.body;

    const expense = await Expense.findById(req.params.expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const hostel = await verifyHostelOwner(expense.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (expenseReason) expense.expenseReason = expenseReason;
    if (amount !== undefined) expense.amount = amount;
    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (note) expense.note = note;
    if (date) {
      const expenseDate = new Date(date);
      expense.date = expenseDate;
      expense.month = expenseDate.getMonth() + 1;
      expense.year = expenseDate.getFullYear();
    }

    await expense.save();
    res.status(200).json({ message: 'Expense updated successfully', expense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/expense/:expenseId
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const hostel = await verifyHostelOwner(expense.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await expense.deleteOne();
    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createExpense, getExpensesByHostel, updateExpense, deleteExpense };
