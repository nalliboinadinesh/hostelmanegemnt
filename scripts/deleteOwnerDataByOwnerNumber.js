const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const Owner = require('../models/Owner');
const Hostel = require('../models/Hostel');
const Floor = require('../models/Floor');
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Announcement = require('../models/Announcement');
const Complaint = require('../models/Complaint');
const TemporaryTenant = require('../models/TemporaryTenant');
const Ticket = require('../models/Ticket');

const ownerNumber = '9381898031';

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const owner = await Owner.findOne({ ownerNumber });
  const hostelsByOwnerNumber = await Hostel.find({ ownerNumber });
  const hostelsByOwnerId = owner ? await Hostel.find({ ownerId: owner._id }) : [];

  const hostelIds = new Set();
  hostelsByOwnerNumber.forEach(h => hostelIds.add(h._id.toString()));
  hostelsByOwnerId.forEach(h => hostelIds.add(h._id.toString()));

  if (!owner && hostelIds.size === 0) {
    console.log(`No Owner or Hostel found for ownerNumber ${ownerNumber}. Nothing deleted.`);
    await mongoose.disconnect();
    return;
  }

  console.log(`Owner found: ${owner ? owner._id : 'none'}`);
  console.log(`Hostels to delete: ${hostelIds.size}`);

  const ids = Array.from(hostelIds).map(id => mongoose.Types.ObjectId(id));

  const deleteResults = await Promise.all([
    Floor.deleteMany({ hostelId: { $in: ids } }),
    Room.deleteMany({ hostelId: { $in: ids } }),
    Tenant.deleteMany({ hostelId: { $in: ids } }),
    Payment.deleteMany({ hostelId: { $in: ids } }),
    Expense.deleteMany({ hostelId: { $in: ids } }),
    Announcement.deleteMany({ hostelId: { $in: ids } }),
    Complaint.deleteMany({ hostelId: { $in: ids } }),
    TemporaryTenant.deleteMany({ hostelId: { $in: ids } }),
    Ticket.deleteMany({ hostelId: { $in: ids } }),
  ]);

  const [floorRes, roomRes, tenantRes, paymentRes, expenseRes, announcementRes, complaintRes, tempTenantRes, ticketRes] = deleteResults;

  const hostelDeleteRes = await Hostel.deleteMany({ _id: { $in: ids } });

  let ownerDeleteRes;
  if (owner) {
    ownerDeleteRes = await Owner.deleteOne({ _id: owner._id });
  }

  console.log('Deletion summary:');
  console.log(`  floors: ${floorRes.deletedCount}`);
  console.log(`  rooms: ${roomRes.deletedCount}`);
  console.log(`  tenants: ${tenantRes.deletedCount}`);
  console.log(`  payments: ${paymentRes.deletedCount}`);
  console.log(`  expenses: ${expenseRes.deletedCount}`);
  console.log(`  announcements: ${announcementRes.deletedCount}`);
  console.log(`  complaints: ${complaintRes.deletedCount}`);
  console.log(`  temporary tenants: ${tempTenantRes.deletedCount}`);
  console.log(`  tickets: ${ticketRes.deletedCount}`);
  console.log(`  hostels: ${hostelDeleteRes.deletedCount}`);
  if (owner) {
    console.log(`  owner: ${ownerDeleteRes.deletedCount}`);
  }

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
};

run().catch(err => {
  console.error('Error:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});