/**
 * @fileoverview Log Level Enumeration
 * @module Common/helpers/logging/LogLevel
 *
 * Defines standard logging levels following industry conventions.
 * Based on RFC 5424 (Syslog) severity levels.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc5424
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Log Level Enumeration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standard logging levels in order of severity (highest to lowest).
 *
 * @enum {number}
 *
 * @example
 * ```typescript
 * if (currentLevel <= LogLevel.WARNING) {
 *     // Log warning and above
 * }
 * ```
 */
export enum LogLevel {
    /**
     * Critical error - system is unusable.
     * Requires immediate attention.
     */
    CRITICAL = 0,

    /**
     * Error condition - operation failed.
     * Service continues but functionality is impaired.
     */
    ERROR = 1,

    /**
     * Warning condition - potential problem.
     * Service continues normally but situation should be monitored.
     */
    WARNING = 2,

    /**
     * Informational message - normal operation.
     * Significant events in the normal flow.
     */
    INFO = 3,

    /**
     * Debug information - detailed diagnostic.
     * Used during development and troubleshooting.
     */
    DEBUG = 4,

    /**
     * Trace information - very detailed diagnostic.
     * Most verbose level, used for step-by-step tracing.
     */
    TRACE = 5
}

// ═══════════════════════════════════════════════════════════════════════════════
// Type Aliases
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type alias for log level string names.
 */
export type LogLevelName = 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG' | 'TRACE';

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Converts log level to string name.
 *
 * @param level - Log level enum value.
 * @returns Log level name string.
 */
export function logLevelToString(level: LogLevel): LogLevelName {
    const names: Record<LogLevel, LogLevelName> = {
        [LogLevel.CRITICAL]: 'CRITICAL',
        [LogLevel.ERROR]: 'ERROR',
        [LogLevel.WARNING]: 'WARNING',
        [LogLevel.INFO]: 'INFO',
        [LogLevel.DEBUG]: 'DEBUG',
        [LogLevel.TRACE]: 'TRACE'
    };
    return names[level] ?? 'INFO';
}

/**
 * Parses string to log level.
 *
 * @param name - Log level name string.
 * @returns Log level enum value.
 */
export function parseLogLevel(name: string): LogLevel {
    const levels: Record<string, LogLevel> = {
        'CRITICAL': LogLevel.CRITICAL,
        'ERROR': LogLevel.ERROR,
        'WARNING': LogLevel.WARNING,
        'WARN': LogLevel.WARNING,
        'INFO': LogLevel.INFO,
        'DEBUG': LogLevel.DEBUG,
        'TRACE': LogLevel.TRACE
    };
    return levels[name.toUpperCase()] ?? LogLevel.INFO;
}

/**
 * Checks if a level should be logged given the configured minimum level.
 *
 * @param level - Level to check.
 * @param minLevel - Minimum configured level.
 * @returns True if level should be logged.
 */
export function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
    return level <= minLevel;
}

/**
 * Gets appropriate console method for log level.
 *
 * @param level - Log level.
 * @returns Console method name.
 */
export function getConsoleMethod(level: LogLevel): 'error' | 'warn' | 'info' | 'debug' | 'log' {
    switch (level) {
        case LogLevel.CRITICAL:
        case LogLevel.ERROR:
            return 'error';
        case LogLevel.WARNING:
            return 'warn';
        case LogLevel.INFO:
            return 'info';
        case LogLevel.DEBUG:
        case LogLevel.TRACE:
            return 'debug';
        default:
            return 'log';
    }
}
