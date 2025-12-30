/**
 * @fileoverview Deribit Mappers Barrel Export
 * @module Deribit/mappers
 *
 * Centralized exports for all Deribit mapping functions.
 * All mappers are pure functions for DTO transformations.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Order Mappers
// ═══════════════════════════════════════════════════════════════════════════════

export {
    // Type mappers
    mapDirectionToOrderSide,
    mapDeribitOrderTypeToOrderType,
    mapOrderStateToOrderStatus,
    mapTimeInForceToCommon,
    // Status helpers
    isActiveOrder,
    isTerminalOrder,
    isPartiallyFilled,
    getFillPercentage,
    // Main mappers
    mapDeribitOrderToIOrder,
    mapDeribitOrderUpdateToIOrder,
    mapDeribitOrdersToIOrders,
    mapDeribitOrderUpdatesToIOrders
} from './DeribitOrderMapper';

// ═══════════════════════════════════════════════════════════════════════════════
// Position Mappers
// ═══════════════════════════════════════════════════════════════════════════════

export {
    // Type mappers
    getPositionDirection,
    // Status helpers
    isActivePosition,
    isFlatPosition,
    calculateUnrealizedPnlPercent,
    getPositionSide,
    getAbsoluteSize,
    // Main mappers
    mapDeribitPositionToIPosition,
    mapDeribitPositionUpdateToIPosition,
    mapDeribitPositionsToIPositions,
    mapDeribitPositionUpdatesToIPositions,
    filterActivePositions
} from './DeribitPositionMapper';

// ═══════════════════════════════════════════════════════════════════════════════
// Account Mappers
// ═══════════════════════════════════════════════════════════════════════════════

export {
    // Types
    type IAccountSummary,
    MARGIN_THRESHOLDS,
    // Helpers
    calculateMarginRatio,
    isMarginWarning,
    isMarginCritical,
    getAvailableMarginPercent,
    getTotalSessionPnl,
    getFuturesSessionPnl,
    getOptionsSessionPnl,
    // Main mappers
    mapAccountSummaryToCommon,
    mapAccountSummariesToCommon,
    getAccountDisplaySummary
} from './DeribitAccountMapper';
