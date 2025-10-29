// src/utils/logger.js
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Helper function to write to file
const writeToFile = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} [${level.toUpperCase()}]: ${message} ${args.length > 0 ? JSON.stringify(args) : ''}\n`;
  
  // Write to all.log
  fs.appendFileSync(path.join(logsDir, 'all.log'), logMessage);
  
  // Write errors to error.log
  if (level === 'error') {
    fs.appendFileSync(path.join(logsDir, 'error.log'), logMessage);
  }
};

const logger = {
  info: (message, ...args) => {
    console.log(`[INFO] ${message}`, ...args);
    writeToFile('info', message, ...args);
  },
  
  error: (message, ...args) => {
    console.error(`[ERROR] ${message}`, ...args);
    writeToFile('error', message, ...args);
  },
  
  warn: (message, ...args) => {
    console.warn(`[WARN] ${message}`, ...args);
    writeToFile('warn', message, ...args);
  },
  
  debug: (message, ...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, ...args);
      writeToFile('debug', message, ...args);
    }
  },
  
  http: (message, ...args) => {
    console.log(`[HTTP] ${message}`, ...args);
    writeToFile('http', message, ...args);
  }
};

module.exports = logger;