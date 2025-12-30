/**
 * @fileoverview Conditional Order Trigger Reject Event Model
 * @module models/binance/ConditionalOrderTriggerReject
 *
 * Represents the CONDITIONAL_ORDER_TRIGGER_REJECT event from Binance.
 *
 * @deprecated This event is deprecated as of December 15, 2025.
 * Conditional order rejections are now communicated via the ALGO_UPDATE event
 * with status=REJECTED. See AlgoOrderUpdate.ts for the new implementation.
 *
 * @see https://binance-docs.github.io/apidocs/futures/en/#event-algo-update
 */

/**
 * Raw CONDITIONAL_ORDER_TRIGGER_REJECT event from Binance WebSocket
 */
export interface ConditionalOrderTriggerRejectRaw {
    e: 'CONDITIONAL_ORDER_TRIGGER_REJECT'; // Event Type
    E: number;                             // Event Time
    T: number;                             // Message Send Time
    or: {
        s: string;                         // Symbol
        i: number;                         // Order Id
        r: string;                         // Reject Reason
    };
}

/**
 * Parsed Conditional Order Trigger Reject (clean interface)
 */
export interface ConditionalOrderTriggerReject {
    eventType: 'CONDITIONAL_ORDER_TRIGGER_REJECT';
    eventTime: number;
    transactionTime: number;
    symbol: string;
    orderId: number;
    rejectReason: string;
}

/**
 * Parse raw CONDITIONAL_ORDER_TRIGGER_REJECT to clean object
 */
export function parseConditionalOrderTriggerReject(raw: ConditionalOrderTriggerRejectRaw): ConditionalOrderTriggerReject {
    return {
        eventType: raw.e,
        eventTime: raw.E,
        transactionTime: raw.T,
        symbol: raw.or.s,
        orderId: raw.or.i,
        rejectReason: raw.or.r
    };
}
