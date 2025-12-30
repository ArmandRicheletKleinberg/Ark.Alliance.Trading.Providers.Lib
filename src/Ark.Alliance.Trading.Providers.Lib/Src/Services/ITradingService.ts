/**
 * @fileoverview Trading Service Interface
 * @module Services/ITradingService
 *
 * Provider-agnostic trading service interface that abstracts
 * trading operations across different exchange providers.
 */

import { Result } from '../Common/result';
import { IOrder, IPosition, OrderSide, OrderType, TimeInForce } from '../Common/Domain';
import { ProviderType } from '../Common/Clients/Base';

/**
 * Order placement parameters.
 */
export interface PlaceOrderParams {
    /**
     * Instrument/symbol to trade.
     */
    instrument: string;

    /**
     * Order side (BUY or SELL).
     */
    side: OrderSide;

    /**
     * Order type.
     */
    type: OrderType;

    /**
     * Order quantity.
     */
    quantity: string;

    /**
     * Limit price (required for limit orders).
     */
    price?: string;

    /**
     * Stop/trigger price (for stop orders).
     */
    stopPrice?: string;

    /**
     * Time in force.
     */
    timeInForce?: TimeInForce;

    /**
     * Whether order should only reduce position.
     */
    reduceOnly?: boolean;

    /**
     * Whether order is post-only (maker only).
     */
    postOnly?: boolean;

    /**
     * Client order ID for tracking.
     */
    clientOrderId?: string;

    /**
     * Order label (Deribit-specific).
     */
    label?: string;
}

/**
 * Order cancellation parameters.
 */
export interface CancelOrderParams {
    /**
     * Order ID to cancel.
     */
    orderId: string;

    /**
     * Instrument (may be required by some providers).
     */
    instrument?: string;
}

/**
 * Cancel all orders parameters.
 */
export interface CancelAllOrdersParams {
    /**
     * Cancel only for specific instrument.
     */
    instrument?: string;

    /**
     * Cancel only for specific side.
     */
    side?: OrderSide;
}

/**
 * Close position parameters.
 */
export interface ClosePositionParams {
    /**
     * Instrument to close position for.
     */
    instrument: string;

    /**
     * Whether to close at market or limit.
     */
    type: 'MARKET' | 'LIMIT';

    /**
     * Limit price if closing with limit order.
     */
    price?: string;
}

/**
 * Trading service interface.
 *
 * @remarks
 * This interface provides a provider-agnostic API for trading operations.
 * Implementations handle provider-specific details internally.
 *
 * @example
 * ```typescript
 * const service = TradingServiceFactory.create(ProviderType.BINANCE, config);
 * await service.connect();
 *
 * const order = await service.placeOrder({
 *     instrument: 'BTCUSDT',
 *     side: OrderSide.BUY,
 *     type: OrderType.LIMIT,
 *     quantity: '0.01',
 *     price: '50000'
 * });
 * ```
 */
export interface ITradingService {
    /**
     * Provider type.
     */
    readonly provider: ProviderType;

    /**
     * Whether the service is connected.
     */
    readonly isConnected: boolean;

    // ═══════════════════════════════════════════════════════════════════════════
    // Lifecycle
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Connect to the provider.
     */
    connect(): Promise<Result<void>>;

    /**
     * Disconnect from the provider.
     */
    disconnect(): Promise<Result<void>>;

    // ═══════════════════════════════════════════════════════════════════════════
    // Orders
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Place a new order.
     */
    placeOrder(params: PlaceOrderParams): Promise<Result<IOrder>>;

    /**
     * Cancel an existing order.
     */
    cancelOrder(params: CancelOrderParams): Promise<Result<IOrder>>;

    /**
     * Cancel all open orders.
     */
    cancelAllOrders(params?: CancelAllOrdersParams): Promise<Result<number>>;

    /**
     * Get order by ID.
     */
    getOrder(orderId: string): Promise<Result<IOrder>>;

    /**
     * Get all open orders.
     */
    getOpenOrders(instrument?: string): Promise<Result<IOrder[]>>;

    // ═══════════════════════════════════════════════════════════════════════════
    // Positions
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get position for an instrument.
     */
    getPosition(instrument: string): Promise<Result<IPosition>>;

    /**
     * Get all positions.
     */
    getPositions(): Promise<Result<IPosition[]>>;

    /**
     * Close a position.
     */
    closePosition(params: ClosePositionParams): Promise<Result<IOrder>>;

    // ═══════════════════════════════════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Subscribe to order updates.
     */
    onOrderUpdate(callback: (order: IOrder) => void): void;

    /**
     * Subscribe to position updates.
     */
    onPositionUpdate(callback: (position: IPosition) => void): void;

    /**
     * Remove all event listeners.
     */
    removeAllListeners(): void;
}
