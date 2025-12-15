const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Create log directory using relative path
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(info => {
    return `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`;
  })
);

// Configure daily rotation transport
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'express-app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',
  maxSize: '20m',
  level: 'info'
});

// Create logger instance
const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'offline-express' },
  transports: [
    fileRotateTransport,
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ]
});

// Add helper methods for common log levels
const log = {
  info: (message) => logger.info(message),
  error: (message, error) => {
    if (error instanceof Error) {
      logger.error(`${message}: ${error.message}\n${error.stack}`);
    } else {
      logger.error(`${message}: ${error}`);
    }
  },
  warn: (message) => logger.warn(message),
  debug: (message) => logger.debug(message),
  http: (message) => logger.http(message)
};

module.exports = log;
