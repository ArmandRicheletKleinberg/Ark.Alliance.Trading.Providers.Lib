import winston from 'winston';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_FORMAT = process.env.LOG_FORMAT || (NODE_ENV === 'production' ? 'json' : 'pretty');
const SERVICE_NAME = process.env.SERVICE_NAME || 'ark-position-service';

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Structured log format for log aggregators (ELK, Splunk, CloudWatch, etc.)
 * 
 * Output format:
 * {
 *   "@timestamp": "2024-12-10T23:52:53.123Z",
 *   "level": "info",
 *   "message": "Request completed",
 *   "service": "ark-position-service",
 *   "environment": "production",
 *   "hostname": "server-01",
 *   "context": { ... },
 *   "correlationId": "abc-123"
 * }
 */
const structuredFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    winston.format((info) => {
        // Add standard metadata for log aggregators
        info.service = SERVICE_NAME;
        info.environment = NODE_ENV;
        info.hostname = os.hostname();

        // Rename 'timestamp' to '@timestamp' for Elasticsearch compatibility
        info['@timestamp'] = info.timestamp;
        delete info.timestamp;

        return info;
    })(),
    winston.format.json()
);

/**
 * Pretty format for development console output
 */
const prettyFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp, correlationId, source, ...metadata }) => {
        let msg = `${timestamp} [${level}]`;
        if (source) msg += ` [${source}]`;
        if (correlationId && typeof correlationId === 'string') msg += ` [${correlationId.slice(0, 8)}]`;
        msg += `: ${message}`;

        // Filter out internal fields from metadata display
        const displayMeta = { ...metadata };
        delete displayMeta.service;
        delete displayMeta.environment;
        delete displayMeta.hostname;
        delete displayMeta['@timestamp'];

        if (Object.keys(displayMeta).length > 0) {
            msg += ` ${JSON.stringify(displayMeta)}`;
        }
        return msg;
    })
);

// Create logger instance
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    // Use JSON format for file output always
    format: structuredFormat,
    defaultMeta: { service: SERVICE_NAME },
    transports: [
        // Console output - use pretty format in dev, JSON in prod
        new winston.transports.Console({
            format: LOG_FORMAT === 'json' ? structuredFormat : prettyFormat
        }),

        // File output - All logs (JSON)
        new winston.transports.File({
            filename: process.env.LOG_FILE || path.join(logsDir, 'app.log'),
            maxsize: parseInt(process.env.LOG_MAX_SIZE || '10485760', 10), // 10MB
            maxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10),
            tailable: true,
            format: structuredFormat
        }),

        // File output - Errors only (JSON)
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10485760,
            maxFiles: 7,
            tailable: true,
            format: structuredFormat
        }),

        // File output - DB errors fallback
        new winston.transports.File({
            filename: path.join(logsDir, 'db_errors.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 3,
            tailable: true,
            format: structuredFormat
        })
    ],

    // Handle exceptions
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log'),
            format: structuredFormat
        })
    ],

    // Handle rejections
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log'),
            format: structuredFormat
        })
    ]
});

/**
 * Create a child logger with correlation ID for request tracing
 */
export function createRequestLogger(correlationId: string) {
    return logger.child({ correlationId });
}

// Stream for Morgan (HTTP request logging)
export const logStream = {
    write: (message: string) => {
        logger.info(message.trim());
    }
};

export default logger;

