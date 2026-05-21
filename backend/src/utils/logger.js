// A simple logging utility. In a real production environment, you might use Winston or Morgan.
const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const formatMessage = (level, message) => {
  return `[${new Date().toISOString()}] [${level.toUpperCase()}]: ${message}\n`;
};

const logger = {
  info: (message) => {
    console.log(formatMessage('info', message));
    fs.appendFileSync(path.join(logDir, 'app.log'), formatMessage('info', message));
  },
  error: (message, err) => {
    const errorDetails = err ? ` - ${err.stack || err.message}` : '';
    console.error(formatMessage('error', message + errorDetails));
    fs.appendFileSync(path.join(logDir, 'error.log'), formatMessage('error', message + errorDetails));
  },
  warn: (message) => {
    console.warn(formatMessage('warn', message));
    fs.appendFileSync(path.join(logDir, 'app.log'), formatMessage('warn', message));
  }
};

module.exports = logger;
