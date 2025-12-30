/**
 * @fileoverview Order Generator
 * @module Mocks/Generators/OrderGenerator
 *
 * Generates realistic mock order data for all Binance order types and statuses.
 * Supports the full order lifecycle from NEW to FILLED/CANCELED/EXPIRED.
 *
 * @remarks
 * Covers all order types:
 * - MARKET, LIMIT
 * - STOP, STOP_MARKET
 * - TAKE_PROFIT, TAKE_PROFIT_MARKET
 * - TRAILING_STOP_MARKET
 *
 * And all statuses:
 * - NEW, PARTIALLY_FILLED, FILLED, CANCELED, EXPIRED, REJECTED
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Order types supported by Binance Futures.
 */
export type MockOrderType =
    | 'MARKET'
    | 'LIMIT'
    | 'STOP'
    | 'STOP_MARKET'
    | 'TAKE_PROFIT'
    | 'TAKE_PROFIT_MARKET'
    | 'TRAILING_STOP_MARKET';

/**
 * Order statuses.
 */
export type MockOrderStatus =
    | 'NEW'
    | 'PARTIALLY_FILLED'
    | 'FILLED'
    | 'CANCELED'
    | 'EXPIRED'
    | 'REJECTED'
    | 'NEW_INSURANCE'
    | 'NEW_ADL';

/**
 * Order side.
 */
export type MockOrderSide = 'BUY' | 'SELL';

/**
 * Time in force.
 */
export type MockTimeInForce = 'GTC' | 'IOC' | 'FOK' | 'GTX';

/**
 * Position side.
 */
export type MockPositionSide = 'BOTH' | 'LONG' | 'SHORT';

/**
 * Working type for conditional orders.
 */
export type MockWorkingType = 'MARK_PRICE' | 'CONTRACT_PRICE';

/**
 * Configuration for generating a mock order.
 */
export interface MockOrderConfig {
    symbol?: string;
    side?: MockOrderSide;
    type?: MockOrderType;
    status?: MockOrderStatus;
    timeInForce?: MockTimeInForce;
    positionSide?: MockPositionSide;
    quantity?: number;
    price?: number;
    stopPrice?: number;
    avgPrice?: number;
    executedQty?: number;
    reduceOnly?: boolean;
    closePosition?: boolean;
    activationPrice?: number;
    callbackRate?: number;
    workingType?: MockWorkingType;
    orderId?: number;
    clientOrderId?: string;
}

/**
 * Binance OrderUpdate DTO structure.
 */
export interface MockOrderUpdate {
    orderId: number;
    clientOrderId: string;
    symbol: string;
    side: MockOrderSide;
    type: MockOrderType;
    status: MockOrderStatus;
    price: string;
    origQty: string;
    executedQty: string;
    cumQty: string;
    cumQuote: string;
    avgPrice: string;
    timeInForce: MockTimeInForce;
    reduceOnly: boolean;
    closePosition: boolean;
    positionSide: MockPositionSide;
    stopPrice?: string;
    workingType?: MockWorkingType;
    activatePrice?: string;
    priceRate?: string;
    updateTime: number;
    origType?: MockOrderType;
}

/**
 * Binance AlgoOrderUpdate DTO structure (for TRAILING_STOP_MARKET).
 */
export interface MockAlgoOrderUpdate {
    algoId: number;
    clientAlgoId: string;
    symbol: string;
    side: MockOrderSide;
    positionSide: MockPositionSide;
    totalQty: string;
    executedQty: string;
    executedAmt: string;
    avgPrice: string;
    algoStatus: MockOrderStatus;
    algoType: string;
    bookTime: number;
    updateTime: number;
    activatePrice?: string;
    callbackRate?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Generator
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates realistic mock order data for testing.
 */
export class OrderGenerator {
    private orderIdCounter: number = 100000000;
    private algoIdCounter: number = 200000000;

    /**
     * Generates a mock OrderUpdate.
     */
    public generateOrder(config: MockOrderConfig = {}): MockOrderUpdate {
        const orderId = config.orderId ?? this.orderIdCounter++;
        const symbol = config.symbol ?? 'BTCUSDT';
        const side = config.side ?? 'BUY';
        const type = config.type ?? 'MARKET';
        const status = config.status ?? 'NEW';
        const quantity = config.quantity ?? 0.001;
        const price = config.price ?? 50000;
        const executedQty = config.executedQty ?? (status === 'FILLED' ? quantity : 0);
        const avgPrice = config.avgPrice ?? (status === 'FILLED' ? price : 0);

        const order: MockOrderUpdate = {
            orderId,
            clientOrderId: config.clientOrderId ?? `mock_${orderId}`,
            symbol,
            side,
            type,
            status,
            price: type === 'MARKET' ? '0' : price.toFixed(2),
            origQty: quantity.toFixed(4),
            executedQty: executedQty.toFixed(4),
            cumQty: executedQty.toFixed(4),
            cumQuote: (executedQty * avgPrice).toFixed(2),
            avgPrice: avgPrice.toFixed(2),
            timeInForce: config.timeInForce ?? 'GTC',
            reduceOnly: config.reduceOnly ?? false,
            closePosition: config.closePosition ?? false,
            positionSide: config.positionSide ?? 'BOTH',
            updateTime: Date.now()
        };

        // Add stop price for conditional orders
        if (['STOP', 'STOP_MARKET', 'TAKE_PROFIT', 'TAKE_PROFIT_MARKET'].includes(type)) {
            order.stopPrice = (config.stopPrice ?? price * 0.98).toFixed(2);
            order.workingType = config.workingType ?? 'MARK_PRICE';
        }

        // Add activation price for trailing stop
        if (type === 'TRAILING_STOP_MARKET') {
            order.activatePrice = (config.activationPrice ?? price * 1.01).toFixed(2);
            order.priceRate = (config.callbackRate ?? 1.0).toFixed(1);
            order.workingType = config.workingType ?? 'MARK_PRICE';
        }

        return order;
    }

    /**
     * Generates a mock AlgoOrderUpdate (for trailing stop).
     */
    public generateAlgoOrder(config: MockOrderConfig = {}): MockAlgoOrderUpdate {
        const algoId = this.algoIdCounter++;
        const symbol = config.symbol ?? 'BTCUSDT';
        const side = config.side ?? 'SELL';
        const quantity = config.quantity ?? 0.001;
        const status = config.status ?? 'NEW';
        const price = config.price ?? 50000;

        return {
            algoId,
            clientAlgoId: config.clientOrderId ?? `algo_${algoId}`,
            symbol,
            side,
            positionSide: config.positionSide ?? 'BOTH',
            totalQty: quantity.toFixed(4),
            executedQty: status === 'FILLED' ? quantity.toFixed(4) : '0',
            executedAmt: status === 'FILLED' ? (quantity * price).toFixed(2) : '0',
            avgPrice: status === 'FILLED' ? price.toFixed(2) : '0',
            algoStatus: status,
            algoType: 'TRAILING_STOP_MARKET',
            bookTime: Date.now() - 60000,
            updateTime: Date.now(),
            activatePrice: (config.activationPrice ?? price * 1.02).toFixed(2),
            callbackRate: (config.callbackRate ?? 1.0).toFixed(1)
        };
    }

    /**
     * Generates a MARKET order.
     */
    public generateMarketOrder(
        symbol: string,
        side: MockOrderSide,
        quantity: number,
        fillPrice: number
    ): MockOrderUpdate {
        return this.generateOrder({
            symbol,
            side,
            type: 'MARKET',
            status: 'FILLED',
            quantity,
            avgPrice: fillPrice,
            executedQty: quantity
        });
    }

    /**
     * Generates a LIMIT order.
     */
    public generateLimitOrder(
        symbol: string,
        side: MockOrderSide,
        quantity: number,
        price: number,
        status: MockOrderStatus = 'NEW',
        timeInForce: MockTimeInForce = 'GTC'
    ): MockOrderUpdate {
        return this.generateOrder({
            symbol,
            side,
            type: 'LIMIT',
            status,
            quantity,
            price,
            timeInForce,
            executedQty: status === 'FILLED' ? quantity : 0,
            avgPrice: status === 'FILLED' ? price : 0
        });
    }

    /**
     * Generates a STOP_MARKET order.
     */
    public generateStopMarketOrder(
        symbol: string,
        side: MockOrderSide,
        quantity: number,
        stopPrice: number,
        status: MockOrderStatus = 'NEW'
    ): MockOrderUpdate {
        return this.generateOrder({
            symbol,
            side,
            type: 'STOP_MARKET',
            status,
            quantity,
            stopPrice,
            reduceOnly: true
        });
    }

    /**
     * Generates a TAKE_PROFIT_MARKET order.
     */
    public generateTakeProfitOrder(
        symbol: string,
        side: MockOrderSide,
        quantity: number,
        stopPrice: number,
        status: MockOrderStatus = 'NEW'
    ): MockOrderUpdate {
        return this.generateOrder({
            symbol,
            side,
            type: 'TAKE_PROFIT_MARKET',
            status,
            quantity,
            stopPrice,
            reduceOnly: true
        });
    }

    /**
     * Generates a TRAILING_STOP_MARKET order.
     */
    public generateTrailingStopOrder(
        symbol: string,
        side: MockOrderSide,
        quantity: number,
        activationPrice: number,
        callbackRate: number = 1.0,
        status: MockOrderStatus = 'NEW'
    ): MockOrderUpdate {
        return this.generateOrder({
            symbol,
            side,
            type: 'TRAILING_STOP_MARKET',
            status,
            quantity,
            activationPrice,
            callbackRate,
            reduceOnly: true
        });
    }

    /**
     * Generates a partially filled order.
     */
    public generatePartiallyFilledOrder(
        symbol: string,
        side: MockOrderSide,
        totalQty: number,
        filledQty: number,
        price: number
    ): MockOrderUpdate {
        return this.generateOrder({
            symbol,
            side,
            type: 'LIMIT',
            status: 'PARTIALLY_FILLED',
            quantity: totalQty,
            price,
            executedQty: filledQty,
            avgPrice: price
        });
    }

    /**
     * Generates a canceled order.
     */
    public generateCanceledOrder(
        symbol: string,
        side: MockOrderSide,
        quantity: number,
        price: number
    ): MockOrderUpdate {
        return this.generateOrder({
            symbol,
            side,
            type: 'LIMIT',
            status: 'CANCELED',
            quantity,
            price,
            executedQty: 0
        });
    }

    /**
     * Generates a rejected order.
     */
    public generateRejectedOrder(
        symbol: string,
        side: MockOrderSide,
        quantity: number,
        price: number,
        type: MockOrderType = 'LIMIT'
    ): MockOrderUpdate {
        return this.generateOrder({
            symbol,
            side,
            type,
            status: 'REJECTED',
            quantity,
            price,
            executedQty: 0
        });
    }

    /**
     * Generates an order lifecycle sequence (NEW → FILLED).
     */
    public generateOrderLifecycle(
        symbol: string,
        side: MockOrderSide,
        type: MockOrderType,
        quantity: number,
        price: number
    ): MockOrderUpdate[] {
        const orderId = this.orderIdCounter++;
        const clientOrderId = `lifecycle_${orderId}`;

        const newOrder = this.generateOrder({
            orderId,
            clientOrderId,
            symbol,
            side,
            type,
            status: 'NEW',
            quantity,
            price
        });

        const filledOrder = this.generateOrder({
            orderId,
            clientOrderId,
            symbol,
            side,
            type,
            status: 'FILLED',
            quantity,
            price,
            executedQty: quantity,
            avgPrice: price
        });

        return [newOrder, filledOrder];
    }

    /**
     * Generates all order statuses for a given type (for status mapping tests).
     */
    public generateAllStatuses(
        type: MockOrderType = 'LIMIT'
    ): Record<MockOrderStatus, MockOrderUpdate> {
        const statuses: MockOrderStatus[] = [
            'NEW', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED', 'EXPIRED', 'REJECTED'
        ];

        const orders: Record<string, MockOrderUpdate> = {};
        for (const status of statuses) {
            orders[status] = this.generateOrder({ type, status });
        }

        return orders as Record<MockOrderStatus, MockOrderUpdate>;
    }

    /**
     * Generates all order types (for type mapping tests).
     */
    public generateAllTypes(): Record<MockOrderType, MockOrderUpdate> {
        const types: MockOrderType[] = [
            'MARKET', 'LIMIT', 'STOP', 'STOP_MARKET',
            'TAKE_PROFIT', 'TAKE_PROFIT_MARKET', 'TRAILING_STOP_MARKET'
        ];

        const orders: Record<string, MockOrderUpdate> = {};
        for (const type of types) {
            orders[type] = this.generateOrder({ type });
        }

        return orders as Record<MockOrderType, MockOrderUpdate>;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a new OrderGenerator instance.
 */
export function createOrderGenerator(): OrderGenerator {
    return new OrderGenerator();
}

/**
 * Quick helper to generate a simple filled market order.
 */
export function quickMarketOrder(
    symbol: string,
    side: MockOrderSide,
    quantity: number,
    price: number
): MockOrderUpdate {
    return new OrderGenerator().generateMarketOrder(symbol, side, quantity, price);
}

/**
 * Quick helper to generate a pending limit order.
 */
export function quickLimitOrder(
    symbol: string,
    side: MockOrderSide,
    quantity: number,
    price: number
): MockOrderUpdate {
    return new OrderGenerator().generateLimitOrder(symbol, side, quantity, price, 'NEW');
}
