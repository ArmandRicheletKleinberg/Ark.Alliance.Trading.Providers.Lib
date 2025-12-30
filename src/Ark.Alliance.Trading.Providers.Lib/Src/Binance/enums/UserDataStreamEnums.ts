/**
 * @fileoverview User Data Stream Enums
 * @module enums/UserDataStreamEnums
 * 
 * Enumerations for User Data Stream event types and statuses.
 * Reference: Binance USDⓈ-M Futures User Data Streams
 */

// ═══════════════════════════════════════════════════════════════════════════════
// User Data Event Type
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * User Data Stream event types from Binance WebSocket.
 */
export const UserDataEventType = {
    /** Listen key expired - stream needs reconnection */
    LISTEN_KEY_EXPIRED: 'listenKeyExpired',
    /** Balance and position update */
    ACCOUNT_UPDATE: 'ACCOUNT_UPDATE',
    /** Margin call warning */
    MARGIN_CALL: 'MARGIN_CALL',
    /** Order status update */
    ORDER_TRADE_UPDATE: 'ORDER_TRADE_UPDATE',
    /** Fast trade update (reduced latency) */
    TRADE_LITE: 'TRADE_LITE',
    /** Account configuration change (leverage, multi-assets mode) */
    ACCOUNT_CONFIG_UPDATE: 'ACCOUNT_CONFIG_UPDATE',
    /** Grid strategy update */
    GRID_UPDATE: 'GRID_UPDATE',
    /** Conditional order trigger rejected */
    CONDITIONAL_ORDER_TRIGGER_REJECT: 'CONDITIONAL_ORDER_TRIGGER_REJECT',
    /** Algo order status update */
    ALGO_UPDATE: 'ALGO_UPDATE'
} as const;

export type UserDataEventTypeType = typeof UserDataEventType[keyof typeof UserDataEventType];

// ═══════════════════════════════════════════════════════════════════════════════
// Grid Strategy Status
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Grid trading strategy statuses.
 */
export const GridStrategyStatus = {
    /** Strategy is new, not yet active */
    NEW: 'NEW',
    /** Strategy is actively working */
    WORKING: 'WORKING',
    /** Strategy was cancelled by user */
    CANCELLED: 'CANCELLED',
    /** Strategy expired */
    EXPIRED: 'EXPIRED'
} as const;

export type GridStrategyStatusType = typeof GridStrategyStatus[keyof typeof GridStrategyStatus];

/**
 * Checks if a grid strategy is active.
 */
export function isGridStrategyActive(status: GridStrategyStatusType): boolean {
    return status === GridStrategyStatus.NEW || status === GridStrategyStatus.WORKING;
}


// ═══════════════════════════════════════════════════════════════════════════════
// Expiry Reason
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Order expiry reason codes from ORDER_TRADE_UPDATE.
 */
export const ExpiryReasonCode = {
    /** None, the default value */
    NONE: 0,
    /** Order expired to prevent self-trade */
    SELF_TRADE_PREVENTION: 1,
    /** IOC order could not be filled completely */
    IOC_PARTIAL: 2,
    /** IOC order partial + self-trade prevention */
    IOC_SELF_TRADE: 3,
    /** Knocked out by higher priority RO order */
    KNOCKED_OUT: 4,
    /** Expired during liquidation */
    LIQUIDATION: 5,
    /** GTE condition unsatisfied */
    GTE_UNSATISFIED: 6,
    /** Symbol delisted */
    DELISTED: 7,
    /** Stop order triggered, initial order expired */
    STOP_TRIGGERED: 8,
    /** Market order could not be filled completely */
    MARKET_PARTIAL: 9
} as const;

export type ExpiryReasonCodeType = typeof ExpiryReasonCode[keyof typeof ExpiryReasonCode];

/**
 * Gets a human-readable description for an expiry reason code.
 */
export function getExpiryReasonDescription(code: ExpiryReasonCodeType): string {
    switch (code) {
        case ExpiryReasonCode.NONE:
            return 'None';
        case ExpiryReasonCode.SELF_TRADE_PREVENTION:
            return 'Order expired to prevent self-trade';
        case ExpiryReasonCode.IOC_PARTIAL:
            return 'IOC order could not be filled completely';
        case ExpiryReasonCode.IOC_SELF_TRADE:
            return 'IOC order partial fill with self-trade prevention';
        case ExpiryReasonCode.KNOCKED_OUT:
            return 'Knocked out by higher priority reduce-only order';
        case ExpiryReasonCode.LIQUIDATION:
            return 'Order expired during liquidation';
        case ExpiryReasonCode.GTE_UNSATISFIED:
            return 'GTE condition unsatisfied';
        case ExpiryReasonCode.DELISTED:
            return 'Symbol delisted';
        case ExpiryReasonCode.STOP_TRIGGERED:
            return 'Initial order expired after stop order triggered';
        case ExpiryReasonCode.MARKET_PARTIAL:
            return 'Market order could not be filled completely';
        default:
            return `Unknown expiry reason: ${code}`;
    }
}
