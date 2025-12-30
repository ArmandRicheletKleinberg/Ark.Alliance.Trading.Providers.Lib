/**
 * @fileoverview Order Update Event Models from Binance User Data Stream
 * @module models/binance/OrderUpdate
 * 
 * Based on Binance USDS-M Futures ORDER_TRADE_UPDATE event
 */

import {
    OrderSide,
    OrderType,
    ExecutionType,
    OrderStatus,
    TimeInForce,
    WorkingType,
    PositionSide,
    type OrderSideType,
    type OrderTypeType,
    type ExecutionTypeType,
    type OrderStatusType,
    type TimeInForceType,
    type WorkingTypeType,
    type PositionSideType
} from '../../enums';

// Re-export enums for backward compatibility
export { OrderSide, OrderType, ExecutionType, OrderStatus, TimeInForce, WorkingType, PositionSide };

// Expiry Reason
export enum ExpiryReason {
    NONE = 0,
    SELF_TRADE_PREVENTION = 1,
    IOC_INCOMPLETE = 2,
    IOC_SELF_TRADE = 3,
    KNOCKED_OUT = 4,
    LIQUIDATION = 5,
    GTE_UNSATISFIED = 6,
    SYMBOL_DELISTED = 7,
    STOP_TRIGGER_EXPIRED = 8,
    MARKET_INCOMPLETE = 9
}

/**
 * Raw ORDER_TRADE_UPDATE event from Binance WebSocket
 */
export interface OrderTradeUpdateRaw {
    e: 'ORDER_TRADE_UPDATE';  // Event Type
    E: number;                 // Event Time
    T: number;                 // Transaction Time
    o: {
        s: string;             // Symbol
        c: string;             // Client Order Id
        S: OrderSide;          // Side
        o: OrderType;          // Order Type
        f: TimeInForce;        // Time in Force
        q: string;             // Original Quantity
        p: string;             // Original Price
        ap: string;            // Average Price
        sp: string;            // Stop Price
        x: ExecutionType;      // Execution Type
        X: OrderStatus;        // Order Status
        i: number;             // Order Id
        l: string;             // Order Last Filled Quantity
        z: string;             // Order Filled Accumulated Quantity
        L: string;             // Last Filled Price
        N: string;             // Commission Asset
        n: string;             // Commission
        T: number;             // Order Trade Time
        t: number;             // Trade Id
        b: string;             // Bids Notional
        a: string;             // Ask Notional
        m: boolean;            // Is this trade the maker side?
        R: boolean;            // Is this reduce only
        wt: WorkingType;       // Stop Price Working Type
        ot: OrderType;         // Original Order Type
        ps: PositionSide;      // Position Side
        cp: boolean;           // If Close-All
        AP?: string;           // Activation Price (TRAILING_STOP_MARKET only)
        cr?: string;           // Callback Rate (TRAILING_STOP_MARKET only)
        pP: boolean;           // Price protection
        si: number;            // ignore
        ss: number;            // ignore
        rp: string;            // Realized Profit
        V: string;             // STP mode
        pm: string;            // Price match mode
        gtd: number;           // GTD auto cancel time
        er: string;            // Expiry Reason
    };
}

/**
 * Parsed Order Update (clean interface)
 */
export interface OrderUpdate {
    // Identifiers
    orderId: number;
    clientOrderId: string;
    symbol: string;

    // Order Details
    side: OrderSide;
    orderType: OrderType;
    originalOrderType: OrderType;
    timeInForce: TimeInForce;
    positionSide: PositionSide;

    // Quantities
    originalQuantity: number;
    filledQuantity: number;
    lastFilledQuantity: number;

    // Prices
    originalPrice: number;
    averagePrice: number;
    lastFilledPrice: number;
    stopPrice: number;
    activationPrice?: number;    // TRAILING_STOP_MARKET
    callbackRate?: number;       // TRAILING_STOP_MARKET

    // Status
    executionType: ExecutionType;
    orderStatus: OrderStatus;

    // Trade Info
    tradeId: number;
    isMaker: boolean;
    isReduceOnly: boolean;
    isCloseAll: boolean;

    // Financials
    commission: number;
    commissionAsset: string;
    realizedProfit: number;
    bidsNotional: number;
    askNotional: number;

    // Working Type
    workingType: WorkingType;
    priceProtection: boolean;

    // Timestamps
    eventTime: number;
    transactionTime: number;
    tradeTime: number;

    // Expiry
    expiryReason: number;

    // Flags
    isLiquidation: boolean;
    isADL: boolean;
}

/**
 * Parse raw ORDER_TRADE_UPDATE to clean OrderUpdate
 */
export function parseOrderTradeUpdate(raw: OrderTradeUpdateRaw): OrderUpdate {
    const o = raw.o;

    return {
        // Identifiers
        orderId: o.i,
        clientOrderId: o.c,
        symbol: o.s,

        // Order Details
        side: o.S,
        orderType: o.o,
        originalOrderType: o.ot,
        timeInForce: o.f,
        positionSide: o.ps,

        // Quantities
        originalQuantity: parseFloat(o.q),
        filledQuantity: parseFloat(o.z),
        lastFilledQuantity: parseFloat(o.l),

        // Prices
        originalPrice: parseFloat(o.p),
        averagePrice: parseFloat(o.ap),
        lastFilledPrice: parseFloat(o.L),
        stopPrice: parseFloat(o.sp),
        activationPrice: o.AP ? parseFloat(o.AP) : undefined,
        callbackRate: o.cr ? parseFloat(o.cr) : undefined,

        // Status
        executionType: o.x,
        orderStatus: o.X,

        // Trade Info
        tradeId: o.t,
        isMaker: o.m,
        isReduceOnly: o.R,
        isCloseAll: o.cp,

        // Financials
        commission: parseFloat(o.n),
        commissionAsset: o.N,
        realizedProfit: parseFloat(o.rp),
        bidsNotional: parseFloat(o.b),
        askNotional: parseFloat(o.a),

        // Working Type
        workingType: o.wt,
        priceProtection: o.pP,

        // Timestamps
        eventTime: raw.E,
        transactionTime: raw.T,
        tradeTime: o.T,

        // Expiry
        expiryReason: parseInt(o.er) || 0,

        // Flags
        isLiquidation: o.c.startsWith('autoclose-'),
        isADL: o.c === 'adl_autoclose'
    };
}
