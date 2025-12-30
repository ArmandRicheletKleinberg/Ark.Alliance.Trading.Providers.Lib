/**
 * @fileoverview Listen Key Expired Event
 * @module dtos/userDataStream/ListenKeyExpiredEvent
 * 
 * Event pushed when the listenKey used for user data stream expires.
 * Reference: Binance USDⓈ-M Futures User Data Streams
 */

import { Result } from '../../../Common/result/Result';

// ═══════════════════════════════════════════════════════════════════════════════
// Raw Event (from Binance WebSocket)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw listenKeyExpired event from Binance WebSocket.
 * 
 * @remarks
 * Notice from Binance:
 * - This event is not related to WebSocket disconnection
 * - Received only when a valid listenKey expires
 * - No more user data events until new valid listenKey is used
 */
export interface ListenKeyExpiredRaw {
    /** Event type - always 'listenKeyExpired' */
    e: 'listenKeyExpired';
    /** Event time (string in Binance format) */
    E: string;
    /** The expired listen key */
    listenKey: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parsed Event
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parsed listenKeyExpired event with typed fields.
 */
export interface ListenKeyExpiredEvent {
    /** Event type - always 'listenKeyExpired' */
    eventType: 'listenKeyExpired';
    /** Event time (ms) */
    eventTime: number;
    /** The expired listen key */
    listenKey: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parser
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parses a raw listenKeyExpired event from Binance.
 * 
 * @param raw - Raw event from WebSocket.
 * @returns Result containing parsed event or error.
 */
export function parseListenKeyExpired(raw: ListenKeyExpiredRaw): Result<ListenKeyExpiredEvent> {
    try {
        const event: ListenKeyExpiredEvent = {
            eventType: 'listenKeyExpired',
            eventTime: parseInt(raw.E, 10),
            listenKey: raw.listenKey
        };
        return Result.ok(event);
    } catch (error) {
        return Result.fromError<ListenKeyExpiredEvent>(
            error instanceof Error ? error : new Error('Failed to parse listenKeyExpired event'),
            'PARSE_ERROR'
        );
    }
}

/**
 * Type guard to check if raw message is a listenKeyExpired event.
 */
export function isListenKeyExpiredEvent(raw: unknown): raw is ListenKeyExpiredRaw {
    return typeof raw === 'object' &&
        raw !== null &&
        (raw as ListenKeyExpiredRaw).e === 'listenKeyExpired';
}
