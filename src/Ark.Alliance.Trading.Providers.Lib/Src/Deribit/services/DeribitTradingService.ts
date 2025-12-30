/**
 * @fileoverview Deribit Trading Service
 * @module Deribit/services/DeribitTradingService
 *
 * Provider-specific implementation of ITradingService for Deribit.
 *
 * @remarks
 * This service provides a unified trading API that wraps DeribitTradingClient.
 * It requires authentication for all operations.
 */

import { EventEmitter } from 'events';
import { Result, ResultStatus } from '../../Common/result';
import { IOrder, IPosition, OrderSide, OrderType, TimeInForce } from '../../Common/Domain';
import { ProviderType } from '../../Common/Clients/Base';
import {
    ITradingService,
    PlaceOrderParams,
    CancelOrderParams,
    CancelAllOrdersParams,
    ClosePositionParams
} from '../../Services/ITradingService';
import { DeribitEnvironment } from '../enums';
import { DeribitTradingClient, DeribitClientConfig } from '../clients';
import { Direction, DeribitOrderType, DeribitTimeInForce } from '../enums';
import {
    mapDeribitOrderToIOrder,
    mapDeribitOrdersToIOrders,
    mapDeribitPositionToIPosition,
    mapDeribitPositionsToIPositions
} from '../mappers';
import { OrderRequest } from '../dtos';

/**
 * Deribit trading service configuration.
 */
export interface DeribitTradingServiceConfig {
    /**
     * API key (Deribit Client ID).
     */
    apiKey: string;

    /**
     * API secret (Deribit Client Secret).
     */
    apiSecret: string;

    /**
     * Environment (TESTNET or MAINNET).
     */
    environment: DeribitEnvironment;

    /**
     * Default currency for operations (e.g., 'BTC', 'ETH').
     */
    defaultCurrency?: 'BTC' | 'ETH' | 'SOL' | 'USDC';

    /**
     * Enable debug logging.
     */
    debug?: boolean;
}

/**
 * Helper to create a NOT_IMPLEMENTED result.
 */
function notImplemented<T>(method: string): Result<T> {
    return Result.fail<T>({
        code: 'NOT_IMPLEMENTED',
        message: `${method} not yet implemented`,
        timestamp: Date.now()
    }, ResultStatus.NOT_IMPLEMENTED);
}

/**
 * Common error result for not connected state.
 */
function notConnected<T>(): Result<T> {
    return Result.fail<T>({
        code: 'NOT_CONNECTED',
        message: 'Service not connected',
        timestamp: Date.now()
    });
}

/**
 * Deribit implementation of ITradingService.
 *
 * @example
 * ```typescript
 * const service = new DeribitTradingService({
 *     apiKey: '...',
 *     apiSecret: '...',
 *     environment: DeribitEnvironment.TESTNET
 * });
 *
 * await service.connect();
 *
 * const result = await service.placeOrder({
 *     instrument: 'BTC-PERPETUAL',
 *     side: OrderSide.BUY,
 *     type: OrderType.LIMIT,
 *     quantity: '100',
 *     price: '40000'
 * });
 * ```
 */
export class DeribitTradingService implements ITradingService {
    readonly provider = ProviderType.DERIBIT;

    private readonly eventEmitter: EventEmitter;
    private readonly config: DeribitTradingServiceConfig;
    private client: DeribitTradingClient | null = null;

    constructor(config: DeribitTradingServiceConfig) {
        this.config = config;
        this.eventEmitter = new EventEmitter();
    }

    get isConnected(): boolean {
        return this.client?.isConnected() ?? false;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Lifecycle
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Connect and authenticate with Deribit.
     */
    async connect(): Promise<Result<void>> {
        try {
            const clientConfig: DeribitClientConfig = {
                credentials: {
                    clientId: this.config.apiKey,
                    clientSecret: this.config.apiSecret
                },
                environment: this.config.environment,
                debug: this.config.debug
            };

            this.client = new DeribitTradingClient(clientConfig);
            return await this.client.connect();
        } catch (error) {
            return Result.fail<void>({
                code: 'CONNECTION_ERROR',
                message: error instanceof Error ? error.message : 'Failed to connect',
                timestamp: Date.now()
            });
        }
    }

    /**
     * Disconnect from Deribit.
     */
    async disconnect(): Promise<Result<void>> {
        if (this.client) {
            const result = await this.client.disconnect();
            this.client = null;
            return result;
        }
        return Result.ok<void>(undefined);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Orders
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Place an order.
     *
     * @param params - Order parameters
     * @returns The placed order
     */
    async placeOrder(params: PlaceOrderParams): Promise<Result<IOrder>> {
        if (!this.client) return notConnected<IOrder>();

        // Build Deribit order request
        const orderRequest: OrderRequest = {
            instrument_name: params.instrument,
            amount: parseFloat(params.quantity),
            type: this.mapOrderType(params.type),
            price: params.price ? parseFloat(params.price) : undefined,
            time_in_force: params.timeInForce ? this.mapTimeInForce(params.timeInForce) : undefined,
            reduce_only: params.reduceOnly,
            post_only: params.postOnly,
            label: params.clientOrderId
        };

        // Call buy or sell based on side
        const result = params.side === OrderSide.BUY
            ? await this.client.buy(orderRequest)
            : await this.client.sell(orderRequest);

        if (!result.isSuccess || !result.data) {
            return Result.fail<IOrder>(result.error ?? {
                code: 'ORDER_FAILED',
                message: 'Failed to place order',
                timestamp: Date.now()
            });
        }

        return Result.ok(mapDeribitOrderToIOrder(result.data.order));
    }

    /**
     * Cancel an order.
     *
     * @param params - Cancel parameters with orderId
     * @returns The cancelled order
     */
    async cancelOrder(params: CancelOrderParams): Promise<Result<IOrder>> {
        if (!this.client) return notConnected<IOrder>();

        const result = await this.client.cancelOrder(params.orderId);

        if (!result.isSuccess || !result.data) {
            return Result.fail<IOrder>(result.error ?? {
                code: 'CANCEL_FAILED',
                message: 'Failed to cancel order',
                timestamp: Date.now()
            });
        }

        return Result.ok(mapDeribitOrderToIOrder(result.data));
    }

    /**
     * Cancel all open orders.
     *
     * @param params - Optional filter parameters
     * @returns Number of orders cancelled
     */
    async cancelAllOrders(params?: CancelAllOrdersParams): Promise<Result<number>> {
        if (!this.client) return notConnected<number>();

        const result = await this.client.cancelAllOrders(
            params?.instrument ? { instrument_name: params.instrument } : undefined
        );

        if (!result.isSuccess) {
            return Result.fail<number>(result.error ?? {
                code: 'CANCEL_ALL_FAILED',
                message: 'Failed to cancel all orders',
                timestamp: Date.now()
            });
        }

        return Result.ok(result.data ?? 0);
    }

    /**
     * Get order by ID.
     *
     * @param orderId - The order ID
     * @returns Order details
     */
    async getOrder(orderId: string): Promise<Result<IOrder>> {
        if (!this.client) return notConnected<IOrder>();

        const result = await this.client.getOrder(orderId);

        if (!result.isSuccess || !result.data) {
            return Result.fail<IOrder>(result.error ?? {
                code: 'ORDER_NOT_FOUND',
                message: 'Order not found',
                timestamp: Date.now()
            });
        }

        return Result.ok(mapDeribitOrderToIOrder(result.data));
    }

    /**
     * Get open orders.
     *
     * @param instrument - Optional instrument filter
     * @returns Array of open orders
     */
    async getOpenOrders(instrument?: string): Promise<Result<IOrder[]>> {
        if (!this.client) return notConnected<IOrder[]>();

        const result = await this.client.getOpenOrders(instrument);

        if (!result.isSuccess || !result.data) {
            return Result.fail<IOrder[]>(result.error ?? {
                code: 'GET_ORDERS_FAILED',
                message: 'Failed to get open orders',
                timestamp: Date.now()
            });
        }

        return Result.ok(mapDeribitOrdersToIOrders(result.data));
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Positions
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Get position for an instrument.
     *
     * @param instrument - Instrument name
     * @returns Position details
     */
    async getPosition(instrument: string): Promise<Result<IPosition>> {
        if (!this.client) return notConnected<IPosition>();

        const result = await this.client.getPosition(instrument);

        if (!result.isSuccess || !result.data) {
            return Result.fail<IPosition>(result.error ?? {
                code: 'POSITION_NOT_FOUND',
                message: 'Position not found',
                timestamp: Date.now()
            });
        }

        return Result.ok(mapDeribitPositionToIPosition(result.data));
    }

    /**
     * Get all positions.
     *
     * @returns Array of positions
     */
    async getPositions(): Promise<Result<IPosition[]>> {
        if (!this.client) return notConnected<IPosition[]>();

        const currency = this.config.defaultCurrency ?? 'BTC';
        const result = await this.client.getPositions(currency);

        if (!result.isSuccess || !result.data) {
            return Result.fail<IPosition[]>(result.error ?? {
                code: 'GET_POSITIONS_FAILED',
                message: 'Failed to get positions',
                timestamp: Date.now()
            });
        }

        return Result.ok(mapDeribitPositionsToIPositions(result.data));
    }

    /**
     * Close a position.
     *
     * @param params - Close position parameters
     * @returns The closing order
     */
    async closePosition(params: ClosePositionParams): Promise<Result<IOrder>> {
        if (!this.client) return notConnected<IOrder>();

        const result = await this.client.closePosition({
            instrument_name: params.instrument,
            type: params.type === OrderType.MARKET ? 'market' : 'limit',
            price: params.price ? parseFloat(params.price) : undefined
        });

        if (!result.isSuccess || !result.data) {
            return Result.fail<IOrder>(result.error ?? {
                code: 'CLOSE_POSITION_FAILED',
                message: 'Failed to close position',
                timestamp: Date.now()
            });
        }

        return Result.ok(mapDeribitOrderToIOrder(result.data.order));
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Register callback for order updates.
     */
    onOrderUpdate(callback: (order: IOrder) => void): void {
        this.eventEmitter.on('orderUpdate', callback);
    }

    /**
     * Register callback for position updates.
     */
    onPositionUpdate(callback: (position: IPosition) => void): void {
        this.eventEmitter.on('positionUpdate', callback);
    }

    /**
     * Remove all event listeners.
     */
    removeAllListeners(): void {
        this.eventEmitter.removeAllListeners();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Private Helpers
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Map common OrderType to Deribit order type.
     */
    private mapOrderType(type: OrderType): DeribitOrderType {
        switch (type) {
            case OrderType.MARKET:
                return DeribitOrderType.MARKET;
            case OrderType.LIMIT:
                return DeribitOrderType.LIMIT;
            case OrderType.STOP_MARKET:
                return DeribitOrderType.STOP_MARKET;
            case OrderType.STOP_LIMIT:
                return DeribitOrderType.STOP_LIMIT;
            case OrderType.TAKE_PROFIT_MARKET:
                return DeribitOrderType.TAKE_MARKET;
            case OrderType.TAKE_PROFIT_LIMIT:
                return DeribitOrderType.TAKE_LIMIT;
            default:
                return DeribitOrderType.LIMIT;
        }
    }

    /**
     * Map common TimeInForce to Deribit time in force.
     */
    private mapTimeInForce(tif: TimeInForce): DeribitTimeInForce {
        switch (tif) {
            case TimeInForce.GTC:
                return DeribitTimeInForce.GOOD_TIL_CANCELLED;
            case TimeInForce.IOC:
                return DeribitTimeInForce.IMMEDIATE_OR_CANCEL;
            case TimeInForce.FOK:
                return DeribitTimeInForce.FILL_OR_KILL;
            default:
                return DeribitTimeInForce.GOOD_TIL_CANCELLED;
        }
    }
}
