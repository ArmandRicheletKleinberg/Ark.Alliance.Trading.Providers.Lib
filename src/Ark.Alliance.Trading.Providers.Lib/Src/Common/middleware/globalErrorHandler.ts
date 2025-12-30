/**
 * @fileoverview Global Error Handler
 * @module middleware/globalErrorHandler
 * 
 * Express middleware to handle all uncaught errors
 * Ensures consistent JSON error responses
 */

import { Request, Response, NextFunction } from 'express';
import { LoggingService } from '../helpers/logging/LoggingService';
import { LogLevel } from '../helpers/logging/LogLevel';

// Create logger for this middleware
const logger = new LoggingService({ minLevel: LogLevel.DEBUG }, 'GlobalErrorHandler');

// Error codes enum (previously from ../core/errors)
export enum ErrorCodes {
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    UNAUTHORIZED = 'UNAUTHORIZED',
    NOT_FOUND = 'NOT_FOUND',
    RATE_LIMITED = 'RATE_LIMITED',
    BAD_REQUEST = 'BAD_REQUEST'
}

/**
 * Creates a standardized error response.
 */
export function createErrorResponse(
    code: string,
    message: string,
    details?: Record<string, unknown>
): { success: false; error: { code: string; message: string; details?: Record<string, unknown> } } {
    return {
        success: false,
        error: {
            code,
            message,
            ...(details && { details })
        }
    };
}

/**
 * Global error handling middleware
 */
export function globalErrorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Log the error
    logger.error(`Global error: ${err.message}`, {
        method: req.method,
        path: req.path,
        stack: err.stack
    });

    const statusCode = err.status || 500;
    const errorCode = err.code || ErrorCodes.INTERNAL_ERROR;
    const message = err.message || 'An unexpected error occurred';

    // If headers already sent, delegate to default express handler
    if (res.headersSent) {
        return next(err);
    }

    res.status(statusCode).json(createErrorResponse(
        errorCode,
        message,
        process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined
    ));
}
