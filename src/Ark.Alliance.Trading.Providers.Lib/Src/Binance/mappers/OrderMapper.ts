/**
 * @fileoverview Binance Order Mapper
 * @module Binance/mappers/OrderMapper
 *
 * Maps Binance order types to common IOrder interface.
 * Pure functions - no side effects.
 *
 * @remarks
 * This mapper provides interoperability between Binance-specific order types
 * and the provider-agnostic IOrder interface defined in Common/Domain.
 *
 * Binance uses two separate event streams for orders:
 * - ORDER_TRADE_UPDATE: Direct orders (LIMIT, MARKET)
 * - ALGO_UPDATE: Conditional/algo orders (STOP, TAKE_PROFIT, TRAILING_STOP)
 *
 * This mapper handles both OrderUpdate and AlgoOrderUpdate types.
 *
 * @see https://binance-docs.github.io/apidocs/futures/en/#event-order-update
 */

import {
    IOrder,
    OrderSide,
    OrderType,
    OrderStatus,
    TimeInForce
} from '../../Common/Domain';
import { OrderUpdate } from '../dtos/binance/OrderUpdate';
import { AlgoOrderUpdate, AlgoOrderStatus } from '../dtos/binance/AlgoOrderUpdate';
import {
    OrderSide as BinanceOrderSide,
    OrderType as BinanceOrderType,
    OrderStatus as BinanceOrderStatus,
    TimeInForce as BinanceTimeInForce,
    isPostOnly as isBinancePostOnly,
    isConditionalOrder
} from '../enums';

// ═══════════════════════════════════════════════════════════════════════════════
// Type Guards
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type guard to check if an order is an AlgoOrderUpdate.
 *
 * @param order - Order to check
 * @returns true if AlgoOrderUpdate
 */
export function isAlgoOrder(order: OrderUpdate | AlgoOrderUpdate): order is AlgoOrderUpdate {
    return 'algoId' in order && 'algoType' in order;
}

/**
 * Type guard to check if an order is a regular OrderUpdate.
 *
 * @param order - Order to check
 * @returns true if OrderUpdate
 */
export function isRegularOrder(order: OrderUpdate | AlgoOrderUpdate): order is OrderUpdate {
    return !isAlgoOrder(order);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Side Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Binance order side to common OrderSide.
 *
 * @param side - Binance order side
 * @returns Common OrderSide
 */
export function mapBinanceSideToCommon(side: BinanceOrderSide | string): OrderSide {
    return side === BinanceOrderSide.BUY || side === 'BUY'
        ? OrderSide.BUY
        : OrderSide.SELL;
}

/**
 * Map common OrderSide to Binance side.
 *
 * @param side - Common OrderSide
 * @returns Binance order side
 */
export function mapCommonSideToBinance(side: OrderSide): BinanceOrderSide {
    return side === OrderSide.BUY
        ? BinanceOrderSide.BUY
        : BinanceOrderSide.SELL;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Type Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Binance order type to common OrderType.
 *
 * @param type - Binance order type
 * @returns Common OrderType
 */
export function mapBinanceOrderTypeToCommon(type: BinanceOrderType | string): OrderType {
    const mapping: Record<string, OrderType> = {
        [BinanceOrderType.MARKET]: OrderType.MARKET,
        [BinanceOrderType.LIMIT]: OrderType.LIMIT,
        [BinanceOrderType.STOP]: OrderType.STOP_LIMIT,
        [BinanceOrderType.STOP_MARKET]: OrderType.STOP_MARKET,
        [BinanceOrderType.TAKE_PROFIT]: OrderType.TAKE_PROFIT_LIMIT,
        [BinanceOrderType.TAKE_PROFIT_MARKET]: OrderType.TAKE_PROFIT_MARKET,
        [BinanceOrderType.TRAILING_STOP_MARKET]: OrderType.TRAILING_STOP_MARKET
    };
    return mapping[type] ?? OrderType.LIMIT;
}

/**
 * Map common OrderType to Binance order type.
 *
 * @param type - Common OrderType
 * @returns Binance order type
 */
export function mapCommonOrderTypeToBinance(type: OrderType): BinanceOrderType {
    const mapping: Record<OrderType, BinanceOrderType> = {
        [OrderType.MARKET]: BinanceOrderType.MARKET,
        [OrderType.LIMIT]: BinanceOrderType.LIMIT,
        [OrderType.STOP_LIMIT]: BinanceOrderType.STOP,
        [OrderType.STOP_MARKET]: BinanceOrderType.STOP_MARKET,
        [OrderType.TAKE_PROFIT_LIMIT]: BinanceOrderType.TAKE_PROFIT,
        [OrderType.TAKE_PROFIT_MARKET]: BinanceOrderType.TAKE_PROFIT_MARKET,
        [OrderType.TRAILING_STOP_MARKET]: BinanceOrderType.TRAILING_STOP_MARKET
    };
    return mapping[type];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Status Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Binance order status to common OrderStatus.
 *
 * @param status - Binance order status
 * @returns Common OrderStatus
 */
export function mapBinanceOrderStatusToCommon(status: BinanceOrderStatus | string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
        [BinanceOrderStatus.NEW]: OrderStatus.NEW,
        [BinanceOrderStatus.PARTIALLY_FILLED]: OrderStatus.PARTIALLY_FILLED,
        [BinanceOrderStatus.FILLED]: OrderStatus.FILLED,
        [BinanceOrderStatus.CANCELED]: OrderStatus.CANCELED,
        [BinanceOrderStatus.REJECTED]: OrderStatus.REJECTED,
        [BinanceOrderStatus.EXPIRED]: OrderStatus.EXPIRED,
        [BinanceOrderStatus.NEW_INSURANCE]: OrderStatus.NEW,
        [BinanceOrderStatus.NEW_ADL]: OrderStatus.NEW
    };
    return mapping[status] ?? OrderStatus.NEW;
}

/**
 * Map Algo order status to common OrderStatus.
 *
 * @remarks
 * Algo orders have different status values than regular orders:
 * - NEW: Algo order is active, waiting to trigger
 * - TRIGGERING: Trigger condition met, placing sub-order
 * - TRIGGERED: Sub-order has been placed in matching engine
 * - FINISHED: Order completed (filled or canceled) in matching engine (2024+)
 * - CANCELLED: Algo order was canceled before triggering
 * - REJECTED: Algo order was rejected by matching engine
 * - EXPIRED: Algo order expired by system
 *
 * @param status - Algo order status
 * @returns Common OrderStatus
 */
export function mapAlgoOrderStatusToCommon(status: AlgoOrderStatus | string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
        [AlgoOrderStatus.NEW]: OrderStatus.PENDING,           // Waiting for trigger
        [AlgoOrderStatus.TRIGGERING]: OrderStatus.PENDING,    // Processing trigger
        [AlgoOrderStatus.TRIGGERED]: OrderStatus.NEW,         // Sub-order placed
        [AlgoOrderStatus.FINISHED]: OrderStatus.FILLED,       // Completed in matching engine
        [AlgoOrderStatus.EXECUTED]: OrderStatus.FILLED,       // Fully executed (legacy)
        [AlgoOrderStatus.CANCELLED]: OrderStatus.CANCELED,
        [AlgoOrderStatus.REJECTED]: OrderStatus.REJECTED,
        [AlgoOrderStatus.EXPIRED]: OrderStatus.EXPIRED
    };
    return mapping[status] ?? OrderStatus.PENDING;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Time In Force Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Binance time in force to common TimeInForce.
 *
 * @remarks
 * GTX (Good-Til-Crossing) is Binance's post-only mode. In the common interface,
 * we map GTX to GTC and set the postOnly flag separately since GTX represents
 * both time-in-force behavior (GTC) AND post-only execution mode.
 *
 * @param tif - Binance time in force
 * @returns Common TimeInForce
 */
export function mapBinanceTimeInForceToCommon(tif: BinanceTimeInForce | string): TimeInForce {
    const mapping: Record<string, TimeInForce> = {
        [BinanceTimeInForce.GTC]: TimeInForce.GTC,
        [BinanceTimeInForce.IOC]: TimeInForce.IOC,
        [BinanceTimeInForce.FOK]: TimeInForce.FOK,
        [BinanceTimeInForce.GTD]: TimeInForce.GTD,
        // GTX is GTC with post-only enforcement; postOnly flag handles the distinction
        [BinanceTimeInForce.GTX]: TimeInForce.GTC
    };
    return mapping[tif] ?? TimeInForce.GTC;
}

/**
 * Map common TimeInForce to Binance time in force.
 *
 * @param tif - Common TimeInForce
 * @param isPostOnly - Whether the order should be post-only (returns GTX if true)
 * @returns Binance time in force
 */
export function mapCommonTimeInForceToBinance(tif: TimeInForce, isPostOnly: boolean = false): BinanceTimeInForce {
    // If post-only and GTC, use GTX
    if (isPostOnly && tif === TimeInForce.GTC) {
        return BinanceTimeInForce.GTX;
    }

    const mapping: Record<TimeInForce, BinanceTimeInForce> = {
        [TimeInForce.GTC]: BinanceTimeInForce.GTC,
        [TimeInForce.IOC]: BinanceTimeInForce.IOC,
        [TimeInForce.FOK]: BinanceTimeInForce.FOK,
        [TimeInForce.GTD]: BinanceTimeInForce.GTD
    };
    return mapping[tif];
}

/**
 * Determine if a Binance order is post-only based on timeInForce.
 *
 * @param tif - Binance time in force
 * @returns true if post-only (GTX)
 */
export function isPostOnlyOrder(tif: BinanceTimeInForce | string): boolean {
    return tif === BinanceTimeInForce.GTX || tif === 'GTX';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Regular Order Mapping (ORDER_TRADE_UPDATE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Binance OrderUpdate to common IOrder interface.
 *
 * @param order - Binance OrderUpdate from user data stream (ORDER_TRADE_UPDATE)
 * @returns Common IOrder interface
 *
 * @example
 * ```typescript
 * const binanceOrder = parseOrderTradeUpdate(rawEvent);
 * const commonOrder = mapBinanceOrderToIOrder(binanceOrder);
 * console.log(commonOrder.orderId, commonOrder.status);
 * ```
 */
export function mapBinanceOrderToIOrder(order: OrderUpdate): IOrder {
    const postOnly = isPostOnlyOrder(order.timeInForce);

    return {
        orderId: String(order.orderId),
        clientOrderId: order.clientOrderId || undefined,
        instrument: order.symbol,
        side: mapBinanceSideToCommon(order.side),
        type: mapBinanceOrderTypeToCommon(order.orderType),
        quantity: String(order.originalQuantity),
        filledQuantity: String(order.filledQuantity),
        price: order.originalPrice > 0 ? String(order.originalPrice) : undefined,
        stopPrice: order.stopPrice > 0 ? String(order.stopPrice) : undefined,
        averagePrice: order.averagePrice > 0 ? String(order.averagePrice) : undefined,
        status: mapBinanceOrderStatusToCommon(order.orderStatus),
        timeInForce: mapBinanceTimeInForceToCommon(order.timeInForce),
        reduceOnly: order.isReduceOnly,
        postOnly,
        createdAt: order.eventTime,
        updatedAt: order.tradeTime || order.transactionTime,
        providerData: order
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Algo Order Mapping (ALGO_UPDATE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Binance AlgoOrderUpdate to common IOrder interface.
 *
 * @remarks
 * Algo orders (STOP, TAKE_PROFIT, TRAILING_STOP) are managed by Binance's
 * Algo Service and receive updates via the ALGO_UPDATE stream instead of
 * ORDER_TRADE_UPDATE. This mapper normalizes algo orders to the same
 * IOrder interface for consistent handling.
 *
 * Key differences from regular orders:
 * - Uses `algoId` as the order identifier (prefixed with 'ALGO:')
 * - Status mapping differs (NEW means waiting for trigger, not placed)
 * - May have an associated `orderId` when triggered
 *
 * @param algoOrder - Binance AlgoOrderUpdate from ALGO_UPDATE stream
 * @returns Common IOrder interface
 *
 * @example
 * ```typescript
 * const algoOrder = parseAlgoOrderUpdate(rawEvent);
 * const commonOrder = mapBinanceAlgoOrderToIOrder(algoOrder);
 * console.log(commonOrder.orderId, commonOrder.status);
 * ```
 */
export function mapBinanceAlgoOrderToIOrder(algoOrder: AlgoOrderUpdate): IOrder {
    // Use algoId as primary identifier, prefixed to distinguish from regular orders
    // If triggered, orderId is available but algoId remains the stable identifier
    const orderId = `ALGO:${algoOrder.algoId}`;
    const postOnly = isPostOnlyOrder(algoOrder.timeInForce);

    return {
        orderId,
        clientOrderId: algoOrder.clientAlgoId || undefined,
        instrument: algoOrder.symbol,
        side: mapBinanceSideToCommon(algoOrder.side),
        type: mapBinanceOrderTypeToCommon(algoOrder.orderType),
        quantity: String(algoOrder.quantity),
        filledQuantity: String(algoOrder.filledQuantity),
        price: algoOrder.price > 0 ? String(algoOrder.price) : undefined,
        stopPrice: algoOrder.stopPrice > 0 ? String(algoOrder.stopPrice) : undefined,
        averagePrice: algoOrder.averagePrice > 0 ? String(algoOrder.averagePrice) : undefined,
        status: mapAlgoOrderStatusToCommon(algoOrder.status),
        timeInForce: mapBinanceTimeInForceToCommon(algoOrder.timeInForce),
        reduceOnly: algoOrder.isReduceOnly,
        postOnly,
        createdAt: algoOrder.eventTime,
        updatedAt: algoOrder.transactionTime,
        providerData: algoOrder
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Unified Mapping (handles both types)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map any Binance order (regular or algo) to common IOrder interface.
 *
 * @remarks
 * This is the primary mapping function that handles both ORDER_TRADE_UPDATE
 * and ALGO_UPDATE events uniformly. Use this when you have a mixed collection
 * of orders or don't know the order type in advance.
 *
 * @param order - Either OrderUpdate or AlgoOrderUpdate
 * @returns Common IOrder interface
 *
 * @example
 * ```typescript
 * // Works with both types
 * const commonOrder = mapAnyBinanceOrderToIOrder(order);
 *
 * // Access provider-specific data if needed
 * if (isAlgoOrder(order)) {
 *     console.log('Algo order:', order.algoId);
 * }
 * ```
 */
export function mapAnyBinanceOrderToIOrder(order: OrderUpdate | AlgoOrderUpdate): IOrder {
    if (isAlgoOrder(order)) {
        return mapBinanceAlgoOrderToIOrder(order);
    }
    return mapBinanceOrderToIOrder(order);
}

// ═══════════════════════════════════════════════════════════════════════════════
// REST API Response Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Binance REST API order response to common IOrder interface.
 *
 * @param response - Binance order response from REST API
 * @returns Common IOrder interface
 *
 * @example
 * ```typescript
 * const result = await binanceClient.getOrder(symbol, orderId);
 * if (result.success) {
 *     const commonOrder = mapBinanceOrderResponseToIOrder(result.data);
 * }
 * ```
 */
export function mapBinanceOrderResponseToIOrder(response: {
    orderId: number;
    clientOrderId?: string;
    symbol: string;
    side: string;
    type: string;
    origQty: string;
    executedQty: string;
    price: string;
    stopPrice?: string;
    avgPrice?: string;
    status: string;
    timeInForce: string;
    reduceOnly: boolean;
    time?: number;
    updateTime: number;
}): IOrder {
    const postOnly = isPostOnlyOrder(response.timeInForce as BinanceTimeInForce);

    return {
        orderId: String(response.orderId),
        clientOrderId: response.clientOrderId || undefined,
        instrument: response.symbol,
        side: mapBinanceSideToCommon(response.side as BinanceOrderSide),
        type: mapBinanceOrderTypeToCommon(response.type as BinanceOrderType),
        quantity: response.origQty,
        filledQuantity: response.executedQty,
        price: parseFloat(response.price) > 0 ? response.price : undefined,
        stopPrice: response.stopPrice && parseFloat(response.stopPrice) > 0
            ? response.stopPrice
            : undefined,
        averagePrice: response.avgPrice && parseFloat(response.avgPrice) > 0
            ? response.avgPrice
            : undefined,
        status: mapBinanceOrderStatusToCommon(response.status as BinanceOrderStatus),
        timeInForce: mapBinanceTimeInForceToCommon(response.timeInForce as BinanceTimeInForce),
        reduceOnly: response.reduceOnly,
        postOnly,
        createdAt: response.time || response.updateTime,
        updatedAt: response.updateTime,
        providerData: response
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if an order is a conditional/algo order type.
 *
 * @param type - Order type to check
 * @returns true if conditional order (STOP, TAKE_PROFIT, TRAILING_STOP)
 */
export function isConditionalOrderType(type: OrderType): boolean {
    return [
        OrderType.STOP_LIMIT,
        OrderType.STOP_MARKET,
        OrderType.TAKE_PROFIT_LIMIT,
        OrderType.TAKE_PROFIT_MARKET,
        OrderType.TRAILING_STOP_MARKET
    ].includes(type);
}

/**
 * Extract the real order ID from a mapped order.
 *
 * @remarks
 * Algo orders are prefixed with 'ALGO:' to distinguish them from regular orders.
 * This function extracts the numeric ID for API calls.
 *
 * @param mappedOrderId - The orderId from IOrder
 * @returns Object with the raw ID and whether it's an algo order
 */
export function parseOrderId(mappedOrderId: string): { id: string; isAlgo: boolean } {
    if (mappedOrderId.startsWith('ALGO:')) {
        return {
            id: mappedOrderId.substring(5),
            isAlgo: true
        };
    }
    return {
        id: mappedOrderId,
        isAlgo: false
    };
}

