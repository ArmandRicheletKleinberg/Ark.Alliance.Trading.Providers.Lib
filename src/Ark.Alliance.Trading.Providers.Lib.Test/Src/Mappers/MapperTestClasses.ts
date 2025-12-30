/**
 * @fileoverview Binance Mapper Test Classes
 * @module Tests/Binance/Mappers/MapperTestClasses
 *
 * Provides test wrapper classes for the Binance mappers that can be
 * instantiated and invoked by the ReflectionTestEngine.
 */

import { join } from 'path';

// Dynamic import paths to the provider library
// __dirname = Ark.Alliance.Trading.Providers.Lib.Test/Src/Mappers
// Need to go: .. (Src) -> .. (Lib.Test) -> .. (Trading.Bot-React) -> into Lib/Src
const providerLibPath = join(__dirname, '..', '..', '..', 'Ark.Alliance.Trading.Providers.Lib', 'Src');

// Import mappers dynamically
const OrderMapper = require(join(providerLibPath, 'Binance', 'mappers', 'OrderMapper'));
const PositionMapper = require(join(providerLibPath, 'Binance', 'mappers', 'PositionMapper'));

// Type imports (for documentation and inline usage)
type IOrder = any;
type OrderUpdate = any;
type AlgoOrderUpdate = any;

// Extract functions
const {
    isAlgoOrder,
    isRegularOrder,
    mapBinanceOrderToIOrder,
    mapBinanceAlgoOrderToIOrder,
    mapAnyBinanceOrderToIOrder,
    parseOrderId,
    isConditionalOrderType
} = OrderMapper;

const {
    mapBinancePositionRiskToIPosition,
    filterActivePositions,
    isActivePosition
} = PositionMapper;

// ═══════════════════════════════════════════════════════════════════════════════
// Order Mapper Test Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test class for OrderMapper functions.
 * Wraps pure mapper functions in a class for ReflectionTestEngine compatibility.
 */
export class OrderMapperTests {
    /**
     * Test mapBinanceOrderToIOrder with mock OrderUpdate data.
     */
    public testMapBinanceOrderToIOrder(params: { mockOrder: Partial<OrderUpdate> }): {
        success: boolean;
        data: IOrder;
    } {
        try {
            const result = mapBinanceOrderToIOrder(params.mockOrder as OrderUpdate);
            return { success: true, data: result };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Test mapBinanceAlgoOrderToIOrder with mock AlgoOrderUpdate data.
     */
    public testMapBinanceAlgoOrderToIOrder(params: { mockAlgoOrder: Partial<AlgoOrderUpdate> }): {
        success: boolean;
        data: IOrder;
    } {
        try {
            const result = mapBinanceAlgoOrderToIOrder(params.mockAlgoOrder as AlgoOrderUpdate);
            return { success: true, data: result };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Test mapAnyBinanceOrderToIOrder unified mapper.
     */
    public testMapAnyBinanceOrderToIOrder(params: { mockOrder: Partial<OrderUpdate | AlgoOrderUpdate> }): {
        success: boolean;
        data: IOrder;
    } {
        try {
            const result = mapAnyBinanceOrderToIOrder(params.mockOrder as OrderUpdate | AlgoOrderUpdate);
            return { success: true, data: result };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Test isAlgoOrder type guard.
     */
    public testIsAlgoOrder(params: {
        algoOrder: Partial<AlgoOrderUpdate>;
        regularOrder: Partial<OrderUpdate>;
    }): {
        success: boolean;
        data: {
            algoOrderResult: boolean;
            regularOrderResult: boolean;
        };
    } {
        const algoResult = isAlgoOrder(params.algoOrder as AlgoOrderUpdate);
        const regularResult = isAlgoOrder(params.regularOrder as OrderUpdate);

        return {
            success: true,
            data: {
                algoOrderResult: algoResult,
                regularOrderResult: regularResult
            }
        };
    }

    /**
     * Test parseOrderId utility function.
     */
    public testParseOrderId(params: {
        algoOrderId: string;
        regularOrderId: string;
    }): {
        success: boolean;
        data: {
            algoResult: { id: string; isAlgo: boolean };
            regularResult: { id: string; isAlgo: boolean };
        };
    } {
        const algoResult = parseOrderId(params.algoOrderId);
        const regularResult = parseOrderId(params.regularOrderId);

        return {
            success: true,
            data: {
                algoResult,
                regularResult
            }
        };
    }

    /**
     * Test isConditionalOrderType utility function.
     */
    public testIsConditionalOrderType(params: {
        orderTypes: string[];
    }): {
        success: boolean;
        data: Record<string, boolean>;
    } {
        const results: Record<string, boolean> = {};
        for (const type of params.orderTypes) {
            results[type] = isConditionalOrderType(type as any);
        }

        return {
            success: true,
            data: results
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Position Mapper Test Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test class for PositionMapper functions.
 */
export class PositionMapperTests {
    /**
     * Test mapBinancePositionRiskToIPosition with mock position data.
     */
    public testMapBinancePositionRiskToIPosition(params: { mockPosition: any }): {
        success: boolean;
        data: any;
    } {
        try {
            const result = mapBinancePositionRiskToIPosition(params.mockPosition);
            return { success: true, data: result };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Test filterActivePositions with array of positions.
     */
    public testFilterActivePositions(params: { mockPositions: any[] }): {
        success: boolean;
        data: {
            activeCount: number;
            filteredSymbols: string[];
        };
    } {
        const activePositions = filterActivePositions(params.mockPositions);

        return {
            success: true,
            data: {
                activeCount: activePositions.length,
                filteredSymbols: activePositions.map((p: { symbol: string }) => p.symbol)
            }
        };
    }

    /**
     * Test isActivePosition utility function.
     */
    public testIsActivePosition(params: { mockPosition: any }): {
        success: boolean;
        data: boolean;
    } {
        const result = isActivePosition(params.mockPosition);
        return { success: true, data: result };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Functions for Test Engine
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get mapper test class factories for registration with ReflectionTestEngine.
 */
export function getMapperTestClassFactories() {
    return [
        {
            className: 'OrderMapperTests',
            factory: () => new OrderMapperTests()
        },
        {
            className: 'PositionMapperTests',
            factory: () => new PositionMapperTests()
        }
    ];
}

/**
 * Register mapper test classes with the engine.
 */
export function registerMapperTestClasses(engine: any): void {
    const factories = getMapperTestClassFactories();
    for (const factory of factories) {
        engine.registerClass(factory);
    }
    console.log(`[MapperTestClasses] Registered ${factories.length} mapper test classes`);
}
