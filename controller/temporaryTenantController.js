const jwt = require("jsonwebtoken");
const TemporaryTenant = require("../models/TemporaryTenant");
const Tenant = require("../models/Tenant");
const Hostel = require("../models/Hostel");
const Room = require("../models/Room");
const Payment = require("../models/Payment");
const { sendWelcomeEmail } = require("../config/mailer");

const buildDashboardLink = (hostelId, tenantId) => {
  const token = jwt.sign(
    { hostelId: hostelId.toString(), tenantId: tenantId.toString() },
    process.env.JWT_SECRET
  );
  return `https://tenora-eight.vercel.app/api/dashboard?token=${token}`;
};

const generateFormToken = async (req, res) => {
  try {
    const { hostelId } = req.body;
    if (!hostelId) return res.status(400).json({ message: "hostelId is required" });
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) return res.status(404).json({ message: "Hostel not found" });
    const expiresInSeconds = 15 * 60;
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + expiresInSeconds * 1000);
    const token = jwt.sign({ hostelId }, process.env.JWT_SECRET, { expiresIn: expiresInSeconds });
    res.status(200).json({ token, hostelId, issuedAt, expiresAt, expiresInMinutes: 15 });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const submitTenantForm = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ message: "Form token is required" });
    const token = authHeader.split(" ")[1];
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
    catch (err) {
      if (err.name === "TokenExpiredError")
        return res.status(401).json({ message: "Form link has expired. Please request a new one." });
      return res.status(401).json({ message: "Invalid form token" });
    }
    const { hostelId } = decoded;

    const {
      floorNumber, roomNumber,
      name, phoneNumber, email, address, parentNumber,
      aadhaarNumber, occupation, joinedDate, monthlyFee, deposit,
    } = req.body;

    if (!floorNumber || !roomNumber || !name || !phoneNumber)
      return res.status(400).json({ message: "floorNumber, roomNumber, name and phoneNumber are required" });

    // resolve floorNumber → floorId
    const Floor = require("../models/Floor");
    const floor = await Floor.findOne({ hostelId, floorNumber: Number(floorNumber) });
    if (!floor) return res.status(404).json({ message: `Floor ${floorNumber} not found in this hostel` });

    // resolve roomNumber → roomId (scoped to hostel + floor)
    const room = await Room.findOne({ hostelId, floorId: floor._id, roomNumber: String(roomNumber) });
    if (!room) return res.status(404).json({ message: `Room ${roomNumber} not found on floor ${floorNumber}` });

    if (room.vacantBeds <= 0) return res.status(400).json({ message: "No vacant beds available in this room" });

    const now = new Date();
    const temporaryTenant = await TemporaryTenant.create({
      hostelId,
      floorId: floor._id,
      roomId: room._id,
      name, phoneNumber, email, address, parentNumber,
      aadhaarNumber, occupation, joinedDate, monthlyFee, deposit,
      paymentStatus: "pending",
      feeStatus: [{ month: now.getMonth() + 1, year: now.getFullYear(), isPaid: false }],
    });

    res.status(201).json({ message: "Form submitted successfully", temporaryTenant });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const deleteTemporaryTenant = async (req, res) => {
  try {
    const temp = await TemporaryTenant.findById(req.params.tempTenantId);
    if (!temp) return res.status(404).json({ message: "Temporary tenant not found" });
    const hostel = await Hostel.findOne({ _id: temp.hostelId, ownerId: req.owner._id });
    if (!hostel) return res.status(403).json({ message: "Unauthorized" });
    await temp.deleteOne();
    res.status(200).json({ message: "Temporary tenant deleted successfully" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const approveTenant = async (req, res) => {
  try {
    const temp = await TemporaryTenant.findById(req.params.tempTenantId);
    if (!temp) return res.status(404).json({ message: "Temporary tenant not found" });
    const hostel = await Hostel.findOne({ _id: temp.hostelId, ownerId: req.owner._id });
    if (!hostel) return res.status(403).json({ message: "Unauthorized" });
    const room = await Room.findById(temp.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (room.vacantBeds <= 0) return res.status(400).json({ message: "No vacant beds available in this room" });
    const now = new Date();
    const tenant = await Tenant.create({
      hostelId: temp.hostelId, floorId: temp.floorId, roomId: temp.roomId,
      name: temp.name, phoneNumber: temp.phoneNumber, email: temp.email,
      address: temp.address, parentNumber: temp.parentNumber, aadhaarNumber: temp.aadhaarNumber,
      occupation: temp.occupation, joinedDate: temp.joinedDate, monthlyFee: temp.monthlyFee,
      deposit: temp.deposit, paymentStatus: temp.paymentStatus || "pending",
      feeStatus: [{ month: now.getMonth() + 1, year: now.getFullYear(), isPaid: false }],
    });
    room.occupiedBeds += 1;
    room.vacantBeds -= 1;
    await room.save();
    if (tenant.joinedDate && tenant.monthlyFee) {
      const cycles = [];
      let cycleStart = new Date(tenant.joinedDate);
      const today = new Date();
      while (cycleStart <= today) {
        const cycleEnd = new Date(cycleStart);
        cycleEnd.setDate(cycleEnd.getDate() + 30);
        cycles.push({ hostelId: tenant.hostelId, tenantId: tenant._id, amount: tenant.monthlyFee, periodStart: new Date(cycleStart), periodEnd: new Date(cycleEnd), isPaid: false });
        cycleStart = new Date(cycleEnd);
      }
      if (cycles.length > 0) await Payment.insertMany(cycles);
    }
    await temp.deleteOne();
    res.status(201).json({ message: "Tenant approved and moved to tenants successfully", tenant });

    // send welcome email after response is sent
    if (tenant.email) {
      try {
        const dashboardLink = buildDashboardLink(tenant.hostelId, tenant._id);
        await sendWelcomeEmail({
          to:              tenant.email,
          tenantName:      tenant.name,
          hostelName:      hostel.hostelName,
          hostelOwnerName: hostel.ownerName,
          dashboardLink,
        });
        console.log(`[MAIL] Welcome email sent to ${tenant.email}`);
      } catch (mailErr) {
        console.error('[MAIL] Welcome email failed:', mailErr.message);
      }
    }
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getTemporaryTenantsByHostel = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const hostel = await Hostel.findOne({ _id: hostelId, ownerId: req.owner._id });
    if (!hostel) return res.status(403).json({ message: "Unauthorized or hostel not found" });
    const tenants = await TemporaryTenant.find({ hostelId })
      .populate("floorId", "floorNumber floorName")
      .populate("roomId", "roomNumber roomName")
      .sort({ createdAt: -1 });
    res.status(200).json({ hostelId, total: tenants.length, tenants });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { generateFormToken, submitTenantForm, deleteTemporaryTenant, approveTenant, getTemporaryTenantsByHostel };
