/**
 * @fileoverview Account Update Stream Event Models
 * @module models/userDataStream/AccountUpdateStreamEvent
 * 
 * Typed models for ACCOUNT_UPDATE events from Binance User Data Stream.
 * Reference: https://binance-docs.github.io/apidocs/futures/en/#event-balance-and-position-update
 */

import {
    AccountUpdateReason,
    PositionSide,
    MarginType,
    type AccountUpdateReasonType,
    type PositionSideType,
    type MarginTypeType
} from '../../enums';

// Re-export for backward compatibility
export { AccountUpdateReason };
export type { AccountUpdateReasonType };

/**
 * Balance update from ACCOUNT_UPDATE event
 */
export interface BalanceStreamUpdate {
    /** Asset symbol (e.g., USDT, BTC) */
    asset: string;
    /** Wallet balance */
    walletBalance: number;
    /** Cross wallet balance */
    crossWalletBalance: number;
    /** Balance change except PnL and commission */
    balanceChange: number;
}

/**
 * Position update from ACCOUNT_UPDATE event
 */
export interface PositionStreamUpdate {
    /** Symbol (e.g., BTCUSDT) */
    symbol: string;
    /** Position amount */
    positionAmt: number;
    /** Entry price */
    entryPrice: number;
    /** Breakeven price */
    breakEvenPrice: number;
    /** (Pre-fee) Accumulated Realized PnL */
    accumulatedRealized: number;
    /** Unrealized PnL */
    unrealizedPnL: number;
    /** Margin type */
    marginType: MarginTypeType;
    /** Isolated wallet (if isolated position) */
    isolatedWallet: number;
    /** Position side */
    positionSide: PositionSideType;
}

/**
 * Parsed ACCOUNT_UPDATE event
 */
export interface AccountUpdateStreamEvent {
    /** Event type - always 'ACCOUNT_UPDATE' */
    eventType: 'ACCOUNT_UPDATE';
    /** Event time (ms) */
    eventTime: number;
    /** Transaction time (ms) */
    transactionTime: number;
    /** Reason for the update */
    reason: AccountUpdateReason;
    /** Balance updates */
    balances: BalanceStreamUpdate[];
    /** Position updates */
    positions: PositionStreamUpdate[];
}

/**
 * Raw ACCOUNT_UPDATE event from Binance WebSocket
 */
export interface AccountUpdateRaw {
    e: 'ACCOUNT_UPDATE';
    E: number;  // Event time
    T: number;  // Transaction time
    a: {
        m: string;  // Event reason type
        B: Array<{
            a: string;   // Asset
            wb: string;  // Wallet balance
            cw: string;  // Cross wallet balance
            bc: string;  // Balance change
        }>;
        P: Array<{
            s: string;   // Symbol
            pa: string;  // Position amount
            ep: string;  // Entry price
            bep: string; // Breakeven price
            cr: string;  // Accumulated realized
            up: string;  // Unrealized PnL
            mt: string;  // Margin type
            iw: string;  // Isolated wallet
            ps: string;  // Position side
        }>;
    };
}
