import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: 'info', // minimum level to log
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }), // Handle error objects
    winston.format.json(), // Use JSON format for structured logging
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      // Handle different input types
      let formattedMessage = message;

      // If message is an object, stringify it
      if (typeof message === 'object' && message !== null) {
        formattedMessage = JSON.stringify(message, null, 2);
      }

       // Format metadata
      const metaString = Object.keys(meta).length > 0 
        ? `\n${JSON.stringify(meta, null, 2)}` 
        : '';
      
       return `[${timestamp}] ${level.toUpperCase()}: ${formattedMessage}${metaString}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: './backend/logs/combined.log' }),
    new winston.transports.File({ filename: './backend/logs/errors.log', level: 'error' })
  ]
});
logger.add(new DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '63d'
}));

export default logger;
