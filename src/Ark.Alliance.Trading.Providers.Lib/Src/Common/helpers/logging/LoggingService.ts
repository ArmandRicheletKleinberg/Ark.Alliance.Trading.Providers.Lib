/**
 * @fileoverview Logging Service Class
 * @module Common/helpers/logging/LoggingService
 *
 * Context-aware logging service with standard log levels.
 * Provides structured logging with service context for traceability.
 *
 * @remarks
 * Features:
 * - Standard log levels (Critical, Error, Warning, Info, Debug, Trace)
 * - Context support (service/class name)
 * - Timestamp formatting
 * - Custom handler integration
 * - Console output with colors
 */

import {
    LogLevel,
    logLevelToString,
    shouldLog,
    getConsoleMethod
} from './LogLevel';

import {
    LoggingConfig,
    LogEntry,
    mergeLoggingConfig,
    MAX_LOG_MESSAGE_LENGTH,
    MAX_STACK_TRACE_LENGTH
} from './LoggingConfig';

// ═══════════════════════════════════════════════════════════════════════════════
// Console Colors (ANSI escape codes)
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
} as const;

const LEVEL_COLORS: Record<LogLevel, string> = {
    [LogLevel.CRITICAL]: `${COLORS.bright}${COLORS.red}`,
    [LogLevel.ERROR]: COLORS.red,
    [LogLevel.WARNING]: COLORS.yellow,
    [LogLevel.INFO]: COLORS.cyan,
    [LogLevel.DEBUG]: COLORS.gray,
    [LogLevel.TRACE]: COLORS.dim
};

// ═══════════════════════════════════════════════════════════════════════════════
// LoggingService Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Context-aware logging service.
 *
 * @example
 * ```typescript
 * // Create logger for a specific service
 * const logger = new LoggingService({ minLevel: LogLevel.DEBUG }, 'OrderService');
 *
 * logger.info('Order placed successfully', { orderId: '123' });
 * logger.error('Failed to place order', error);
 * logger.debug('Processing order', { order });
 * ```
 *
 * @example
 * ```typescript
 * // Create child logger for sub-component
 * const childLogger = logger.createChild('OrderValidator');
 * childLogger.warn('Validation warning'); // Context: OrderService.OrderValidator
 * ```
 */
export class LoggingService {
    /**
     * Service configuration.
     * @private
     */
    private readonly config: Required<Omit<LoggingConfig, 'customHandler'>> & Pick<LoggingConfig, 'customHandler'>;

    /**
     * Context string (service/class name).
     * @private
     */
    private readonly context: string;

    /**
     * Parent logger for child loggers.
     * @private
     */
    private readonly parent?: LoggingService;

    /**
     * Creates a new LoggingService instance.
     *
     * @param config - Logging configuration.
     * @param context - Context string (typically service/class name).
     * @param parent - Parent logger (for child loggers).
     */
    constructor(config?: LoggingConfig, context?: string, parent?: LoggingService) {
        this.config = mergeLoggingConfig(config);
        this.context = context ?? '';
        this.parent = parent;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Log Level Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Logs a critical message (system unusable).
     *
     * @param message - Log message.
     * @param data - Optional additional data or error.
     */
    public critical(message: string, data?: unknown): void {
        this.log(LogLevel.CRITICAL, message, data);
    }

    /**
     * Logs an error message (operation failed).
     *
     * @param message - Log message.
     * @param data - Optional additional data or error.
     */
    public error(message: string, data?: unknown): void {
        this.log(LogLevel.ERROR, message, data);
    }

    /**
     * Logs a warning message (potential problem).
     *
     * @param message - Log message.
     * @param data - Optional additional data or error.
     */
    public warn(message: string, data?: unknown): void {
        this.log(LogLevel.WARNING, message, data);
    }

    /**
     * Logs an info message (normal operation).
     *
     * @param message - Log message.
     * @param data - Optional additional data.
     */
    public info(message: string, data?: unknown): void {
        this.log(LogLevel.INFO, message, data);
    }

    /**
     * Logs a debug message (detailed diagnostic).
     *
     * @param message - Log message.
     * @param data - Optional additional data.
     */
    public debug(message: string, data?: unknown): void {
        this.log(LogLevel.DEBUG, message, data);
    }

    /**
     * Logs a trace message (very detailed diagnostic).
     *
     * @param message - Log message.
     * @param data - Optional additional data.
     */
    public trace(message: string, data?: unknown): void {
        this.log(LogLevel.TRACE, message, data);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Core Logging
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Core log method.
     *
     * @param level - Log level.
     * @param message - Log message.
     * @param data - Optional additional data or error.
     */
    public log(level: LogLevel, message: string, data?: unknown): void {
        if (!shouldLog(level, this.config.minLevel)) {
            return;
        }

        const entry = this.createLogEntry(level, message, data);

        // Output to console
        if (this.config.outputToConsole) {
            this.outputToConsole(entry);
        }

        // Call custom handler
        if (this.config.customHandler) {
            try {
                this.config.customHandler(entry);
            } catch (error) {
                // Avoid infinite loop - just console.error
                console.error('Custom log handler failed:', error);
            }
        }
    }

    /**
     * Creates a structured log entry.
     * @private
     */
    private createLogEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
        const entry: LogEntry = {
            level,
            message: this.truncateMessage(message),
            context: this.getFullContext(),
            timestamp: Date.now()
        };

        if (data instanceof Error) {
            entry.error = data;
            entry.data = {
                name: data.name,
                message: data.message,
                stack: this.truncateStack(data.stack)
            };
        } else if (data !== undefined) {
            entry.data = data;
        }

        return entry;
    }

    /**
     * Outputs log entry to console.
     * @private
     */
    private outputToConsole(entry: LogEntry): void {
        const parts: string[] = [];

        // Timestamp
        if (this.config.includeTimestamp) {
            const timestamp = new Date(entry.timestamp).toISOString();
            parts.push(this.colorize(`[${timestamp}]`, COLORS.gray));
        }

        // Level
        if (this.config.includeLevel) {
            const levelStr = logLevelToString(entry.level).padEnd(8);
            parts.push(this.colorize(levelStr, LEVEL_COLORS[entry.level]));
        }

        // Context
        if (this.config.includeContext && entry.context) {
            parts.push(this.colorize(`[${entry.context}]`, COLORS.blue));
        }

        // Message
        parts.push(entry.message);

        // Output
        const method = getConsoleMethod(entry.level);
        const output = parts.join(' ');

        if (entry.data) {
            console[method](output, entry.data);
        } else {
            console[method](output);
        }
    }

    /**
     * Applies color if enabled.
     * @private
     */
    private colorize(text: string, color: string): string {
        if (!this.config.useColors) {
            return text;
        }
        return `${color}${text}${COLORS.reset}`;
    }

    /**
     * Gets full context including parent contexts.
     * @private
     */
    private getFullContext(): string {
        if (this.parent) {
            const parentContext = this.parent.getFullContext();
            return parentContext ? `${parentContext}.${this.context}` : this.context;
        }
        return this.context;
    }

    /**
     * Truncates message if too long.
     * @private
     */
    private truncateMessage(message: string): string {
        if (message.length <= MAX_LOG_MESSAGE_LENGTH) {
            return message;
        }
        return message.substring(0, MAX_LOG_MESSAGE_LENGTH) + '... [truncated]';
    }

    /**
     * Truncates stack trace if too long.
     * @private
     */
    private truncateStack(stack?: string): string | undefined {
        if (!stack) return undefined;
        if (stack.length <= MAX_STACK_TRACE_LENGTH) {
            return stack;
        }
        return stack.substring(0, MAX_STACK_TRACE_LENGTH) + '... [truncated]';
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Factory Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Creates a child logger with additional context.
     *
     * @param context - Child context string.
     * @returns New LoggingService with combined context.
     *
     * @example
     * ```typescript
     * const serviceLogger = new LoggingService({}, 'OrderService');
     * const validatorLogger = serviceLogger.createChild('Validator');
     * validatorLogger.info('Validating'); // Context: OrderService.Validator
     * ```
     */
    public createChild(context: string): LoggingService {
        return new LoggingService(
            { ...this.config },
            context,
            this
        );
    }

    /**
     * Sets the minimum log level dynamically.
     *
     * @param level - New minimum log level.
     */
    public setMinLevel(level: LogLevel): void {
        (this.config as { minLevel: LogLevel }).minLevel = level;
    }

    /**
     * Gets the current context.
     */
    public getContext(): string {
        return this.getFullContext();
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Global Logger Instance
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Global logger instance for general use.
 * Services should create their own child loggers for context.
 */
export const globalLogger = new LoggingService({}, 'App');

/**
 * Creates a new logger for a specific context.
 *
 * @param context - Context string (service/class name).
 * @param config - Optional configuration overrides.
 * @returns New LoggingService instance.
 */
export function createLogger(context: string, config?: LoggingConfig): LoggingService {
    return new LoggingService(config, context);
}
