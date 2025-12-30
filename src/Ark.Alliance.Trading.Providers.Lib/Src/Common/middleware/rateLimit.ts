/**
 * @fileoverview Rate Limiting Middleware
 * @module middleware/rateLimit
 * 
 * Configures rate limiting per endpoint type to prevent abuse.
 * Different limits apply to different endpoint categories.
 * 
 * NOTE: Using IPv4-only mode for local development.
 * For production behind a proxy, configure trust proxy properly.
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Standard response for rate limit exceeded
 */
const rateLimitResponse = (req: Request, res: Response) => {
    res.status(429).json({
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later'
        }
    });
};

/**
 * Common key generator - IPv4 focused for local development
 * Falls back to a static key if IP detection fails
 */
const keyGenerator = (req: Request): string => {
    // For local development, use simple IP extraction
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    // Use socket remote address for direct connections
    return req.socket?.remoteAddress || req.ip || 'localhost';
};

// Rate limiter options type - allow extra properties for version compatibility
type RateLimiterOptions = Parameters<typeof rateLimit>[0] & Record<string, unknown>;

/**
 * General API rate limiter
 * Effectively disabled for local dev (100k/min)
 */
export const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 100000,
    handler: rateLimitResponse,
    keyGenerator
} as RateLimiterOptions);

/**
 * Strict limiter for order placement endpoints
 * Effectively disabled for local dev (100k/min)
 */
export const orderLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100000,
    handler: rateLimitResponse,
    keyGenerator
} as RateLimiterOptions);

/**
 * Strict limiter for strategy start/stop
 * Effectively disabled for local dev (100k/min)
 */
export const strategyLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100000,
    handler: rateLimitResponse,
    keyGenerator
} as RateLimiterOptions);

/**
 * Very strict limiter for auth/credential endpoints
 * Effectively disabled for local dev (100k/min)
 */
export const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100000,
    handler: rateLimitResponse,
    keyGenerator
} as RateLimiterOptions);

/**
 * Lenient limiter for read-only status endpoints
 * Effectively disabled for local dev (100k/min)
 */
export const statusLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100000,
    handler: rateLimitResponse,
    keyGenerator
} as RateLimiterOptions);
