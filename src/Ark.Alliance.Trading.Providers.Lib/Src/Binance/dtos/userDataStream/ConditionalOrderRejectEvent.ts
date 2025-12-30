/**
 * @fileoverview Conditional Order Trigger Reject Event
 * @module dtos/userDataStream/ConditionalOrderRejectEvent
 * 
 * Event pushed when a triggered TP/SL order gets rejected.
 * Reference: Binance USDⓈ-M Futures User Data Streams
 */

import { Result } from '../../../Common/result/Result';

// ═══════════════════════════════════════════════════════════════════════════════
// Raw Event (from Binance WebSocket)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw CONDITIONAL_ORDER_TRIGGER_REJECT event from Binance WebSocket.
 */
export interface ConditionalOrderRejectRaw {
    /** Event type - always 'CONDITIONAL_ORDER_TRIGGER_REJECT' */
    e: 'CONDITIONAL_ORDER_TRIGGER_REJECT';
    /** Event Time */
    E: number;
    /** Message send time */
    T: number;
    /** Order rejection data */
    or: {
        /** Symbol */
        s: string;
        /** Order ID */
        i: number;
        /** Reject reason message */
        r: string;
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parsed Event
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parsed CONDITIONAL_ORDER_TRIGGER_REJECT event with typed fields.
 */
export interface ConditionalOrderRejectEvent {
    /** Event type - always 'CONDITIONAL_ORDER_TRIGGER_REJECT' */
    eventType: 'CONDITIONAL_ORDER_TRIGGER_REJECT';
    /** Event time (ms) */
    eventTime: number;
    /** Message send time (ms) */
    sendTime: number;
    /** Trading symbol */
    symbol: string;
    /** Rejected order ID */
    orderId: number;
    /** Human-readable rejection reason */
    rejectReason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parser
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parses a raw CONDITIONAL_ORDER_TRIGGER_REJECT event from Binance.
 * 
 * @param raw - Raw event from WebSocket.
 * @returns Result containing parsed event or error.
 */
export function parseConditionalOrderReject(raw: ConditionalOrderRejectRaw): Result<ConditionalOrderRejectEvent> {
    try {
        const event: ConditionalOrderRejectEvent = {
            eventType: 'CONDITIONAL_ORDER_TRIGGER_REJECT',
            eventTime: raw.E,
            sendTime: raw.T,
            symbol: raw.or.s,
            orderId: raw.or.i,
            rejectReason: raw.or.r
        };
        return Result.ok(event);
    } catch (error) {
        return Result.fromError<ConditionalOrderRejectEvent>(
            error instanceof Error ? error : new Error('Failed to parse CONDITIONAL_ORDER_TRIGGER_REJECT event'),
            'PARSE_ERROR'
        );
    }
}

/**
 * Type guard to check if raw message is a CONDITIONAL_ORDER_TRIGGER_REJECT event.
 */
export function isConditionalOrderRejectEvent(raw: unknown): raw is ConditionalOrderRejectRaw {
    return typeof raw === 'object' &&
        raw !== null &&
        (raw as ConditionalOrderRejectRaw).e === 'CONDITIONAL_ORDER_TRIGGER_REJECT';
}
