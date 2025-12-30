/**
 * @fileoverview Binance Mappers Barrel Export
 * @module Binance/mappers
 *
 * Provides centralized exports for all Binance-to-Common interface mappers.
 *
 * @remarks
 * These mappers enable interoperability between Binance-specific types
 * and the provider-agnostic interfaces defined in Common/Domain.
 *
 * @example
 * ```typescript
 * import {
 *     mapBinanceOrderToIOrder,
 *     mapBinanceAlgoOrderToIOrder,
 *     mapBinancePositionRiskToIPosition,
 *     mapBinanceKlineToIKline
 * } from './mappers';
 *
 * const commonOrder = mapBinanceOrderToIOrder(binanceOrder);
 * const commonPosition = mapBinancePositionRiskToIPosition(binancePosition);
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Order Mappers
// ═══════════════════════════════════════════════════════════════════════════════

export {
    // Type Guards
    isAlgoOrder,
    isRegularOrder,

    // Side Mapping
    mapBinanceSideToCommon,
    mapCommonSideToBinance,

    // Order Type Mapping
    mapBinanceOrderTypeToCommon,
    mapCommonOrderTypeToBinance,

    // Order Status Mapping
    mapBinanceOrderStatusToCommon,
    mapAlgoOrderStatusToCommon,

    // Time In Force Mapping
    mapBinanceTimeInForceToCommon,
    mapCommonTimeInForceToBinance,
    isPostOnlyOrder,

    // Full Order Mapping
    mapBinanceOrderToIOrder,
    mapBinanceAlgoOrderToIOrder,
    mapAnyBinanceOrderToIOrder,
    mapBinanceOrderResponseToIOrder,

    // Utilities
    isConditionalOrderType,
    parseOrderId
} from './OrderMapper';

// ═══════════════════════════════════════════════════════════════════════════════
// Position Mappers
// ═══════════════════════════════════════════════════════════════════════════════

export {
    // Direction Mapping
    getPositionDirectionFromAmount,

    // Margin Type Mapping
    mapBinanceMarginTypeToCommon,
    mapCommonMarginTypeToBinance,

    // Full Position Mapping
    mapBinancePositionToIPosition,
    mapBinancePositionRiskToIPosition,
    mapBinancePositionsToIPositions,

    // Utilities
    isActivePosition,
    filterActivePositions
} from './PositionMapper';

// ═══════════════════════════════════════════════════════════════════════════════
// Market Data Mappers
// ═══════════════════════════════════════════════════════════════════════════════

export {
    // Quote Mapping
    mapBinanceBookTickerToIQuote,

    // Ticker Mapping
    mapBinanceTicker24hrToITicker,
    mapBinanceTickersToITicker,

    // Order Book Mapping
    mapBinanceOrderBookLevelToILevel,
    mapBinanceOrderBookToIOrderBook,

    // Trade Mapping
    mapBinanceTradeToITrade,
    mapBinanceAggTradeToITrade,

    // Kline Mapping
    mapBinanceKlineToIKline,
    mapBinanceKlinesToIKlines
} from './MarketDataMapper';

