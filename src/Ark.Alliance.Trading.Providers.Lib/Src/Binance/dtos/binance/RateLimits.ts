/**
 * @fileoverview Binance Rate Limit Types
 * @module models/binance/RateLimits
 */

export type RateLimitType = 'REQUEST_WEIGHT' | 'ORDERS' | 'RAW_REQUESTS';
export type RateLimitInterval = 'SECOND' | 'MINUTE' | 'DAY';

/**
 * Rate limit from Binance API response
 */
export interface BinanceRateLimit {
    rateLimitType: RateLimitType;
    interval: RateLimitInterval;
    intervalNum: number;
    limit: number;
    count: number;
}

/**
 * Rate limit cache entry with timestamp
 */
export interface RateLimitStatus {
    rateLimits: BinanceRateLimit[];
    lastUpdated: Date;
    source: 'websocket' | 'rest';
}

/**
 * Rate limit summary for display
 */
export interface RateLimitSummary {
    instanceKey: string;
    client: 'websocket' | 'rest' | 'userdata';
    limits: {
        requestWeight?: {
            used: number;
            limit: number;
            remaining: number;
            resetIn: number; // milliseconds
        };
        orders?: {
            used: number;
            limit: number;
            remaining: number;
            resetIn: number;
        };
        rawRequests?: {
            used: number;
            limit: number;
            remaining: number;
            resetIn: number;
        };
    };
    lastUpdated: Date;
}
