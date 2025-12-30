/**
 * @fileoverview Trade Lite Stream Event
 * @module dtos/userDataStream/TradeLiteStreamEvent
 * 
 * Fast trade stream with reduced latency compared to ORDER_TRADE_UPDATE.
 * Only pushes TRADE execution type with fewer data fields.
 * Reference: Binance USDⓈ-M Futures User Data Streams
 */

import { Result } from '../../../Common/result/Result';
import { OrderSide, type OrderSideType } from '../../enums';

// ═══════════════════════════════════════════════════════════════════════════════
// Raw Event (from Binance WebSocket)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw TRADE_LITE event from Binance WebSocket.
 * 
 * @remarks
 * Special client order id prefixes:
 * - "autoclose-": liquidation order
 * - "adl_autoclose": ADL auto close order
 * - "settlement_autoclose-": settlement order for delisting/delivery
 */
export interface TradeLiteRaw {
    /** Event type - always 'TRADE_LITE' */
    e: 'TRADE_LITE';
    /** Event Time */
    E: number;
    /** Transaction Time */
    T: number;
    /** Symbol */
    s: string;
    /** Original Quantity */
    q: string;
    /** Original Price */
    p: string;
    /** Is this trade the maker side? */
    m: boolean;
    /** Client Order Id */
    c: string;
    /** Side: BUY or SELL */
    S: string;
    /** Last Filled Price */
    L: string;
    /** Order Last Filled Quantity */
    l: string;
    /** Trade Id */
    t: number;
    /** Order Id */
    i: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parsed Event
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parsed TRADE_LITE event with typed fields.
 */
export interface TradeLiteEvent {
    /** Event type - always 'TRADE_LITE' */
    eventType: 'TRADE_LITE';
    /** Event time (ms) */
    eventTime: number;
    /** Transaction time (ms) */
    transactionTime: number;
    /** Trading symbol (e.g., BTCUSDT) */
    symbol: string;
    /** Original order quantity */
    originalQty: string;
    /** Original order price */
    originalPrice: string;
    /** Whether this trade is on the maker side */
    isMaker: boolean;
    /** Client order ID */
    clientOrderId: string;
    /** Order side */
    side: OrderSideType;
    /** Last filled price for this trade */
    lastFilledPrice: string;
    /** Last filled quantity for this trade */
    lastFilledQty: string;
    /** Unique trade ID */
    tradeId: number;
    /** Order ID */
    orderId: number;
    /** Whether this is a liquidation order */
    isLiquidation: boolean;
    /** Whether this is an ADL order */
    isAdl: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parser
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parses a raw TRADE_LITE event from Binance.
 * 
 * @param raw - Raw event from WebSocket.
 * @returns Result containing parsed event or error.
 */
export function parseTradeLite(raw: TradeLiteRaw): Result<TradeLiteEvent> {
    try {
        const clientOrderId = raw.c || '';

        const event: TradeLiteEvent = {
            eventType: 'TRADE_LITE',
            eventTime: raw.E,
            transactionTime: raw.T,
            symbol: raw.s,
            originalQty: raw.q,
            originalPrice: raw.p,
            isMaker: raw.m,
            clientOrderId,
            side: raw.S as OrderSideType,
            lastFilledPrice: raw.L,
            lastFilledQty: raw.l,
            tradeId: raw.t,
            orderId: raw.i,
            isLiquidation: clientOrderId.startsWith('autoclose-'),
            isAdl: clientOrderId === 'adl_autoclose'
        };
        return Result.ok(event);
    } catch (error) {
        return Result.fromError<TradeLiteEvent>(
            error instanceof Error ? error : new Error('Failed to parse TRADE_LITE event'),
            'PARSE_ERROR'
        );
    }
}

/**
 * Type guard to check if raw message is a TRADE_LITE event.
 */
export function isTradeLiteEvent(raw: unknown): raw is TradeLiteRaw {
    return typeof raw === 'object' &&
        raw !== null &&
        (raw as TradeLiteRaw).e === 'TRADE_LITE';
}
