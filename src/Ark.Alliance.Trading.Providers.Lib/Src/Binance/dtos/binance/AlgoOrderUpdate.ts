/**
 * @fileoverview Algo Order Update Event Models from Binance User Data Stream
 * @module models/binance/AlgoOrderUpdate
 *
 * Based on Binance USDS-M Futures ALGO_UPDATE event for Conditional Orders.
 *
 * @remarks
 * As of 2024, Binance migrated conditional orders (STOP, TAKE_PROFIT, STOP_MARKET,
 * TAKE_PROFIT_MARKET, TRAILING_STOP_MARKET) to the Algo Service. These orders
 * receive updates via the ALGO_UPDATE WebSocket event instead of ORDER_TRADE_UPDATE.
 *
 * Key behavioral changes with Algo Service:
 * - Margin checks are NOT performed until the conditional order is triggered
 * - CONDITIONAL_ORDER_TRIGGER_REJECT is deprecated (Dec 15, 2025)
 * - Rejections are now communicated via ALGO_UPDATE with status=REJECTED
 *
 * @see https://binance-docs.github.io/apidocs/futures/en/#event-algo-update
 */

import { OrderSide, OrderType, PositionSide, TimeInForce, WorkingType } from './OrderUpdate';

// ═══════════════════════════════════════════════════════════════════════════════
// Algo Order Status
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Algo order status enumeration.
 *
 * @remarks
 * Status lifecycle for conditional orders:
 * 1. NEW - Order placed in Algo Service, waiting for trigger condition
 * 2. TRIGGERING - Trigger condition met, forwarding to matching engine
 * 3. TRIGGERED - Successfully placed in matching engine
 * 4. FINISHED - Order filled or canceled in matching engine
 *
 * Alternative terminal states:
 * - CANCELLED - Manually canceled before trigger
 * - REJECTED - Matching engine rejected (e.g., margin check failure)
 * - EXPIRED - System canceled (e.g., GTE_GTC canceled when position closed)
 */
export enum AlgoOrderStatus {
    /** Order placed in Algo Service, waiting for trigger condition. */
    NEW = 'NEW',

    /** Order has been canceled before triggering. */
    CANCELLED = 'CANCELLED',

    /** Trigger condition met, order forwarded to matching engine. */
    TRIGGERING = 'TRIGGERING',

    /** Order successfully placed in matching engine. */
    TRIGGERED = 'TRIGGERED',

    /**
     * Order finished (filled or canceled) in matching engine.
     * @remarks Added in 2024 Algo Service update.
     */
    FINISHED = 'FINISHED',

    /**
     * Order executed (filled). May not be explicitly used in all cases.
     * @deprecated Check for FINISHED status instead.
     */
    EXECUTED = 'EXECUTED',

    /**
     * Order rejected by matching engine.
     * Common reasons: margin check failure, position already closed.
     */
    REJECTED = 'REJECTED',

    /**
     * Order expired by system.
     * Common reasons: GTE_GTC order canceled when all positions closed.
     */
    EXPIRED = 'EXPIRED'
}

/**
 * Helper function to check if algo status is terminal.
 */
export function isAlgoTerminalStatus(status: AlgoOrderStatus): boolean {
    return [
        AlgoOrderStatus.CANCELLED,
        AlgoOrderStatus.FINISHED,
        AlgoOrderStatus.EXECUTED,
        AlgoOrderStatus.REJECTED,
        AlgoOrderStatus.EXPIRED
    ].includes(status);
}

/**
 * Helper function to check if algo order is active (pending trigger or triggered).
 */
export function isAlgoActiveStatus(status: AlgoOrderStatus): boolean {
    return [
        AlgoOrderStatus.NEW,
        AlgoOrderStatus.TRIGGERING,
        AlgoOrderStatus.TRIGGERED
    ].includes(status);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Algo Type
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Algo type enumeration.
 *
 * @remarks
 * Currently only CONDITIONAL is documented for stop/take-profit orders.
 * Additional types (TWAP, VP) may use different endpoints.
 */
export type AlgoType = 'CONDITIONAL';

// ═══════════════════════════════════════════════════════════════════════════════
// Raw WebSocket Event
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw ALGO_UPDATE event from Binance WebSocket (2024 API).
 *
 * @remarks
 * Field mapping:
 * - `caid`: Client Algo ID (new in 2024)
 * - `aid`: Algo ID (new in 2024, replaces `ai` in some contexts)
 * - `ai`: Order ID (only when triggered and in matching engine)
 * - `aq`: Executed quantity in matching engine (new in 2024)
 * - `ap`: Average fill price in matching engine (new in 2024)
 * - `act`: Actual order type (new in 2024)
 */
export interface AlgoOrderUpdateRaw {
    /** Event Type (always 'ALGO_UPDATE'). */
    e: 'ALGO_UPDATE';
    /** Event Time (milliseconds). */
    E: number;
    /** Transaction Time (milliseconds). */
    T: number;
    /** Order details object. */
    o: {
        // ─────────────────────────────────────────────────────────────────────
        // Identifiers
        // ─────────────────────────────────────────────────────────────────────

        /** @deprecated Internal algo marker (use `aid` instead). */
        am?: number;

        /** Algo Type (e.g., 'CONDITIONAL'). */
        at: AlgoType;

        /** Client Algo Order ID (user-provided). */
        c: string;

        /**
         * Client Algo ID (new 2024 field).
         * May be same as `c` or system-generated.
         */
        caid?: string;

        /**
         * Algo ID (new 2024 field).
         * Primary identifier for the algo order.
         */
        aid?: number;

        // ─────────────────────────────────────────────────────────────────────
        // Symbol and Order Details
        // ─────────────────────────────────────────────────────────────────────

        /** Trading symbol (e.g., 'BTCUSDT'). */
        s: string;

        /** Order side (BUY or SELL). */
        S: OrderSide;

        /** Order type (e.g., STOP_MARKET, TAKE_PROFIT). */
        o: OrderType;

        /** Original order type (for tracking). */
        ot: OrderType;

        /**
         * Actual order type (new 2024 field).
         * The order type that was placed in matching engine.
         */
        act?: OrderType;

        /** Position side (LONG, SHORT, BOTH). */
        ps: PositionSide;

        /** Time in force (GTC, IOC, etc.). */
        f: TimeInForce;

        // ─────────────────────────────────────────────────────────────────────
        // Quantities and Prices
        // ─────────────────────────────────────────────────────────────────────

        /** Original quantity. */
        q: string;

        /** Limit price (for limit orders). */
        p: string;

        /** Average fill price (from algo). */
        ap: string;

        /** Stop/trigger price. */
        sp: string;

        /** Activation price (TRAILING_STOP_MARKET only). */
        AP?: string;

        /** Callback rate (TRAILING_STOP_MARKET only). */
        cr?: string;

        /**
         * Executed quantity in matching engine (new 2024 field).
         * Only present when order is triggered and executing.
         */
        aq?: string;

        // ─────────────────────────────────────────────────────────────────────
        // Status and Flags
        // ─────────────────────────────────────────────────────────────────────

        /** Algo order status. */
        X: AlgoOrderStatus;

        /** Reduce only flag. */
        R: boolean;

        /** Close position flag. */
        cp: boolean;

        /** Price protection flag. */
        pP: boolean;

        /** Working type (MARK_PRICE or CONTRACT_PRICE). */
        wt: WorkingType;

        // ─────────────────────────────────────────────────────────────────────
        // Matching Engine Fields (only when triggered)
        // ─────────────────────────────────────────────────────────────────────

        /**
         * Order ID in matching engine.
         * Only available when order is triggered and placed.
         */
        i?: number;

        /**
         * Algo ID (original field, may be deprecated).
         * @see `aid` for new 2024 field.
         */
        ai: number;

        /** Last filled quantity. */
        l: string;

        /** Filled accumulated quantity. */
        z: string;

        /** Last filled price. */
        L: string;

        /** Commission amount. */
        n: string;

        /** Commission asset. */
        N: string;

        // ─────────────────────────────────────────────────────────────────────
        // Financials
        // ─────────────────────────────────────────────────────────────────────

        /** Realized profit. */
        rp: string;

        // ─────────────────────────────────────────────────────────────────────
        // Other Fields
        // ─────────────────────────────────────────────────────────────────────

        /** Down time (optional, internal). */
        d?: number;

        /** STP mode. */
        V: string;

        /** Price match mode. */
        pm: string;

        /** GTD auto cancel time. */
        gtd: number;

        /** Ignore field. */
        si: number;

        /** Ignore field. */
        ss: number;
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parsed Algo Order Update
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parsed Algo Order Update (clean interface).
 *
 * @remarks
 * This is the processed form of the ALGO_UPDATE WebSocket event.
 * All numeric strings are converted to numbers for easier use.
 */
export interface AlgoOrderUpdate {
    // ─────────────────────────────────────────────────────────────────────────
    // Identifiers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Algo ID (primary identifier).
     * Use this for tracking the conditional order lifecycle.
     */
    algoId: number;

    /**
     * Client Algo ID (user-provided or system-generated).
     */
    clientAlgoId: string;

    /** Trading symbol. */
    symbol: string;

    /**
     * Order ID in matching engine.
     * Only present after order is triggered and placed.
     */
    orderId?: number;

    // ─────────────────────────────────────────────────────────────────────────
    // Order Details
    // ─────────────────────────────────────────────────────────────────────────

    /** Algo type (e.g., 'CONDITIONAL'). */
    algoType: AlgoType;

    /** Order side. */
    side: OrderSide;

    /** Order type (e.g., STOP_MARKET, TAKE_PROFIT). */
    orderType: OrderType;

    /**
     * Actual order type placed in matching engine.
     * May differ from orderType when triggered.
     */
    actualOrderType?: OrderType;

    /** Time in force. */
    timeInForce: TimeInForce;

    /** Position side. */
    positionSide: PositionSide;

    /** Working type for trigger condition. */
    workingType: WorkingType;

    // ─────────────────────────────────────────────────────────────────────────
    // Quantities
    // ─────────────────────────────────────────────────────────────────────────

    /** Original quantity. */
    quantity: number;

    /** Filled quantity (accumulated). */
    filledQuantity: number;

    /** Last filled quantity. */
    lastFilledQuantity: number;

    /**
     * Executed quantity in matching engine.
     * Only present when triggered.
     */
    matchingEngineQuantity?: number;

    // ─────────────────────────────────────────────────────────────────────────
    // Prices
    // ─────────────────────────────────────────────────────────────────────────

    /** Limit price (for limit orders). */
    price: number;

    /** Stop/trigger price. */
    stopPrice: number;

    /** Average fill price. */
    averagePrice: number;

    /** Last filled price. */
    lastFilledPrice: number;

    /** Activation price (TRAILING_STOP_MARKET only). */
    activationPrice?: number;

    /** Callback rate percentage (TRAILING_STOP_MARKET only). */
    callbackRate?: number;

    // ─────────────────────────────────────────────────────────────────────────
    // Status
    // ─────────────────────────────────────────────────────────────────────────

    /** Current algo status. */
    status: AlgoOrderStatus;

    // ─────────────────────────────────────────────────────────────────────────
    // Flags
    // ─────────────────────────────────────────────────────────────────────────

    /** Reduce only flag. */
    isReduceOnly: boolean;

    /** Close position flag. */
    isClosePosition: boolean;

    /** Price protection flag. */
    priceProtection: boolean;

    // ─────────────────────────────────────────────────────────────────────────
    // Financials
    // ─────────────────────────────────────────────────────────────────────────

    /** Commission amount. */
    commission: number;

    /** Commission asset. */
    commissionAsset: string;

    /** Realized profit. */
    realizedProfit: number;

    // ─────────────────────────────────────────────────────────────────────────
    // Timestamps
    // ─────────────────────────────────────────────────────────────────────────

    /** Event time (milliseconds). */
    eventTime: number;

    /** Transaction time (milliseconds). */
    transactionTime: number;

    /** GTD auto cancel time (if applicable). */
    goodTillDate?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parser
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse raw ALGO_UPDATE to clean AlgoOrderUpdate.
 *
 * @param raw - Raw WebSocket event
 * @returns Parsed AlgoOrderUpdate
 *
 * @example
 * ```typescript
 * websocket.on('message', (event) => {
 *     const parsed = JSON.parse(event);
 *     if (parsed.e === 'ALGO_UPDATE') {
 *         const algoOrder = parseAlgoOrderUpdate(parsed);
 *         console.log(`Algo ${algoOrder.algoId}: ${algoOrder.status}`);
 *     }
 * });
 * ```
 */
export function parseAlgoOrderUpdate(raw: AlgoOrderUpdateRaw): AlgoOrderUpdate {
    const o = raw.o;

    return {
        // Identifiers (prefer new `aid` field, fallback to `ai`)
        algoId: o.aid ?? o.ai,
        clientAlgoId: o.caid ?? o.c,
        symbol: o.s,
        orderId: o.i,

        // Order Details
        algoType: o.at,
        side: o.S,
        orderType: o.o,
        actualOrderType: o.act,
        timeInForce: o.f,
        positionSide: o.ps,
        workingType: o.wt,

        // Quantities
        quantity: parseFloat(o.q),
        filledQuantity: parseFloat(o.z),
        lastFilledQuantity: parseFloat(o.l),
        matchingEngineQuantity: o.aq ? parseFloat(o.aq) : undefined,

        // Prices
        price: parseFloat(o.p),
        stopPrice: parseFloat(o.sp),
        averagePrice: parseFloat(o.ap),
        lastFilledPrice: parseFloat(o.L),
        activationPrice: o.AP ? parseFloat(o.AP) : undefined,
        callbackRate: o.cr ? parseFloat(o.cr) : undefined,

        // Status
        status: o.X,

        // Flags
        isReduceOnly: o.R,
        isClosePosition: o.cp,
        priceProtection: o.pP,

        // Financials
        commission: parseFloat(o.n),
        commissionAsset: o.N,
        realizedProfit: parseFloat(o.rp),

        // Timestamps
        eventTime: raw.E,
        transactionTime: raw.T,
        goodTillDate: o.gtd > 0 ? o.gtd : undefined
    };
}

