// Holds the Socket.IO server instance as a singleton.
// Controllers/emitters require getIO() instead of importing the http/server
// module, which avoids circular imports (server.js -> socket -> controllers -> socket).

let io = null;

function setIO(instance) {
  io = instance;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized yet. Call initSocket(server) in server.js first.');
  }
  return io;
}

module.exports = { setIO, getIO };
