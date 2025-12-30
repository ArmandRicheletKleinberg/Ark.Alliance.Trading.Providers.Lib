/**
 * @fileoverview Correlation ID Middleware
 * @module middleware/correlationId
 * 
 * Generates and attaches unique correlation IDs to all requests
 * for distributed tracing and log correlation.
 */

import { Request, Response, NextFunction } from 'express';
import { generateUuid } from '../helpers/UuidGenerator';

// Extend Express Request type to include correlationId
declare global {
    namespace Express {
        interface Request {
            correlationId: string;
        }
    }
}

export const CORRELATION_ID_HEADER = 'X-Correlation-ID';

/**
 * Middleware that assigns a correlation ID to each request.
 * If a correlation ID is provided in the request header, it is used.
 * Otherwise, a new UUID is generated.
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Use existing correlation ID from header or generate new one
    const correlationId = req.headers[CORRELATION_ID_HEADER.toLowerCase()] as string || generateUuid();

    // Attach to request object
    req.correlationId = correlationId;

    // Add to response headers for client tracing
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    next();
}
