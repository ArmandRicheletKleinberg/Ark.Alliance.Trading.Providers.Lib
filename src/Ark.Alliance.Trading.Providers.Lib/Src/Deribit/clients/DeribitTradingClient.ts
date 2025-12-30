/**
 * @fileoverview Deribit Trading Client
 * @module Deribit/clients/DeribitTradingClient
 *
 * Core trading operations client for Deribit API.
 * Handles order placement, modification, cancellation, and position management.
 *
 * @remarks
 * This client provides methods equivalent to Binance's BinanceRestClient
 * but adapted for Deribit's JSON-RPC API.
 */

import { EventEmitter } from 'events';
import { Result } from '../../Common/result';
import { DeribitJsonRpcClient, DeribitClientConfig } from './DeribitJsonRpcClient';
import {
    OrderRequest,
    DeribitOrder,
    DeribitTrade,
    OrderPlacementResponse,
    EditOrderRequest,
    CancelAllRequest,
    ClosePositionRequest,
    DeribitPosition,
    DeribitAccountSummary
} from '../dtos';
import { METHODS } from '../shared';
import { Direction, InstrumentKind } from '../enums';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Margin mode configuration.
 */
export interface MarginModeConfig {
    /** Currency to change margin mode for */
    currency: string;
    /** Margin mode: 'cross' or 'isolated' */
    mode: 'cross' | 'isolated';
}

/**
 * Leverage configuration.
 */
export interface LeverageConfig {
    /** Currency to change leverage for */
    currency: string;
    /** Leverage value */
    leverage: number;
}

/**
 * Settlement history entry.
 */
export interface Settlement {
    type: string;
    timestamp: number;
    session_profit_loss: number;
    profit_loss: number;
    position: number;
    mark_price: number;
    instrument_name: string;
    index_price: number;
    funding: number;
}

/**
 * User trade history entry.
 */
export interface UserTrade {
    trade_id: string;
    trade_seq: number;
    timestamp: number;
    tick_direction: number;
    state: string;
    self_trade: boolean;
    reduce_only: boolean;
    profit_loss: number;
    price: number;
    post_only: boolean;
    order_type: string;
    order_id: string;
    matching_id: string | null;
    mark_price: number;
    liquidity: 'M' | 'T';
    label: string;
    instrument_name: string;
    index_price: number;
    fee_currency: string;
    fee: number;
    direction: Direction;
    amount: number;
}

/**
 * Order history query parameters.
 */
export interface OrderHistoryParams {
    instrument_name?: string;
    currency?: string;
    kind?: InstrumentKind;
    count?: number;
    offset?: number;
    include_old?: boolean;
    include_unfilled?: boolean;
}

/**
 * Trade history query parameters.
 */
export interface TradeHistoryParams {
    instrument_name?: string;
    currency?: string;
    kind?: InstrumentKind;
    count?: number;
    start_timestamp?: number;
    end_timestamp?: number;
    sorting?: 'asc' | 'desc';
}

// ═══════════════════════════════════════════════════════════════════════════════
// DeribitTradingClient
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deribit trading client for order and position management.
 *
 * @remarks
 * Provides a high-level API for trading operations:
 * - Order operations: buy, sell, edit, cancel
 * - Position operations: close, get, get all
 * - Account operations: leverage, margins
 * - History: order history, trade history, settlements
 *
 * @example
 * ```typescript
 * const client = new DeribitTradingClient(config);
 * await client.connect();
 *
 * // Place a limit buy order
 * const result = await client.buy({
 *     instrument_name: 'BTC-PERPETUAL',
 *     amount: 100,
 *     type: 'limit',
 *     price: 40000
 * });
 *
 * // Close position
 * await client.closePosition({
 *     instrument_name: 'BTC-PERPETUAL',
 *     type: 'market'
 * });
 * ```
 */
export class DeribitTradingClient extends EventEmitter {
    private client: DeribitJsonRpcClient;

    constructor(config: DeribitClientConfig) {
        super();
        this.client = new DeribitJsonRpcClient(config);

        // Forward connection events
        this.client.on('connected', () => this.emit('connected'));
        this.client.on('disconnected', () => this.emit('disconnected'));
        this.client.on('reconnecting', (data) => this.emit('reconnecting', data));
        this.client.on('error', (error) => this.emit('error', error));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Connection
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Connect and authenticate.
     */
    async connect(): Promise<Result<void>> {
        return this.client.connect();
    }

    /**
     * Disconnect from Deribit.
     */
    async disconnect(): Promise<Result<void>> {
        return this.client.disconnect();
    }

    /**
     * Check if connected.
     */
    isConnected(): boolean {
        return this.client.isConnected();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Order Operations
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Place a buy order.
     *
     * @param params - Order parameters
     * @returns Result containing order and any immediate trades
     */
    async buy(params: OrderRequest): Promise<Result<OrderPlacementResponse>> {
        const result = await this.client.call<OrderPlacementResponse>(
            METHODS.BUY,
            this.buildOrderParams(params)
        );

        if (result.success && result.data) {
            this.emit('orderPlaced', {
                order: result.data.order,
                trades: result.data.trades,
                side: Direction.BUY
            });
        }

        return result;
    }

    /**
     * Place a sell order.
     *
     * @param params - Order parameters
     * @returns Result containing order and any immediate trades
     */
    async sell(params: OrderRequest): Promise<Result<OrderPlacementResponse>> {
        const result = await this.client.call<OrderPlacementResponse>(
            METHODS.SELL,
            this.buildOrderParams(params)
        );

        if (result.success && result.data) {
            this.emit('orderPlaced', {
                order: result.data.order,
                trades: result.data.trades,
                side: Direction.SELL
            });
        }

        return result;
    }

    /**
     * Edit an existing order.
     *
     * @param params - Edit parameters with order_id
     * @returns Result containing updated order
     */
    async editOrder(params: EditOrderRequest): Promise<Result<DeribitOrder>> {
        const result = await this.client.call<{ order: DeribitOrder }>(
            METHODS.EDIT_ORDER,
            params as unknown as Record<string, unknown>
        );

        if (result.success && result.data) {
            this.emit('orderEdited', result.data.order);
            return Result.ok(result.data.order);
        }

        return Result.fail<DeribitOrder>({
            code: 'EDIT_FAILED',
            message: result.reason || 'Failed to edit order',
            timestamp: Date.now()
        });
    }

    /**
     * Cancel an order by order ID.
     *
     * @param orderId - The order ID to cancel
     * @returns Result containing cancelled order details
     */
    async cancelOrder(orderId: string): Promise<Result<DeribitOrder>> {
        const result = await this.client.call<DeribitOrder>(
            METHODS.CANCEL_ORDER,
            { order_id: orderId }
        );

        if (result.success && result.data) {
            this.emit('orderCancelled', result.data);
        }

        return result;
    }

    /**
     * Cancel all open orders.
     *
     * @param params - Optional filter parameters
     * @returns Result containing number of cancelled orders
     */
    async cancelAllOrders(params?: CancelAllRequest): Promise<Result<number>> {
        const method = params?.instrument_name
            ? METHODS.CANCEL_ALL_BY_INSTRUMENT
            : params?.currency
                ? METHODS.CANCEL_ALL_BY_CURRENCY
                : METHODS.CANCEL_ALL;

        const result = await this.client.call<number>(method, (params || {}) as Record<string, unknown>);

        if (result.success && result.data !== undefined) {
            this.emit('allOrdersCancelled', {
                count: result.data,
                filter: params
            });
        }

        return result;
    }

    /**
     * Cancel all orders by label.
     *
     * @param label - Order label to match
     * @param currency - Optional currency filter
     * @returns Result containing number of cancelled orders
     */
    async cancelByLabel(label: string, currency?: string): Promise<Result<number>> {
        return this.client.call<number>(
            METHODS.CANCEL_BY_LABEL,
            { label, currency }
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Position Operations
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Close a position.
     *
     * @param params - Close position parameters
     * @returns Result containing closing order and trades
     */
    async closePosition(params: ClosePositionRequest): Promise<Result<OrderPlacementResponse>> {
        const result = await this.client.call<OrderPlacementResponse>(
            METHODS.CLOSE_POSITION,
            params as unknown as Record<string, unknown>
        );

        if (result.success && result.data) {
            this.emit('positionClosed', {
                instrument: params.instrument_name,
                order: result.data.order,
                trades: result.data.trades
            });
        }

        return result;
    }

    /**
     * Get position for an instrument.
     *
     * @param instrumentName - The instrument to get position for
     * @returns Result containing position details
     */
    async getPosition(instrumentName: string): Promise<Result<DeribitPosition>> {
        return this.client.call<DeribitPosition>(
            METHODS.GET_POSITION,
            { instrument_name: instrumentName }
        );
    }

    /**
     * Get all positions for a currency.
     *
     * @param currency - Currency to filter by (e.g., 'BTC', 'ETH')
     * @param kind - Optional instrument kind filter
     * @returns Result containing array of positions
     */
    async getPositions(
        currency: string,
        kind?: InstrumentKind
    ): Promise<Result<DeribitPosition[]>> {
        const params: Record<string, unknown> = { currency };
        if (kind) {
            params.kind = kind;
        }

        return this.client.call<DeribitPosition[]>(
            METHODS.GET_POSITIONS,
            params
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Account Operations
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get account summary for a currency.
     *
     * @param currency - Currency (e.g., 'BTC', 'ETH')
     * @param extended - Include extended information
     * @returns Result containing account summary
     */
    async getAccountSummary(
        currency: string,
        extended: boolean = true
    ): Promise<Result<DeribitAccountSummary>> {
        return this.client.call<DeribitAccountSummary>(
            METHODS.GET_ACCOUNT_SUMMARY,
            { currency, extended }
        );
    }

    /**
     * Set leverage for a currency.
     *
     * @param currency - Currency to set leverage for
     * @param leverage - Leverage value
     * @returns Result indicating success
     */
    async setLeverage(currency: string, leverage: number): Promise<Result<void>> {
        const result = await this.client.call<{ leverage: number }>(
            'private/set_leverage',
            { currency, leverage }
        );

        if (result.success) {
            this.emit('leverageChanged', { currency, leverage });
            return Result.Success;
        }

        return Result.Failure.withReason(result.reason || 'Failed to set leverage');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Order Queries
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get open orders.
     *
     * @param instrumentName - Optional instrument filter
     * @returns Result containing array of open orders
     */
    async getOpenOrders(instrumentName?: string): Promise<Result<DeribitOrder[]>> {
        if (instrumentName) {
            return this.client.call<DeribitOrder[]>(
                METHODS.GET_OPEN_ORDERS_BY_INSTRUMENT,
                { instrument_name: instrumentName }
            );
        }

        return this.client.call<DeribitOrder[]>(
            METHODS.GET_OPEN_ORDERS,
            {}
        );
    }

    /**
     * Get open orders by currency.
     *
     * @param currency - Currency to filter by
     * @param kind - Optional instrument kind filter
     * @returns Result containing array of open orders
     */
    async getOpenOrdersByCurrency(
        currency: string,
        kind?: InstrumentKind
    ): Promise<Result<DeribitOrder[]>> {
        const params: Record<string, unknown> = { currency };
        if (kind) {
            params.kind = kind;
        }

        return this.client.call<DeribitOrder[]>(
            METHODS.GET_OPEN_ORDERS_BY_CURRENCY,
            params
        );
    }

    /**
     * Get order state by ID.
     *
     * @param orderId - The order ID
     * @returns Result containing order details
     */
    async getOrder(orderId: string): Promise<Result<DeribitOrder>> {
        return this.client.call<DeribitOrder>(
            METHODS.GET_ORDER_STATE,
            { order_id: orderId }
        );
    }

    /**
     * Get order history.
     *
     * @param params - History query parameters
     * @returns Result containing array of historical orders
     */
    async getOrderHistory(params: OrderHistoryParams): Promise<Result<DeribitOrder[]>> {
        const method = params.instrument_name
            ? 'private/get_order_history_by_instrument'
            : 'private/get_order_history_by_currency';

        return this.client.call<DeribitOrder[]>(method, params as unknown as Record<string, unknown>);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Trade History
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get user trade history.
     *
     * @param params - Trade history query parameters
     * @returns Result containing array of trades
     */
    async getTradeHistory(params: TradeHistoryParams): Promise<Result<{ trades: UserTrade[]; has_more: boolean }>> {
        const method = params.instrument_name
            ? 'private/get_user_trades_by_instrument'
            : 'private/get_user_trades_by_currency';

        return this.client.call<{ trades: UserTrade[]; has_more: boolean }>(method, params as unknown as Record<string, unknown>);
    }

    /**
     * Get settlement history.
     *
     * @param currency - Currency to get settlements for
     * @param count - Number of settlements to return
     * @returns Result containing array of settlements
     */
    async getSettlementHistory(
        currency: string,
        count: number = 20
    ): Promise<Result<{ settlements: Settlement[]; continuation: string }>> {
        return this.client.call<{ settlements: Settlement[]; continuation: string }>(
            'private/get_settlement_history_by_currency',
            { currency, count }
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Build order parameters for API call.
     */
    private buildOrderParams(params: OrderRequest): Record<string, unknown> {
        const apiParams: Record<string, unknown> = {
            instrument_name: params.instrument_name,
            amount: params.amount
        };

        if (params.type) apiParams.type = params.type;
        if (params.price !== undefined) apiParams.price = params.price;
        if (params.trigger_price !== undefined) apiParams.trigger_price = params.trigger_price;
        if (params.time_in_force) apiParams.time_in_force = params.time_in_force;
        if (params.reduce_only !== undefined) apiParams.reduce_only = params.reduce_only;
        if (params.post_only !== undefined) apiParams.post_only = params.post_only;
        if (params.reject_post_only !== undefined) apiParams.reject_post_only = params.reject_post_only;
        if (params.label) apiParams.label = params.label;
        if (params.max_show !== undefined) apiParams.max_show = params.max_show;
        if (params.trigger) apiParams.trigger = params.trigger;
        if (params.advanced) apiParams.advanced = params.advanced;
        if (params.valid_until !== undefined) apiParams.valid_until = params.valid_until;

        return apiParams;
    }

    /**
     * Get underlying JSON-RPC client for advanced operations.
     */
    getBaseClient(): DeribitJsonRpcClient {
        return this.client;
    }
}
