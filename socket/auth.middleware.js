// Socket.IO connection auth. Runs via io.use() BEFORE the connection completes,
// so unauthenticated sockets are rejected and never join any room.
//
// The project signs two token shapes with the same JWT_SECRET:
//   Owner  -> { id: <ownerId> }                 (mobile app)
//   Tenant -> { hostelId, tenantId }             (web dashboard link)
// We detect the identity by payload shape and load the entity to confirm it
// still exists (e.g. a removed tenant's old token must not connect).

const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner');
const Tenant = require('../models/Tenant');
const logger = require('./logger');

async function socketAuth(socket, next) {
  try {
    // Prefer handshake.auth.token (set by the client); fall back to Authorization header.
    const headerToken = (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');
    const token = socket.handshake.auth?.token || headerToken;

    if (!token) {
      return next(new Error('UNAUTHORIZED: missing token'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return next(new Error('UNAUTHORIZED: invalid or expired token'));
    }

    if (decoded.tenantId && decoded.hostelId) {
      // Tenant identity — confirm the tenant still belongs to that hostel.
      const tenant = await Tenant.findOne({ _id: decoded.tenantId, hostelId: decoded.hostelId })
        .select('_id hostelId')
        .lean();
      if (!tenant) return next(new Error('UNAUTHORIZED: tenant not found'));

      socket.user = {
        role: 'tenant',
        tenantId: tenant._id.toString(),
        hostelId: tenant.hostelId.toString(),
      };
    } else if (decoded.id) {
      // Owner identity.
      const owner = await Owner.findById(decoded.id).select('_id').lean();
      if (!owner) return next(new Error('UNAUTHORIZED: owner not found'));

      socket.user = { role: 'owner', id: owner._id.toString() };
    } else {
      return next(new Error('UNAUTHORIZED: unrecognized token payload'));
    }

    return next();
  } catch (err) {
    logger.error('auth_error', { message: err.message });
    return next(new Error('UNAUTHORIZED: authentication failure'));
  }
}

module.exports = socketAuth;
