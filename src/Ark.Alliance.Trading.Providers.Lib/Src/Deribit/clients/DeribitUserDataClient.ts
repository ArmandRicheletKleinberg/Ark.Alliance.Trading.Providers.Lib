/**
 * @fileoverview Deribit User Data Client
 * @module Deribit/clients/DeribitUserDataClient
 *
 * Client for Deribit private user data streams.
 */

import { EventEmitter } from 'events';
import { Result } from '../../Common/result';
import {
    IOrder,
    IPosition,
    OrderSide,
    OrderType,
    OrderStatus,
    TimeInForce,
    PositionDirection,
    MarginType
} from '../../Common/Domain';
import { DeribitJsonRpcClient, DeribitClientConfig } from './DeribitJsonRpcClient';
import {
    DeribitPosition,
    DeribitAccountSummary,
    DeribitUserChanges,
    DeribitOrderUpdate,
    DeribitPositionUpdate
} from '../dtos';
import { CHANNELS, METHODS } from '../shared';
import { Direction, OrderState } from '../enums';

/**
 * User data callback types.
 */
export type OrderUpdateCallback = (order: IOrder) => void;
export type PositionUpdateCallback = (position: IPosition) => void;
export type AccountUpdateCallback = (account: DeribitAccountSummary) => void;

/**
 * Deribit user data client.
 *
 * @remarks
 * Provides access to private user data including:
 * - Order updates
 * - Position updates
 * - Account/portfolio updates
 * - Trade fills
 *
 * @example
 * ```typescript
 * const client = new DeribitUserDataClient(config);
 * await client.connect();
 *
 * // Subscribe to user changes
 * await client.subscribeUserChanges('BTC-PERPETUAL', (order, position) => {
 *     console.log('Order update:', order);
 *     console.log('Position update:', position);
 * });
 * ```
 */
export class DeribitUserDataClient extends EventEmitter {
    private client: DeribitJsonRpcClient;
    private orderCallbacks: Map<string, Set<OrderUpdateCallback>> = new Map();
    private positionCallbacks: Map<string, Set<PositionUpdateCallback>> = new Map();
    private accountCallbacks: Set<AccountUpdateCallback> = new Set();

    constructor(config: DeribitClientConfig) {
        super();
        this.client = new DeribitJsonRpcClient(config);

        // Handle notifications
        this.client.on('notification', ({ channel, data }) => {
            this.handleNotification(channel, data);
        });

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
     * Disconnect.
     */
    async disconnect(): Promise<Result<void>> {
        this.orderCallbacks.clear();
        this.positionCallbacks.clear();
        this.accountCallbacks.clear();
        return this.client.disconnect();
    }

    /**
     * Check if connected.
     */
    isConnected(): boolean {
        return this.client.isConnected();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Positions
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get position for an instrument.
     */
    async getPosition(instrumentName: string): Promise<Result<IPosition>> {
        const result = await this.client.call<DeribitPosition>(METHODS.GET_POSITION, {
            instrument_name: instrumentName
        });

        if (!result.success || !result.data) {
            return Result.fail<IPosition>({
                code: 'FAILURE',
                message: result.reason || 'Failed to get position',
                timestamp: Date.now()
            });
        }

        return Result.ok(this.mapPosition(result.data));
    }

    /**
     * Get all positions for a currency.
     */
    async getPositions(currency: string): Promise<Result<IPosition[]>> {
        const result = await this.client.call<DeribitPosition[]>(METHODS.GET_POSITIONS, {
            currency
        });

        if (!result.success || !result.data) {
            return Result.fail<IPosition[]>({
                code: 'FAILURE',
                message: result.reason || 'Failed to get positions',
                timestamp: Date.now()
            });
        }

        return Result.ok(result.data.map((p) => this.mapPosition(p)));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Account
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get account summary for a currency.
     */
    async getAccountSummary(currency: string): Promise<Result<DeribitAccountSummary>> {
        return this.client.call<DeribitAccountSummary>(METHODS.GET_ACCOUNT_SUMMARY, {
            currency,
            extended: true
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Orders
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get open orders for an instrument.
     */
    async getOpenOrders(instrumentName?: string): Promise<Result<IOrder[]>> {
        const method = instrumentName
            ? METHODS.GET_OPEN_ORDERS_BY_INSTRUMENT
            : METHODS.GET_OPEN_ORDERS;

        const params: Record<string, unknown> = {};
        if (instrumentName) {
            params.instrument_name = instrumentName;
        }

        const result = await this.client.call<DeribitOrderUpdate[]>(method, params);

        if (!result.success || !result.data) {
            return Result.fail<IOrder[]>({
                code: 'FAILURE',
                message: result.reason || 'Failed to get open orders',
                timestamp: Date.now()
            });
        }

        return Result.ok(result.data.map((o) => this.mapOrder(o)));
    }

    /**
     * Get order by ID.
     */
    async getOrder(orderId: string): Promise<Result<IOrder>> {
        const result = await this.client.call<DeribitOrderUpdate>(METHODS.GET_ORDER_STATE, {
            order_id: orderId
        });

        if (!result.success || !result.data) {
            return Result.fail<IOrder>({
                code: 'FAILURE',
                message: result.reason || 'Failed to get order',
                timestamp: Date.now()
            });
        }

        return Result.ok(this.mapOrder(result.data));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Subscriptions
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Subscribe to user changes (orders, positions, trades) for an instrument.
     */
    async subscribeUserChanges(
        instrumentName: string,
        orderCallback?: OrderUpdateCallback,
        positionCallback?: PositionUpdateCallback,
        interval: string = 'raw'
    ): Promise<Result<void>> {
        const channel = CHANNELS.USER_CHANGES(instrumentName, interval);

        if (orderCallback) {
            if (!this.orderCallbacks.has(instrumentName)) {
                this.orderCallbacks.set(instrumentName, new Set());
            }
            this.orderCallbacks.get(instrumentName)!.add(orderCallback);
        }

        if (positionCallback) {
            if (!this.positionCallbacks.has(instrumentName)) {
                this.positionCallbacks.set(instrumentName, new Set());
            }
            this.positionCallbacks.get(instrumentName)!.add(positionCallback);
        }

        return this.client.subscribeChannels([channel], true);
    }

    /**
     * Subscribe to portfolio/account updates.
     */
    async subscribePortfolio(
        currency: string,
        callback: AccountUpdateCallback
    ): Promise<Result<void>> {
        this.accountCallbacks.add(callback);
        const channel = CHANNELS.USER_PORTFOLIO(currency);
        return this.client.subscribeChannels([channel], true);
    }

    /**
     * Unsubscribe from instrument updates.
     */
    async unsubscribeUserChanges(instrumentName: string): Promise<Result<void>> {
        this.orderCallbacks.delete(instrumentName);
        this.positionCallbacks.delete(instrumentName);

        const channel = CHANNELS.USER_CHANGES(instrumentName, 'raw');
        return this.client.unsubscribe(channel);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Internal
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Handle subscription notification.
     */
    private handleNotification(channel: string, data: unknown): void {
        if (channel.startsWith('user.changes.')) {
            this.handleUserChanges(data as DeribitUserChanges);
        } else if (channel.startsWith('user.portfolio.')) {
            this.handlePortfolioUpdate(data as DeribitAccountSummary);
        }
    }

    /**
     * Handle user changes notification.
     */
    private handleUserChanges(changes: DeribitUserChanges): void {
        const instrumentName = changes.instrument_name;

        // Process orders
        if (changes.orders && changes.orders.length > 0) {
            const orderCbs = this.orderCallbacks.get(instrumentName);
            if (orderCbs) {
                for (const orderUpdate of changes.orders) {
                    const order = this.mapOrder(orderUpdate);
                    orderCbs.forEach((callback) => {
                        try {
                            callback(order);
                        } catch (error) {
                            this.emit('error', error);
                        }
                    });
                }
            }
        }

        // Process positions
        if (changes.positions && changes.positions.length > 0) {
            const posCbs = this.positionCallbacks.get(instrumentName);
            if (posCbs) {
                for (const posUpdate of changes.positions) {
                    const position = this.mapPositionUpdate(posUpdate);
                    posCbs.forEach((callback) => {
                        try {
                            callback(position);
                        } catch (error) {
                            this.emit('error', error);
                        }
                    });
                }
            }
        }

        // Emit combined event
        this.emit('userChanges', {
            instrument: instrumentName,
            orders: changes.orders?.map((o) => this.mapOrder(o)) || [],
            positions: changes.positions?.map((p) => this.mapPositionUpdate(p)) || [],
            trades: changes.trades || []
        });
    }

    /**
     * Handle portfolio update.
     */
    private handlePortfolioUpdate(account: DeribitAccountSummary): void {
        this.accountCallbacks.forEach((callback) => {
            try {
                callback(account);
            } catch (error) {
                this.emit('error', error);
            }
        });
        this.emit('portfolioUpdate', account);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Mappers
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Map Deribit order to common IOrder.
     */
    private mapOrder(order: DeribitOrderUpdate): IOrder {
        return {
            orderId: order.order_id,
            clientOrderId: order.label || undefined,
            instrument: order.instrument_name,
            side: this.mapSide(order.direction),
            type: this.mapOrderType(order.order_type),
            quantity: String(order.amount),
            filledQuantity: String(order.filled_amount),
            price: order.price !== undefined ? String(order.price) : undefined,
            averagePrice: order.average_price !== undefined
                ? String(order.average_price)
                : undefined,
            status: this.mapOrderStatus(order.order_state as OrderState),
            timeInForce: this.mapTimeInForce(order.time_in_force),
            reduceOnly: order.reduce_only,
            postOnly: order.post_only,
            createdAt: order.creation_timestamp,
            updatedAt: order.last_update_timestamp,
            providerData: order
        };
    }

    /**
     * Map Deribit position to common IPosition.
     */
    private mapPosition(position: DeribitPosition): IPosition {
        return {
            instrument: position.instrument_name,
            direction: this.mapPositionDirection(position.direction, position.size),
            size: String(position.size),
            entryPrice: String(position.average_price),
            markPrice: String(position.mark_price),
            liquidationPrice: position.estimated_liquidation_price !== undefined
                ? String(position.estimated_liquidation_price)
                : undefined,
            unrealizedPnl: String(position.floating_profit_loss),
            realizedPnl: String(position.realized_profit_loss),
            leverage: position.leverage,
            marginType: MarginType.CROSS, // Deribit uses cross margin
            initialMargin: String(position.initial_margin),
            maintenanceMargin: String(position.maintenance_margin),
            updatedAt: Date.now(),
            providerData: position
        };
    }

    /**
     * Map position update to common IPosition.
     */
    private mapPositionUpdate(update: DeribitPositionUpdate): IPosition {
        return {
            instrument: update.instrument_name,
            direction: this.mapPositionDirection(update.direction, update.size),
            size: String(update.size),
            entryPrice: String(update.average_price),
            markPrice: String(update.mark_price),
            liquidationPrice: undefined,
            unrealizedPnl: String(update.floating_profit_loss),
            realizedPnl: String(update.realized_profit_loss),
            leverage: update.leverage,
            marginType: MarginType.CROSS,
            initialMargin: String(update.initial_margin),
            maintenanceMargin: String(update.maintenance_margin),
            updatedAt: Date.now(),
            providerData: update
        };
    }

    /**
     * Map direction to OrderSide.
     */
    private mapSide(direction: Direction): OrderSide {
        return direction === Direction.BUY ? OrderSide.BUY : OrderSide.SELL;
    }

    /**
     * Map order type.
     */
    private mapOrderType(type: string): OrderType {
        const mapping: Record<string, OrderType> = {
            limit: OrderType.LIMIT,
            market: OrderType.MARKET,
            stop_limit: OrderType.STOP_LIMIT,
            stop_market: OrderType.STOP_MARKET,
            take_limit: OrderType.TAKE_PROFIT_LIMIT,
            take_market: OrderType.TAKE_PROFIT_MARKET,
            trailing_stop: OrderType.TRAILING_STOP_MARKET
        };
        return mapping[type] || OrderType.LIMIT;
    }

    /**
     * Map order state to OrderStatus.
     */
    private mapOrderStatus(state: OrderState): OrderStatus {
        const mapping: Record<OrderState, OrderStatus> = {
            [OrderState.OPEN]: OrderStatus.NEW,
            [OrderState.FILLED]: OrderStatus.FILLED,
            [OrderState.CANCELLED]: OrderStatus.CANCELED,
            [OrderState.REJECTED]: OrderStatus.REJECTED,
            [OrderState.UNTRIGGERED]: OrderStatus.PENDING,
            [OrderState.TRIGGERED]: OrderStatus.NEW
        };
        return mapping[state] || OrderStatus.NEW;
    }

    /**
     * Map time in force.
     */
    private mapTimeInForce(tif: string): TimeInForce {
        const mapping: Record<string, TimeInForce> = {
            good_til_cancelled: TimeInForce.GTC,
            good_til_day: TimeInForce.GTD,
            fill_or_kill: TimeInForce.FOK,
            immediate_or_cancel: TimeInForce.IOC
        };
        return mapping[tif] || TimeInForce.GTC;
    }

    /**
     * Map position direction.
     */
    private mapPositionDirection(
        direction: Direction,
        size: number
    ): PositionDirection {
        if (size === 0) return PositionDirection.FLAT;
        return direction === Direction.BUY ? PositionDirection.LONG : PositionDirection.SHORT;
    }
}
