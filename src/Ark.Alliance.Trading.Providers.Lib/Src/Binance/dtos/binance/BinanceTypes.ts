/**
 * @fileoverview Binance API Response Types
 * @module models/binance/BinanceTypes
 */

/**
 * Binance order response
 */
export interface BinanceOrderResponse {
    orderId: number;
    symbol: string;
    status: string;
    clientOrderId: string;
    price: string;
    avgPrice: string;
    origQty: string;
    executedQty: string;
    cumQty: string;
    cumQuote: string;
    timeInForce: string;
    type: string;
    reduceOnly: boolean;
    closePosition: boolean;
    side: string;
    positionSide: string;
    stopPrice: string;
    workingType: string;
    priceProtect: boolean;
    origType: string;
    updateTime: number;
}

/**
 * Binance order book response
 */
export interface OrderBook {
    lastUpdateId: number;
    E: number; // Message output time
    T: number; // Transaction time
    bids: [string, string][]; // [price, quantity]
    asks: [string, string][]; // [price, quantity]
}

/**
 * Binance listen key response
 */
export interface ListenKeyResponse {
    listenKey: string;
}

/**
 * Binance leverage response
 */
export interface LeverageResponse {
    leverage: number;
    maxNotionalValue: string;
    symbol: string;
}

/**
 * Binance account update event (User Data Stream)
 */
export interface AccountUpdateEvent {
    e: 'ACCOUNT_UPDATE';
    E: number; // Event time
    T: number; // Transaction time
    a: {
        m: string; // Event reason type
        B: BalanceUpdate[]; // Balance updates
        P: PositionUpdateRaw[]; // Position updates
    };
}

/**
 * Balance update from account event
 */
export interface BalanceUpdate {
    a: string; // Asset
    wb: string; // Wallet balance
    cw: string; // Cross wallet balance
    bc: string; // Balance change
}

/**
 * Raw position update from account event
 */
export interface PositionUpdateRaw {
    s: string; // Symbol
    pa: string; // Position amount
    ep: string; // Entry price
    bep: string; // Breakeven price
    cr: string; // Accumulated realized
    up: string; // Unrealized PnL
    mt: string; // Margin type
    iw: string; // Isolated wallet
    ps: string; // Position side
}

/**
 * Order trade update event (User Data Stream)
 */
export interface OrderTradeUpdateEvent {
    e: 'ORDER_TRADE_UPDATE';
    E: number; // Event time
    T: number; // Transaction time
    o: {
        s: string; // Symbol
        c: string; // Client order ID
        S: string; // Side
        o: string; // Order type
        f: string; // Time in force
        q: string; // Original quantity
        p: string; // Original price
        ap: string; // Average price
        sp: string; // Stop price
        x: string; // Execution type
        X: string; // Order status
        i: number; // Order ID
        l: string; // Last filled quantity
        z: string; // Filled accumulated quantity
        L: string; // Last filled price
        T: number; // Order trade time
        t: number; // Trade ID
    };
}

/**
 * Rate limit info from Binance response
 */
export interface RateLimitInfo {
    rateLimitType: string;
    interval: string;
    intervalNum: number;
    limit: number;
    count: number;
}
