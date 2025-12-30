/**
 * @fileoverview Deribit Order Mapper
 * @module Deribit/mappers/DeribitOrderMapper
 *
 * Pure functions for mapping Deribit order DTOs to common IOrder interface.
 * Pattern aligned with Binance's OrderMapper implementation.
 */

import {
    IOrder,
    OrderSide,
    OrderType,
    OrderStatus,
    TimeInForce
} from '../../Common/Domain';
import { DeribitOrder, DeribitOrderUpdate } from '../dtos';
import { Direction, OrderState, DeribitOrderType, DeribitTimeInForce } from '../enums';

// ═══════════════════════════════════════════════════════════════════════════════
// Type Mappers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Deribit Direction to common OrderSide.
 *
 * @param direction - Deribit direction
 * @returns Common OrderSide
 */
export function mapDirectionToOrderSide(direction: Direction): OrderSide {
    return direction === Direction.BUY ? OrderSide.BUY : OrderSide.SELL;
}

/**
 * Map Deribit order type to common OrderType.
 *
 * @param type - Deribit order type (string or enum)
 * @returns Common OrderType
 */
export function mapDeribitOrderTypeToOrderType(type: string | DeribitOrderType): OrderType {
    const typeStr = type.toLowerCase();
    const mapping: Record<string, OrderType> = {
        limit: OrderType.LIMIT,
        market: OrderType.MARKET,
        stop_limit: OrderType.STOP_LIMIT,
        stop_market: OrderType.STOP_MARKET,
        take_limit: OrderType.TAKE_PROFIT_LIMIT,
        take_market: OrderType.TAKE_PROFIT_MARKET,
        trailing_stop: OrderType.TRAILING_STOP_MARKET
    };
    return mapping[typeStr] ?? OrderType.LIMIT;
}

/**
 * Map Deribit OrderState to common OrderStatus.
 *
 * @param state - Deribit order state
 * @returns Common OrderStatus
 */
export function mapOrderStateToOrderStatus(state: string | OrderState): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
        [OrderState.OPEN]: OrderStatus.NEW,
        [OrderState.FILLED]: OrderStatus.FILLED,
        [OrderState.CANCELLED]: OrderStatus.CANCELED,
        [OrderState.REJECTED]: OrderStatus.REJECTED,
        [OrderState.UNTRIGGERED]: OrderStatus.PENDING,
        [OrderState.TRIGGERED]: OrderStatus.NEW
    };
    return mapping[state] ?? OrderStatus.NEW;
}

/**
 * Map Deribit TimeInForce to common TimeInForce.
 *
 * @param tif - Deribit time in force
 * @returns Common TimeInForce
 */
export function mapTimeInForceToCommon(tif: string | DeribitTimeInForce): TimeInForce {
    const mapping: Record<string, TimeInForce> = {
        good_til_cancelled: TimeInForce.GTC,
        good_til_day: TimeInForce.GTD,
        fill_or_kill: TimeInForce.FOK,
        immediate_or_cancel: TimeInForce.IOC
    };
    return mapping[tif.toLowerCase()] ?? TimeInForce.GTC;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Status Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if order is in active (open) state.
 *
 * @param order - Deribit order
 * @returns true if order is active
 */
export function isActiveOrder(order: DeribitOrder | DeribitOrderUpdate): boolean {
    const state = order.order_state as OrderState;
    return state === OrderState.OPEN || state === OrderState.UNTRIGGERED;
}

/**
 * Check if order is in terminal (completed) state.
 *
 * @param order - Deribit order
 * @returns true if order is terminal
 */
export function isTerminalOrder(order: DeribitOrder | DeribitOrderUpdate): boolean {
    const state = order.order_state as OrderState;
    return [OrderState.FILLED, OrderState.CANCELLED, OrderState.REJECTED].includes(state);
}

/**
 * Check if order is partially filled.
 *
 * @param order - Deribit order
 * @returns true if order has partial fill
 */
export function isPartiallyFilled(order: DeribitOrder | DeribitOrderUpdate): boolean {
    return order.filled_amount > 0 && order.filled_amount < order.amount;
}

/**
 * Calculate fill percentage.
 *
 * @param order - Deribit order
 * @returns Fill percentage (0-100)
 */
export function getFillPercentage(order: DeribitOrder | DeribitOrderUpdate): number {
    if (order.amount === 0) return 0;
    return (order.filled_amount / order.amount) * 100;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Mappers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map DeribitOrder to common IOrder interface.
 *
 * @param order - Deribit order DTO
 * @returns Common IOrder
 */
export function mapDeribitOrderToIOrder(order: DeribitOrder): IOrder {
    const price = order.price === 'market_price' ? undefined : String(order.price);

    return {
        orderId: order.order_id,
        clientOrderId: order.label || undefined,
        instrument: order.instrument_name,
        side: mapDirectionToOrderSide(order.direction),
        type: mapDeribitOrderTypeToOrderType(order.order_type),
        quantity: String(order.amount),
        filledQuantity: String(order.filled_amount),
        price,
        stopPrice: order.trigger_price !== undefined ? String(order.trigger_price) : undefined,
        averagePrice: order.average_price !== undefined && order.average_price !== 0
            ? String(order.average_price)
            : undefined,
        status: mapOrderStateToOrderStatus(order.order_state),
        timeInForce: mapTimeInForceToCommon(order.time_in_force),
        reduceOnly: order.reduce_only,
        postOnly: order.post_only,
        createdAt: order.creation_timestamp,
        updatedAt: order.last_update_timestamp,
        providerData: order
    };
}

/**
 * Map DeribitOrderUpdate (from WebSocket) to common IOrder interface.
 *
 * @param update - Deribit order update from WebSocket
 * @returns Common IOrder
 */
export function mapDeribitOrderUpdateToIOrder(update: DeribitOrderUpdate): IOrder {
    return {
        orderId: update.order_id,
        clientOrderId: update.label || undefined,
        instrument: update.instrument_name,
        side: mapDirectionToOrderSide(update.direction),
        type: mapDeribitOrderTypeToOrderType(update.order_type),
        quantity: String(update.amount),
        filledQuantity: String(update.filled_amount),
        price: update.price !== undefined ? String(update.price) : undefined,
        averagePrice: update.average_price !== undefined && update.average_price !== 0
            ? String(update.average_price)
            : undefined,
        status: mapOrderStateToOrderStatus(update.order_state),
        timeInForce: mapTimeInForceToCommon(update.time_in_force),
        reduceOnly: update.reduce_only,
        postOnly: update.post_only,
        createdAt: update.creation_timestamp,
        updatedAt: update.last_update_timestamp,
        providerData: update
    };
}

/**
 * Map array of Deribit orders to common IOrder array.
 *
 * @param orders - Array of Deribit orders
 * @returns Array of common IOrder
 */
export function mapDeribitOrdersToIOrders(orders: DeribitOrder[]): IOrder[] {
    return orders.map(mapDeribitOrderToIOrder);
}

/**
 * Map array of Deribit order updates to common IOrder array.
 *
 * @param updates - Array of Deribit order updates
 * @returns Array of common IOrder
 */
export function mapDeribitOrderUpdatesToIOrders(updates: DeribitOrderUpdate[]): IOrder[] {
    return updates.map(mapDeribitOrderUpdateToIOrder);
}
