/**
 * @fileoverview Kraken Trading Service
 * @module Kraken/services/KrakenTradingService
 *
 * Provider-specific implementation of ITradingService for Kraken Futures.
 * Wraps KrakenRestClient and provides trading operations with Result pattern.
 */

import { EventEmitter } from 'events';
import { Result } from '../../Common/result';
import { IOrder, IPosition, OrderSide, OrderType, OrderStatus, TimeInForce } from '../../Common/Domain';
import { ProviderType } from '../../Common/Clients/Base';
import {
    ITradingService,
    PlaceOrderParams,
    CancelOrderParams,
    CancelAllOrdersParams,
    ClosePositionParams
} from '../../Services/ITradingService';
import { KrakenEnvironment } from '../enums';
import { KrakenRestClient, KrakenRestClientConfig } from '../clients';
import {
    mapKrakenOrderToIOrder,
    mapKrakenOrdersToIOrders,
    mapKrakenPositionToIPosition,
    mapKrakenPositionsToIPositions,
    mapOrderSideToKraken
} from '../mappers';
import { KrakenOrder, KrakenPosition, SendOrderResponse, OpenOrdersResponse, OpenPositionsResponse } from '../dtos';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Kraken trading service configuration.
 */
export interface KrakenTradingServiceConfig {
    /** API key */
    apiKey: string;

    /** API secret (base64 encoded) */
    apiSecret: string;

    /** Trading environment */
    environment: KrakenEnvironment;

    /** Enable debug logging */
    debug?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Service Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Kraken implementation of ITradingService.
 */
export class KrakenTradingService implements ITradingService {
    readonly provider = ProviderType.KRAKEN;

    private readonly eventEmitter: EventEmitter;
    private readonly config: KrakenTradingServiceConfig;
    private client: KrakenRestClient | null = null;

    constructor(config: KrakenTradingServiceConfig) {
        this.config = config;
        this.eventEmitter = new EventEmitter();
    }

    get isConnected(): boolean {
        return this.client?.isConnected() ?? false;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Lifecycle
    // ═══════════════════════════════════════════════════════════════════════════

    async connect(): Promise<Result<void>> {
        try {
            const clientConfig: KrakenRestClientConfig = {
                apiKey: this.config.apiKey,
                apiSecret: this.config.apiSecret,
                environment: this.config.environment,
                debug: this.config.debug
            };

            this.client = new KrakenRestClient(clientConfig);
            return await this.client.connect();
        } catch (error) {
            return Result.fail<void>({
                code: 'CONNECTION_ERROR',
                message: error instanceof Error ? error.message : 'Failed to connect',
                timestamp: Date.now()
            });
        }
    }

    async disconnect(): Promise<Result<void>> {
        if (this.client) {
            const result = await this.client.disconnect();
            this.client = null;
            return result;
        }
        return Result.ok<void>(undefined);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Orders
    // ═══════════════════════════════════════════════════════════════════════════

    async placeOrder(params: PlaceOrderParams): Promise<Result<IOrder>> {
        if (!this.client) {
            return Result.fail<IOrder>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const krakenOrderType = this.getKrakenOrderType(params.type, params.postOnly);

        const result = await this.client.sendOrder({
            orderType: krakenOrderType,
            symbol: params.instrument,
            side: mapOrderSideToKraken(params.side),
            size: parseFloat(params.quantity),
            limitPrice: params.price ? parseFloat(params.price) : undefined,
            stopPrice: params.stopPrice ? parseFloat(params.stopPrice) : undefined,
            cliOrdId: params.clientOrderId,
            reduceOnly: params.reduceOnly,
            triggerSignal: 'mark'
        });

        if (!result.isSuccess) {
            return Result.fail<IOrder>(result.error ?? {
                code: 'ORDER_FAILED',
                message: 'Failed to place order',
                timestamp: Date.now()
            });
        }

        const response = result.data as SendOrderResponse;
        if (response.sendStatus?.order_id) {
            const orderResult = await this.getOrder(response.sendStatus.order_id);
            if (orderResult.isSuccess) {
                return orderResult;
            }

            // Return partial order info if we can't get full details
            return Result.ok<IOrder>({
                orderId: response.sendStatus.order_id,
                clientOrderId: params.clientOrderId,
                instrument: params.instrument,
                side: params.side,
                type: params.type,
                status: OrderStatus.NEW,
                quantity: params.quantity,
                filledQuantity: '0',
                price: params.price,
                stopPrice: params.stopPrice,
                averagePrice: undefined,
                reduceOnly: params.reduceOnly ?? false,
                postOnly: params.postOnly ?? false,
                timeInForce: params.timeInForce || TimeInForce.GTC,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                providerData: response
            });
        }

        return Result.fail<IOrder>({
            code: 'ORDER_FAILED',
            message: 'Order response did not contain order ID',
            timestamp: Date.now()
        });
    }

    async cancelOrder(params: CancelOrderParams): Promise<Result<IOrder>> {
        if (!this.client) {
            return Result.fail<IOrder>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const orderBefore = await this.getOrder(params.orderId);

        const result = await this.client.cancelOrder({
            orderId: params.orderId
        });

        if (!result.isSuccess) {
            return Result.fail<IOrder>(result.error ?? {
                code: 'CANCEL_FAILED',
                message: 'Failed to cancel order',
                timestamp: Date.now()
            });
        }

        if (orderBefore.isSuccess && orderBefore.data) {
            return Result.ok<IOrder>({
                ...orderBefore.data,
                status: OrderStatus.CANCELED,
                updatedAt: Date.now()
            });
        }

        return Result.ok<IOrder>({
            orderId: params.orderId,
            clientOrderId: undefined,
            instrument: params.instrument || '',
            side: OrderSide.BUY,
            type: OrderType.LIMIT,
            status: OrderStatus.CANCELED,
            quantity: '0',
            filledQuantity: '0',
            price: undefined,
            stopPrice: undefined,
            averagePrice: undefined,
            reduceOnly: false,
            postOnly: false,
            timeInForce: TimeInForce.GTC,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            providerData: result.data
        });
    }

    async cancelAllOrders(params?: CancelAllOrdersParams): Promise<Result<number>> {
        if (!this.client) {
            return Result.fail<number>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const result = await this.client.cancelAllOrders(params?.instrument);

        if (!result.isSuccess) {
            return Result.fail<number>(result.error ?? {
                code: 'CANCEL_ALL_FAILED',
                message: 'Failed to cancel all orders',
                timestamp: Date.now()
            });
        }

        const response = result.data as any;
        const count = response?.cancelStatus?.cancelledOrders?.length ??
            response?.cancelledOrders ?? 0;

        return Result.ok<number>(count);
    }

    async getOrder(orderId: string): Promise<Result<IOrder>> {
        if (!this.client) {
            return Result.fail<IOrder>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const result = await this.client.getOrderStatus([orderId]);

        if (!result.isSuccess) {
            return Result.fail<IOrder>(result.error ?? {
                code: 'ORDER_NOT_FOUND',
                message: 'Order not found',
                timestamp: Date.now()
            });
        }

        const orders = result.data?.orders as KrakenOrder[];
        if (!orders || orders.length === 0) {
            return Result.fail<IOrder>({
                code: 'ORDER_NOT_FOUND',
                message: 'Order not found',
                timestamp: Date.now()
            });
        }

        return Result.ok<IOrder>(mapKrakenOrderToIOrder(orders[0]));
    }

    async getOpenOrders(instrument?: string): Promise<Result<IOrder[]>> {
        if (!this.client) {
            return Result.fail<IOrder[]>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const result = await this.client.getOpenOrders();

        if (!result.isSuccess) {
            return Result.fail<IOrder[]>(result.error ?? {
                code: 'GET_ORDERS_FAILED',
                message: 'Failed to get open orders',
                timestamp: Date.now()
            });
        }

        const response = result.data as OpenOrdersResponse;
        let orders = response.openOrders || [];

        if (instrument) {
            orders = orders.filter(o => o.symbol === instrument);
        }

        return Result.ok<IOrder[]>(mapKrakenOrdersToIOrders(orders));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Positions
    // ═══════════════════════════════════════════════════════════════════════════

    async getPosition(instrument: string): Promise<Result<IPosition>> {
        if (!this.client) {
            return Result.fail<IPosition>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const result = await this.client.getOpenPositions();

        if (!result.isSuccess) {
            return Result.fail<IPosition>(result.error ?? {
                code: 'POSITION_NOT_FOUND',
                message: 'Position not found',
                timestamp: Date.now()
            });
        }

        const response = result.data as OpenPositionsResponse;
        const positions = response.openPositions || [];
        const position = positions.find(p => p.symbol === instrument);

        if (!position) {
            return Result.fail<IPosition>({
                code: 'POSITION_NOT_FOUND',
                message: `No position found for ${instrument}`,
                timestamp: Date.now()
            });
        }

        return Result.ok<IPosition>(mapKrakenPositionToIPosition(position));
    }

    async getPositions(): Promise<Result<IPosition[]>> {
        if (!this.client) {
            return Result.fail<IPosition[]>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const result = await this.client.getOpenPositions();

        if (!result.isSuccess) {
            return Result.fail<IPosition[]>(result.error ?? {
                code: 'GET_POSITIONS_FAILED',
                message: 'Failed to get positions',
                timestamp: Date.now()
            });
        }

        const response = result.data as OpenPositionsResponse;
        const positions = response.openPositions || [];

        return Result.ok<IPosition[]>(mapKrakenPositionsToIPositions(positions));
    }

    async closePosition(params: ClosePositionParams): Promise<Result<IOrder>> {
        if (!this.client) {
            return Result.fail<IOrder>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const positionResult = await this.getPosition(params.instrument);
        if (!positionResult.isSuccess || !positionResult.data) {
            return Result.fail<IOrder>({
                code: 'POSITION_NOT_FOUND',
                message: `No position found for ${params.instrument}`,
                timestamp: Date.now()
            });
        }

        const position = positionResult.data;
        const closeSide = position.direction === 'LONG' ? OrderSide.SELL : OrderSide.BUY;

        return this.placeOrder({
            instrument: params.instrument,
            side: closeSide,
            type: params.type === 'MARKET' ? OrderType.MARKET : OrderType.LIMIT,
            quantity: position.size,
            price: params.price,
            reduceOnly: true
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════════════════════════════════

    onOrderUpdate(callback: (order: IOrder) => void): void {
        this.eventEmitter.on('orderUpdate', callback);
    }

    onPositionUpdate(callback: (position: IPosition) => void): void {
        this.eventEmitter.on('positionUpdate', callback);
    }

    removeAllListeners(): void {
        this.eventEmitter.removeAllListeners();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Private Helpers
    // ═══════════════════════════════════════════════════════════════════════════

    private getKrakenOrderType(type: OrderType, postOnly?: boolean): string {
        if (postOnly && type === OrderType.LIMIT) {
            return 'post';
        }

        switch (type) {
            case OrderType.MARKET:
                return 'mkt';
            case OrderType.LIMIT:
                return 'lmt';
            case OrderType.STOP_MARKET:
            case OrderType.STOP_LIMIT:
                return 'stp';
            case OrderType.TAKE_PROFIT_MARKET:
            case OrderType.TAKE_PROFIT_LIMIT:
                return 'take_profit';
            default:
                return 'lmt';
        }
    }
}
