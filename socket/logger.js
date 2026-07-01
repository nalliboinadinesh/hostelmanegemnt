// Minimal structured logger for the socket layer.
// Keeps the existing project's console-based logging style but adds a
// consistent, greppable prefix so socket events are easy to filter in prod logs.

const format = (level, event, meta = {}) => {
  const ts = new Date().toISOString();
  const parts = Object.entries(meta)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ');
  return `[${ts}] [socket] [${level}] ${event}${parts ? ' ' + parts : ''}`;
};

module.exports = {
  info: (event, meta) => console.log(format('INFO', event, meta)),
  warn: (event, meta) => console.warn(format('WARN', event, meta)),
  error: (event, meta) => console.error(format('ERROR', event, meta)),
};
