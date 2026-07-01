// Central place where controllers broadcast real-time events.
// Controllers require these functions instead of touching `io` directly, so the
// socket wiring stays in one layer and a broadcast failure can never break the
// REST response (every emit is wrapped in try/catch).

const { getIO } = require('./io');
const { staffRoom, tenantRoom } = require('./rooms');
const logger = require('./logger');

/**
 * A prospective tenant submitted the web join form.
 * Notifies the owner's staff room so the app's bell badge / pending list
 * updates live without a reload.
 *
 * @param {string} hostelId
 * @param {object} tempTenant - the created TemporaryTenant, with floorId & roomId
 *                              populated so the client can render room/floor names.
 */
function emitTenantJoinRequest(hostelId, tempTenant) {
  try {
    const room = staffRoom(hostelId.toString());
    getIO().to(room).emit('tenant:join_request', tempTenant);
    logger.info('emit', { event: 'tenant:join_request', room, id: tempTenant?._id });
  } catch (err) {
    logger.error('emit_failed', { event: 'tenant:join_request', message: err.message });
  }
}

/**
 * A tenant raised a new ticket (from the web dashboard).
 * Notifies the owner's staff room so the ticket list/count updates live.
 *
 * @param {string} hostelId
 * @param {object} ticket - the created Ticket with tenantId (and its roomId) populated.
 */
function emitTicketCreated(hostelId, ticket) {
  try {
    const room = staffRoom(hostelId.toString());
    getIO().to(room).emit('ticket:created', ticket);
    logger.info('emit', { event: 'ticket:created', room, id: ticket?._id });
  } catch (err) {
    logger.error('emit_failed', { event: 'ticket:created', message: err.message });
  }
}

/**
 * A ticket changed (status update by the owner).
 * Notifies the owner's staff room (other owner devices) AND the tenant's private
 * room (their web dashboard) so both sides reflect the change live.
 *
 * @param {string} hostelId
 * @param {string} tenantId
 * @param {object} ticket - the updated Ticket with tenantId (and its roomId) populated.
 */
function emitTicketUpdated(hostelId, tenantId, ticket) {
  try {
    const staff = staffRoom(hostelId.toString());
    const tRoom = tenantRoom(tenantId.toString());
    getIO().to(staff).to(tRoom).emit('ticket:updated', ticket);
    logger.info('emit', { event: 'ticket:updated', staff, tenant: tRoom, id: ticket?._id });
  } catch (err) {
    logger.error('emit_failed', { event: 'ticket:updated', message: err.message });
  }
}

/**
 * A tenant was removed by the owner.
 *  - Notifies the owner's staff room so the tenant list updates live.
 *  - Force-logs-out the removed tenant: emits `auth:force_logout` to their
 *    private room AND disconnects their live sockets. They cannot reconnect
 *    because the socket auth middleware no longer finds the tenant.
 *
 * @param {string} hostelId
 * @param {string} tenantId
 */
function emitTenantRemoved(hostelId, tenantId) {
  try {
    const io = getIO();
    const staff = staffRoom(hostelId.toString());
    const tRoom = tenantRoom(tenantId.toString());

    io.to(staff).emit('tenant:removed', { tenantId: tenantId.toString(), hostelId: hostelId.toString() });
    io.to(tRoom).emit('auth:force_logout', { reason: 'removed' });
    // Close the removed tenant's live connections after the event is queued.
    io.in(tRoom).disconnectSockets(true);

    logger.info('emit', { event: 'tenant:removed', staff, tenant: tRoom, id: tenantId });
  } catch (err) {
    logger.error('emit_failed', { event: 'tenant:removed', message: err.message });
  }
}

module.exports = {
  emitTenantJoinRequest,
  emitTicketCreated,
  emitTicketUpdated,
  emitTenantRemoved,
};
