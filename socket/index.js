// Socket.IO bootstrap. Called once from server.js with the raw http.Server.
//
// Responsibilities: create the io server, (optionally) attach the Redis adapter
// for horizontal scaling, install JWT auth, and handle connect/disconnect/error.
// No feature events live here — controllers emit via socket/emitters.js.

const { Server } = require('socket.io');
const { setIO } = require('./io');
const socketAuth = require('./auth.middleware');
const { joinRooms } = require('./rooms');
const logger = require('./logger');

async function initSocket(server) {
  const io = new Server(server, {
    cors: {
      // Tighten to your app/dashboard origins before production if desired.
      origin: process.env.SOCKET_CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Optional Redis adapter — enabled only when REDIS_URL is set, so single-instance
  // dev works with zero extra infra while production can scale horizontally.
  if (process.env.REDIS_URL) {
    try {
      const { createAdapter } = require('@socket.io/redis-adapter');
      const { createClient } = require('redis');
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('redis_adapter_enabled');
    } catch (err) {
      // Fall back to the in-memory adapter rather than crashing the server.
      logger.error('redis_adapter_failed', { message: err.message });
    }
  }

  io.use(socketAuth);

  io.on('connection', async (socket) => {
    try {
      const rooms = await joinRooms(socket);
      logger.info('connected', {
        id: socket.id,
        role: socket.user.role,
        rooms: rooms.join(','),
      });
      // Lets the client confirm auth succeeded and know which role it connected as.
      socket.emit('connection:ready', { role: socket.user.role });
    } catch (err) {
      logger.error('join_error', { id: socket.id, message: err.message });
      socket.disconnect(true);
      return;
    }

    socket.on('disconnect', (reason) => {
      logger.info('disconnected', { id: socket.id, role: socket.user?.role, reason });
    });

    socket.on('error', (err) => {
      logger.error('socket_error', { id: socket.id, message: err.message });
    });
  });

  setIO(io);
  logger.info('initialized');
  return io;
}

module.exports = initSocket;
