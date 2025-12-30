/**
 * @fileoverview Provider-Agnostic Order Interface
 * @module Common/Domain/IOrder
 *
 * Defines the common order interface that all provider-specific
 * order implementations must conform to.
 */

/**
 * Normalized order side enum.
 */
export enum OrderSide {
    BUY = 'BUY',
    SELL = 'SELL'
}

/**
 * Normalized order type enum.
 */
export enum OrderType {
    MARKET = 'MARKET',
    LIMIT = 'LIMIT',
    STOP_MARKET = 'STOP_MARKET',
    STOP_LIMIT = 'STOP_LIMIT',
    TAKE_PROFIT_MARKET = 'TAKE_PROFIT_MARKET',
    TAKE_PROFIT_LIMIT = 'TAKE_PROFIT_LIMIT',
    TRAILING_STOP_MARKET = 'TRAILING_STOP_MARKET'
}

/**
 * Normalized order status enum.
 */
export enum OrderStatus {
    NEW = 'NEW',
    PARTIALLY_FILLED = 'PARTIALLY_FILLED',
    FILLED = 'FILLED',
    CANCELED = 'CANCELED',
    REJECTED = 'REJECTED',
    EXPIRED = 'EXPIRED',
    PENDING = 'PENDING'
}

/**
 * Normalized time in force enum.
 */
export enum TimeInForce {
    GTC = 'GTC',  // Good Till Cancel
    IOC = 'IOC',  // Immediate Or Cancel
    FOK = 'FOK',  // Fill Or Kill
    GTD = 'GTD'   // Good Till Date
}

/**
 * Provider-agnostic order interface.
 *
 * @remarks
 * This interface represents the common order properties across all providers.
 * Provider-specific properties are accessible via the `providerData` field
 * which can be type-narrowed based on the provider type.
 *
 * All numeric values are stored as strings to preserve precision.
 *
 * @example
 * ```typescript
 * function processOrder(order: IOrder) {
 *     console.log(`Order ${order.orderId} for ${order.instrument}: ${order.side} ${order.quantity}`);
 *
 *     // Access provider-specific data with type narrowing
 *     if (order.provider === ProviderType.BINANCE) {
 *         const binanceOrder = order as BinanceOrder;
 *         console.log(`Position Side: ${binanceOrder.providerData.positionSide}`);
 *     }
 * }
 * ```
 */
export interface IOrder {
    /**
     * Order ID (string for all providers).
     * @remarks Binance uses numeric IDs converted to string,
     * Deribit uses string IDs natively (e.g., "ETH-584849853").
     */
    readonly orderId: string;

    /**
     * Client order ID if provided.
     */
    readonly clientOrderId?: string;

    /**
     * Instrument/symbol name in provider-specific format.
     * @remarks Binance: "BTCUSDT", Deribit: "BTC-PERPETUAL"
     */
    readonly instrument: string;

    /**
     * Order side (BUY or SELL).
     */
    readonly side: OrderSide;

    /**
     * Order type.
     */
    readonly type: OrderType;

    /**
     * Order quantity as string for precision.
     */
    readonly quantity: string;

    /**
     * Filled quantity as string.
     */
    readonly filledQuantity: string;

    /**
     * Limit price (optional, for limit orders).
     */
    readonly price?: string;

    /**
     * Stop/trigger price (optional, for stop orders).
     */
    readonly stopPrice?: string;

    /**
     * Average fill price.
     */
    readonly averagePrice?: string;

    /**
     * Current order status.
     */
    readonly status: OrderStatus;

    /**
     * Time in force.
     */
    readonly timeInForce: TimeInForce;

    /**
     * Whether this is a reduce-only order.
     */
    readonly reduceOnly: boolean;

    /**
     * Whether this is a post-only order.
     */
    readonly postOnly: boolean;

    /**
     * Order creation timestamp (milliseconds).
     */
    readonly createdAt: number;

    /**
     * Last update timestamp (milliseconds).
     */
    readonly updatedAt: number;

    /**
     * Provider-specific data.
     * @remarks Use type narrowing to access provider-specific fields.
     */
    readonly providerData: unknown;
}

/**
 * Order update event data.
 */
export interface IOrderUpdate extends IOrder {
    /**
     * Type of update (e.g., 'NEW', 'TRADE', 'CANCELED').
     */
    readonly updateType: string;

    /**
     * Trade details if this update was due to a fill.
     */
    readonly lastFill?: {
        readonly price: string;
        readonly quantity: string;
        readonly fee: string;
        readonly feeCurrency: string;
    };
}

/**
 * Helper function to check if order is in terminal state.
 */
export function isTerminalOrderStatus(status: OrderStatus): boolean {
    return [
        OrderStatus.FILLED,
        OrderStatus.CANCELED,
        OrderStatus.REJECTED,
        OrderStatus.EXPIRED
    ].includes(status);
}

/**
 * Helper function to get opposite side.
 */
export function getOppositeSide(side: OrderSide): OrderSide {
    return side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY;
}
