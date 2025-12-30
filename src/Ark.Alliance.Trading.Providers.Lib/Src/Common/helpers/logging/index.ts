/**
 * @fileoverview Logging Module Barrel Export
 * @module Common/helpers/logging
 *
 * Centralized exports for logging infrastructure.
 */

// Log level enumeration
export {
    LogLevel,
    type LogLevelName,
    logLevelToString,
    parseLogLevel,
    shouldLog,
    getConsoleMethod
} from './LogLevel';

// Configuration
export {
    type LoggingConfig,
    type LogEntry,
    type LogHandler,
    DEFAULT_LOG_LEVEL,
    MAX_LOG_MESSAGE_LENGTH,
    MAX_STACK_TRACE_LENGTH,
    LOG_TIMESTAMP_FORMAT,
    DEFAULT_LOGGING_CONFIG,
    mergeLoggingConfig
} from './LoggingConfig';

// Logging service
export {
    LoggingService,
    globalLogger,
    createLogger
} from './LoggingService';
