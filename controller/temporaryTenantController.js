const jwt = require("jsonwebtoken");
const TemporaryTenant = require("../models/TemporaryTenant");
const Tenant = require("../models/Tenant");
const Hostel = require("../models/Hostel");
const Room = require("../models/Room");
const Payment = require("../models/Payment");

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
    const { floorId, roomId, name, phoneNumber, email, address, parentNumber, aadhaarNumber, occupation, joinedDate, monthlyFee, deposit } = req.body;
    if (!floorId || !roomId || !name || !phoneNumber)
      return res.status(400).json({ message: "floorId, roomId, name and phoneNumber are required" });
    const room = await Room.findOne({ _id: roomId, hostelId, floorId });
    if (!room) return res.status(404).json({ message: "Room not found in this hostel/floor" });
    if (room.vacantBeds <= 0) return res.status(400).json({ message: "No vacant beds available in this room" });
    const now = new Date();
    const temporaryTenant = await TemporaryTenant.create({
      hostelId, floorId, roomId, name, phoneNumber, email, address, parentNumber,
      aadhaarNumber, occupation, joinedDate, monthlyFee, deposit, paymentStatus: "pending",
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
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { generateFormToken, submitTenantForm, deleteTemporaryTenant, approveTenant };
