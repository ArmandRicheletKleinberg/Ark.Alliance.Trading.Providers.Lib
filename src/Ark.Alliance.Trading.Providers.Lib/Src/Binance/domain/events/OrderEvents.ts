/**
 * @fileoverview Order Domain Events
 * @module domain/events/OrderEvents
 *
 * Domain events related to order lifecycle including creation, fills,
 * cancellations, and rejections.
 */

import { BaseEvent } from './BaseEvent';
import { EventType } from './EventType';
import { EventSource } from './EventSource';
import {
    OrderSide,
    OrderType,
    OrderStatus,
    TimeInForce,
    type OrderSideType,
    type OrderTypeType,
    type OrderStatusType,
    type TimeInForceType
} from '../../enums';

// Re-export enums for backward compatibility
export { OrderSide, OrderType, OrderStatus, TimeInForce };

// ═══════════════════════════════════════════════════════════════════════════════
// Event Classes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Event fired when a new order is created.
 *
 * @extends BaseEvent
 */
export class OrderCreatedEvent extends BaseEvent {
    /**
     * Creates an OrderCreatedEvent instance.
     *
     * @param orderId - Binance order ID.
     * @param clientOrderId - Client-assigned order ID.
     * @param symbol - Trading symbol.
     * @param side - Order side (BUY or SELL).
     * @param type - Order type.
     * @param quantity - Order quantity.
     * @param price - Order price (0 for MARKET orders).
     * @param timeInForce - Time in force setting.
     * @param correlationId - Optional correlation ID for tracing.
     */
    constructor(
        public readonly orderId: number,
        public readonly clientOrderId: string,
        public readonly symbol: string,
        public readonly side: OrderSide,
        public readonly type: OrderType,
        public readonly quantity: number,
        public readonly price: number,
        public readonly timeInForce: TimeInForce,
        correlationId?: string
    ) {
        super(EventType.ORDER_CREATED, EventSource.BINANCE_USER_DATA_STREAM, correlationId);
    }

    /**
     * Serializes the event to JSON.
     *
     * @returns JSON representation of the event.
     */
    public toJSON(): Record<string, unknown> {
        return {
            ...this.getBaseJSON(),
            orderId: this.orderId,
            clientOrderId: this.clientOrderId,
            symbol: this.symbol,
            side: this.side,
            type: this.type,
            quantity: this.quantity,
            price: this.price,
            timeInForce: this.timeInForce
        };
    }
}

/**
 * Event fired when an order is partially or fully filled.
 *
 * @extends BaseEvent
 */
export class OrderFilledEvent extends BaseEvent {
    /**
     * Creates an OrderFilledEvent instance.
     *
     * @param orderId - Binance order ID.
     * @param symbol - Trading symbol.
     * @param side - Order side.
     * @param lastFilledQuantity - Quantity filled in this execution.
     * @param lastFilledPrice - Price of this execution.
     * @param totalFilledQuantity - Total quantity filled so far.
     * @param averagePrice - Average fill price.
     * @param status - Current order status.
     * @param commission - Commission charged.
     * @param commissionAsset - Asset used for commission.
     * @param realizedPnL - Realized PnL from this fill.
     * @param tradeId - Trade ID for this execution.
     * @param isMaker - Whether this was a maker trade.
     * @param correlationId - Optional correlation ID for tracing.
     */
    constructor(
        public readonly orderId: number,
        public readonly symbol: string,
        public readonly side: OrderSide,
        public readonly lastFilledQuantity: number,
        public readonly lastFilledPrice: number,
        public readonly totalFilledQuantity: number,
        public readonly averagePrice: number,
        public readonly status: OrderStatus,
        public readonly commission: number,
        public readonly commissionAsset: string,
        public readonly realizedPnL: number,
        public readonly tradeId: number,
        public readonly isMaker: boolean,
        correlationId?: string
    ) {
        super(EventType.ORDER_FILLED, EventSource.BINANCE_USER_DATA_STREAM, correlationId);
    }

    /**
     * Checks if the order is fully filled.
     *
     * @returns True if order status is FILLED.
     */
    public isFullyFilled(): boolean {
        return this.status === 'FILLED';
    }

    /**
     * Serializes the event to JSON.
     *
     * @returns JSON representation of the event.
     */
    public toJSON(): Record<string, unknown> {
        return {
            ...this.getBaseJSON(),
            orderId: this.orderId,
            symbol: this.symbol,
            side: this.side,
            lastFilledQuantity: this.lastFilledQuantity,
            lastFilledPrice: this.lastFilledPrice,
            totalFilledQuantity: this.totalFilledQuantity,
            averagePrice: this.averagePrice,
            status: this.status,
            commission: this.commission,
            commissionAsset: this.commissionAsset,
            realizedPnL: this.realizedPnL,
            tradeId: this.tradeId,
            isMaker: this.isMaker
        };
    }
}

/**
 * Event fired when an order is cancelled.
 *
 * @extends BaseEvent
 */
export class OrderCancelledEvent extends BaseEvent {
    /**
     * Creates an OrderCancelledEvent instance.
     *
     * @param orderId - Binance order ID.
     * @param symbol - Trading symbol.
     * @param side - Order side.
     * @param originalQuantity - Original order quantity.
     * @param filledQuantity - Quantity filled before cancellation.
     * @param wasPartiallyFilled - Whether order had partial fills.
     * @param correlationId - Optional correlation ID for tracing.
     */
    constructor(
        public readonly orderId: number,
        public readonly symbol: string,
        public readonly side: OrderSide,
        public readonly originalQuantity: number,
        public readonly filledQuantity: number,
        public readonly wasPartiallyFilled: boolean,
        correlationId?: string
    ) {
        super(EventType.ORDER_CANCELLED, EventSource.BINANCE_USER_DATA_STREAM, correlationId);
    }

    /**
     * Serializes the event to JSON.
     *
     * @returns JSON representation of the event.
     */
    public toJSON(): Record<string, unknown> {
        return {
            ...this.getBaseJSON(),
            orderId: this.orderId,
            symbol: this.symbol,
            side: this.side,
            originalQuantity: this.originalQuantity,
            filledQuantity: this.filledQuantity,
            wasPartiallyFilled: this.wasPartiallyFilled
        };
    }
}

/**
 * Event fired when an order expires.
 *
 * @extends BaseEvent
 */
export class OrderExpiredEvent extends BaseEvent {
    /**
     * Creates an OrderExpiredEvent instance.
     *
     * @param orderId - Binance order ID.
     * @param symbol - Trading symbol.
     * @param expiryReason - Reason for expiry.
     * @param correlationId - Optional correlation ID for tracing.
     */
    constructor(
        public readonly orderId: number,
        public readonly symbol: string,
        public readonly expiryReason: string,
        correlationId?: string
    ) {
        super(EventType.ORDER_EXPIRED, EventSource.BINANCE_USER_DATA_STREAM, correlationId);
    }

    /**
     * Serializes the event to JSON.
     *
     * @returns JSON representation of the event.
     */
    public toJSON(): Record<string, unknown> {
        return {
            ...this.getBaseJSON(),
            orderId: this.orderId,
            symbol: this.symbol,
            expiryReason: this.expiryReason
        };
    }
}

/**
 * Event fired when an order is rejected.
 *
 * @extends BaseEvent
 */
export class OrderRejectedEvent extends BaseEvent {
    /**
     * Creates an OrderRejectedEvent instance.
     *
     * @param orderId - Binance order ID (if available).
     * @param symbol - Trading symbol.
     * @param rejectReason - Reason for rejection.
     * @param errorCode - Binance error code.
     * @param correlationId - Optional correlation ID for tracing.
     */
    constructor(
        public readonly orderId: number | undefined,
        public readonly symbol: string,
        public readonly rejectReason: string,
        public readonly errorCode: string,
        correlationId?: string
    ) {
        super(EventType.ORDER_REJECTED, EventSource.BINANCE_USER_DATA_STREAM, correlationId);
    }

    /**
     * Serializes the event to JSON.
     *
     * @returns JSON representation of the event.
     */
    public toJSON(): Record<string, unknown> {
        return {
            ...this.getBaseJSON(),
            orderId: this.orderId,
            symbol: this.symbol,
            rejectReason: this.rejectReason,
            errorCode: this.errorCode
        };
    }
}
