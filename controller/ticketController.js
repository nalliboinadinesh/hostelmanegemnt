const Ticket = require('../models/Ticket');
const Hostel = require('../models/Hostel');
const Tenant = require('../models/Tenant');
const { emitTicketUpdated } = require('../socket/emitters');

// GET /api/tickets/hostel/:hostelId  — owner auth
// Returns all tickets for a hostel with tenant name populated
const getTicketsByHostel = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ _id: req.params.hostelId, ownerId: req.owner._id });
    if (!hostel) return res.status(403).json({ message: 'Unauthorized or hostel not found' });

    const tickets = await Ticket.find({ hostelId: req.params.hostelId })
      .populate({
        path: 'tenantId',
        select: 'name phoneNumber roomId',
        populate: {
          path: 'roomId',
          select: 'roomNumber',
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ total: tickets.length, tickets });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/tickets/tenant/:tenantId  — owner auth
// Returns all tickets raised by a specific tenant
const getTicketsByTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    const hostel = await Hostel.findOne({ _id: tenant.hostelId, ownerId: req.owner._id });
    if (!hostel) return res.status(403).json({ message: 'Unauthorized' });

    const tickets = await Ticket.find({ tenantId: req.params.tenantId }).sort({ createdAt: -1 });
    res.status(200).json({ total: tickets.length, tickets });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/tickets/:ticketId/status  — owner auth
// Update ticket status: open | in-progress | resolved
const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['open', 'in-progress', 'resolved'];
    if (!status || !allowed.includes(status))
      return res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}` });

    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const hostel = await Hostel.findOne({ _id: ticket.hostelId, ownerId: req.owner._id });
    if (!hostel) return res.status(403).json({ message: 'Unauthorized' });

    ticket.status = status;
    await ticket.save();

    res.status(200).json({ message: 'Ticket status updated', ticket });

    // Broadcast the change to the owner's other devices and the tenant's dashboard.
    const populated = await Ticket.findById(ticket._id)
      .populate({ path: 'tenantId', select: 'name phoneNumber roomId', populate: { path: 'roomId', select: 'roomNumber' } })
      .lean();
    emitTicketUpdated(ticket.hostelId, ticket.tenantId, populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTicketsByHostel, getTicketsByTenant, updateTicketStatus };
