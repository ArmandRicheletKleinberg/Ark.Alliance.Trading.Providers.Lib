/**
 * @fileoverview Position Model
 * @module models/position/Position
 */

/**
 * Position side enum
 */
export enum PositionSide {
    LONG = 'LONG',
    SHORT = 'SHORT',
    BOTH = 'BOTH' // For hedge mode
}

/**
 * Margin type enum
 */
export enum MarginType {
    ISOLATED = 'isolated',
    CROSSED = 'cross'
}

/**
 * Position interface representing a Binance Futures position
 */
export interface Position {
    /** Trading symbol (e.g. BTCUSDT) */
    symbol: string;

    /** Position side */
    positionSide: PositionSide;

    /** Position amount (positive for LONG, negative for SHORT in one-way mode) */
    positionAmt: number;

    /** Entry price */
    entryPrice: number;

    /** Breakeven price */
    breakEvenPrice: number;

    /** Mark price (current market price) */
    markPrice: number;

    /** Unrealized PnL in USDT */
    unrealizedProfit: number;

    /** Realized PnL in USDT */
    realizedProfit: number;

    /** Margin type */
    marginType: MarginType;

    /** Isolated wallet (if isolated position) */
    isolatedWallet?: number;

    /** Leverage */
    leverage: number;

    /** Liquidation price */
    liquidationPrice: number;

    /** Position notional value */
    notional: number;

    /** Last update timestamp */
    updateTime: number;
}

/**
 * Position update event from User Data Stream
 */
export interface PositionUpdate {
    /** Event type */
    eventType: 'ACCOUNT_UPDATE';

    /** Event time */
    eventTime: number;

    /** Transaction time */
    transactionTime: number;

    /** Reason for update */
    reason: 'ORDER' | 'FUNDING_FEE' | 'WITHDRAW' | 'DEPOSIT' | 'MARGIN_TRANSFER' | 'MARGIN_TYPE_CHANGE' | 'ASSET_TRANSFER';

    /** Updated positions */
    positions: Position[];
}

/**
 * Position risk info from REST API
 */
export interface PositionRisk {
    symbol: string;
    positionAmt: string;
    entryPrice: string;
    breakEvenPrice: string;
    markPrice: string;
    unRealizedProfit: string;
    liquidationPrice: string;
    leverage: string;
    maxNotionalValue: string;
    marginType: string;
    isolatedMargin: string;
    isAutoAddMargin: string;
    positionSide: string;
    notional: string;
    isolatedWallet: string;
    updateTime: number;
    isolated: boolean;
    adlQuantile: number;
}
