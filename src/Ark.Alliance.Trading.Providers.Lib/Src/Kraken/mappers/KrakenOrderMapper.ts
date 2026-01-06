/**
 * @fileoverview Kraken Order Mapper
 * @module Kraken/mappers/KrakenOrderMapper
 *
 * Maps Kraken order DTOs to common IOrder interface.
 */

import { IOrder, OrderSide, OrderType, OrderStatus, TimeInForce } from '../../Common/Domain';
import { KrakenOrder } from '../dtos';
import { KrakenOrderSide, KrakenOrderType, KrakenOrderStatus, KrakenTimeInForce } from '../enums';

// ═══════════════════════════════════════════════════════════════════════════════
// Order Side Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Kraken order side to common OrderSide.
 */
export function mapKrakenSideToOrderSide(side: string): OrderSide {
    switch (side.toLowerCase()) {
        case 'buy':
        case KrakenOrderSide.BUY:
            return OrderSide.BUY;
        case 'sell':
        case KrakenOrderSide.SELL:
            return OrderSide.SELL;
        default:
            return OrderSide.BUY;
    }
}

/**
 * Map common OrderSide to Kraken side.
 */
export function mapOrderSideToKraken(side: OrderSide): string {
    return side === OrderSide.BUY ? KrakenOrderSide.BUY : KrakenOrderSide.SELL;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Type Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Kraken order type to common OrderType.
 */
export function mapKrakenTypeToOrderType(type: string): OrderType {
    switch (type.toLowerCase()) {
        case 'lmt':
        case KrakenOrderType.LIMIT:
            return OrderType.LIMIT;
        case 'mkt':
        case KrakenOrderType.MARKET:
        case 'ioc':
        case KrakenOrderType.IOC:
            return OrderType.MARKET;
        case 'stp':
        case KrakenOrderType.STOP:
            return OrderType.STOP_MARKET;
        case 'take_profit':
        case KrakenOrderType.TAKE_PROFIT:
            return OrderType.TAKE_PROFIT_MARKET;
        case 'post':
        case KrakenOrderType.POST:
            return OrderType.LIMIT;
        default:
            return OrderType.LIMIT;
    }
}

/**
 * Map common OrderType to Kraken order type.
 */
export function mapOrderTypeToKraken(type: OrderType): string {
    switch (type) {
        case OrderType.MARKET:
            return KrakenOrderType.MARKET;
        case OrderType.LIMIT:
            return KrakenOrderType.LIMIT;
        case OrderType.STOP_MARKET:
        case OrderType.STOP_LIMIT:
            return KrakenOrderType.STOP;
        case OrderType.TAKE_PROFIT_MARKET:
        case OrderType.TAKE_PROFIT_LIMIT:
            return KrakenOrderType.TAKE_PROFIT;
        default:
            return KrakenOrderType.LIMIT;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Status Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Kraken order status to common OrderStatus.
 */
export function mapKrakenStatusToOrderStatus(status: string): OrderStatus {
    switch (status.toLowerCase()) {
        case 'placed':
        case 'untouched':
        case KrakenOrderStatus.PLACED:
        case KrakenOrderStatus.UNTOUCHED:
            return OrderStatus.NEW;
        case 'partiallyfilled':
        case KrakenOrderStatus.PARTIALLY_FILLED:
            return OrderStatus.PARTIALLY_FILLED;
        case 'filled':
        case KrakenOrderStatus.FILLED:
            return OrderStatus.FILLED;
        case 'cancelled':
        case KrakenOrderStatus.CANCELLED:
            return OrderStatus.CANCELED;
        case 'pending':
        case KrakenOrderStatus.PENDING:
            return OrderStatus.PENDING;
        default:
            return OrderStatus.NEW;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Time In Force Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map common TimeInForce to Kraken format.
 */
export function mapTimeInForceToKraken(tif: TimeInForce): string | undefined {
    switch (tif) {
        case TimeInForce.GTC:
            return undefined; // GTC is default
        case TimeInForce.IOC:
            return 'ioc';
        case TimeInForce.FOK:
            return 'ioc'; // Kraken uses IOC for immediate execution
        default:
            return undefined;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Full Order Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Kraken order to common IOrder.
 */
export function mapKrakenOrderToIOrder(order: KrakenOrder): IOrder {
    return {
        orderId: order.orderId,
        clientOrderId: order.cliOrdId,
        instrument: order.symbol,
        side: mapKrakenSideToOrderSide(order.side),
        type: mapKrakenTypeToOrderType(order.type),
        status: mapKrakenStatusToOrderStatus(order.status),
        quantity: order.quantity.toString(),
        filledQuantity: order.filled.toString(),
        price: order.limitPrice?.toString(),
        stopPrice: order.stopPrice?.toString(),
        averagePrice: undefined,
        reduceOnly: order.reduceOnly ?? false,
        postOnly: order.type === KrakenOrderType.POST,
        timeInForce: TimeInForce.GTC,
        createdAt: new Date(order.timestamp).getTime(),
        updatedAt: order.lastUpdateTimestamp
            ? new Date(order.lastUpdateTimestamp).getTime()
            : new Date(order.timestamp).getTime(),
        providerData: order
    };
}

/**
 * Map array of Kraken orders to IOrder array.
 */
export function mapKrakenOrdersToIOrders(orders: KrakenOrder[]): IOrder[] {
    return orders.map(mapKrakenOrderToIOrder);
}
