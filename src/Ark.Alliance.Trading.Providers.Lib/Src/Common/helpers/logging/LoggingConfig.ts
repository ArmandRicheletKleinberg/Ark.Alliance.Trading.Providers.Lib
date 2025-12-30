/**
 * @fileoverview Logging Configuration
 * @module Common/helpers/logging/LoggingConfig
 *
 * Configuration interface and constants for the LoggingService.
 */

import { LogLevel } from './LogLevel';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default log level (INFO in production, DEBUG in development).
 */
export const DEFAULT_LOG_LEVEL = LogLevel.INFO;

/**
 * Maximum log message length before truncation.
 */
export const MAX_LOG_MESSAGE_LENGTH = 10000;

/**
 * Maximum error stack trace length.
 */
export const MAX_STACK_TRACE_LENGTH = 5000;

/**
 * Log entry timestamp format.
 */
export const LOG_TIMESTAMP_FORMAT = 'ISO'; // ISO 8601

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration options for LoggingService.
 */
export interface LoggingConfig {
    /**
     * Minimum log level to output.
     * @default LogLevel.INFO
     */
    minLevel?: LogLevel;

    /**
     * Whether to include timestamps in log output.
     * @default true
     */
    includeTimestamp?: boolean;

    /**
     * Whether to include log level in output.
     * @default true
     */
    includeLevel?: boolean;

    /**
     * Whether to include context (service name) in output.
     * @default true
     */
    includeContext?: boolean;

    /**
     * Whether to output to console.
     * @default true
     */
    outputToConsole?: boolean;

    /**
     * Custom log handler for external logging systems.
     */
    customHandler?: LogHandler;

    /**
     * Whether to format output with colors (console only).
     * @default true
     */
    useColors?: boolean;
}

/**
 * Default logging configuration.
 */
export const DEFAULT_LOGGING_CONFIG: Required<Omit<LoggingConfig, 'customHandler'>> = {
    minLevel: DEFAULT_LOG_LEVEL,
    includeTimestamp: true,
    includeLevel: true,
    includeContext: true,
    outputToConsole: true,
    useColors: true
};

// ═══════════════════════════════════════════════════════════════════════════════
// Log Entry Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Structured log entry.
 */
export interface LogEntry {
    /** Log level. */
    level: LogLevel;
    /** Log message. */
    message: string;
    /** Context (service/class name). */
    context?: string;
    /** Timestamp (Unix ms). */
    timestamp: number;
    /** Additional data. */
    data?: unknown;
    /** Error object if applicable. */
    error?: Error;
    /** Correlation ID for request tracing. */
    correlationId?: string;
}

/**
 * Custom log handler function type.
 */
export type LogHandler = (entry: LogEntry) => void | Promise<void>;

/**
 * Merges user config with defaults.
 *
 * @param config - User configuration.
 * @returns Complete configuration with defaults applied.
 */
export function mergeLoggingConfig(config?: LoggingConfig): Required<Omit<LoggingConfig, 'customHandler'>> & Pick<LoggingConfig, 'customHandler'> {
    return { ...DEFAULT_LOGGING_CONFIG, ...config };
}
