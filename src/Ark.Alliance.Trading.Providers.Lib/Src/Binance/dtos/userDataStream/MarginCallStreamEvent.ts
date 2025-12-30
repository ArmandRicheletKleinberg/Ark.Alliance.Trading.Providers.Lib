/**
 * @fileoverview Margin Call Stream Event Models
 * @module models/userDataStream/MarginCallStreamEvent
 * 
 * Typed models for MARGIN_CALL events from Binance User Data Stream.
 * This event is pushed when user's position risk ratio is too high.
 */

/**
 * Position at risk in margin call
 */
export interface MarginCallPosition {
    /** Symbol (e.g., BTCUSDT) */
    symbol: string;
    /** Position side: 'LONG' | 'SHORT' */
    positionSide: 'LONG' | 'SHORT';
    /** Position amount */
    positionAmt: number;
    /** Margin type: 'CROSSED' | 'ISOLATED' */
    marginType: 'CROSSED' | 'ISOLATED';
    /** Isolated wallet (if isolated position) */
    isolatedWallet: number;
    /** Mark price */
    markPrice: number;
    /** Unrealized PnL */
    unrealizedPnL: number;
    /** Maintenance margin required */
    maintenanceMargin: number;
}

/**
 * Parsed MARGIN_CALL event
 */
export interface MarginCallStreamEvent {
    /** Event type - always 'MARGIN_CALL' */
    eventType: 'MARGIN_CALL';
    /** Event time (ms) */
    eventTime: number;
    /** Cross wallet balance (only pushed with crossed position margin call) */
    crossWalletBalance?: number;
    /** Positions at risk */
    positions: MarginCallPosition[];
}

/**
 * Raw MARGIN_CALL event from Binance WebSocket
 */
export interface MarginCallRaw {
    e: 'MARGIN_CALL';
    E: number;       // Event time
    cw?: string;     // Cross wallet balance
    p: Array<{
        s: string;   // Symbol
        ps: string;  // Position side
        pa: string;  // Position amount
        mt: string;  // Margin type
        iw: string;  // Isolated wallet
        mp: string;  // Mark price
        up: string;  // Unrealized PnL
        mm: string;  // Maintenance margin
    }>;
}
