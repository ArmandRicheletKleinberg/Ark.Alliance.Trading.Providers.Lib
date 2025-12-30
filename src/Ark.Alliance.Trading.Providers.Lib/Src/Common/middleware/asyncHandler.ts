/**
 * @fileoverview Async Handler Wrapper
 * @module middleware/asyncHandler
 * 
 * Wraps async route handlers to properly catch and forward errors
 * Standardizes error handling across all controllers
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { LoggingService } from '../helpers/logging/LoggingService';
import { LogLevel } from '../helpers/logging/LogLevel';

// Create logger for this middleware
const logger = new LoggingService({ minLevel: LogLevel.DEBUG }, 'AsyncHandler');

/**
 * Wraps an async request handler to catch any errors and pass them to Express error middleware
 * @param fn - Async request handler function
 * @returns Wrapped request handler that catches errors
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch((error: Error) => {
            // Extract clean error message (remove verbose object dumps if present)
            let cleanMessage = error.message || 'Unknown error';

            // If message contains stringified object like "Unhandled error. ({ message:...", extract just the inner message
            const innerMessageMatch = cleanMessage.match(/message:\s*['"]([^'"]+)['"]/);
            if (innerMessageMatch) {
                cleanMessage = innerMessageMatch[1];
            }
            // Also handle format like "[-1111] Precision..." directly
            else if (cleanMessage.includes('. ({')) {
                cleanMessage = cleanMessage.split('. ({')[0];
            }

            // Log the error with clean message
            logger.error(`Async handler error: ${cleanMessage}`, {
                method: req.method,
                path: req.path,
                params: req.params,
                query: req.query,
                errorDetails: (error as any).details
            });

            // Forward to error middleware
            next(error);
        });
    };
}

/**
 * Wraps an async controller method and returns standardized error response
 * @param fn - Async controller method
 * @param errorCode - Default error code to use
 * @returns Wrapped handler with standardized error handling
 */
export function asyncController(
    fn: (req: Request, res: Response) => Promise<void>,
    errorCode: string = 'INTERNAL_ERROR'
): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await fn(req, res);
        } catch (error: any) {
            // Log the error
            logger.error(`Controller error: ${error.message}`, {
                method: req.method,
                path: req.path,
                errorCode
            });

            // Return standardized error response
            res.status(500).json({
                success: false,
                error: {
                    code: errorCode,
                    message: error.message || 'An unexpected error occurred'
                }
            });
        }
    };
}

export default asyncHandler;
