/**
 * @fileoverview Deribit Provider Main Export
 * @module Deribit
 *
 * Provides centralized exports for the Deribit provider library.
 * This is the main entry point for consuming the Deribit provider.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════════════════════════

export * from './enums';

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export * from './dtos';

// ═══════════════════════════════════════════════════════════════════════════════
// Shared (Constants, Errors) - Explicit exports to avoid conflicts
// ═══════════════════════════════════════════════════════════════════════════════

export {
    // Constants
    MAINNET_WS_URL,
    TESTNET_WS_URL,
    MAINNET_REST_URL,
    TESTNET_REST_URL,
    WS_PING_INTERVAL_MS,
    DEFAULT_TIMEOUT_MS,
    TOKEN_REFRESH_BUFFER_MS,
    INITIAL_RECONNECT_DELAY_MS,
    MAX_RECONNECT_DELAY_MS,
    MAX_RECONNECT_ATTEMPTS,
    JSONRPC_VERSION,
    METHODS,
    CHANNELS,
    CURRENCIES,
    // Errors
    DeribitError,
    DeribitAuthError,
    DeribitConnectionError,
    DeribitRateLimitError,
    DeribitOrderError,
    Deribit2FAError,
    ERROR_CODES,
    createErrorFromCode
} from './shared';

// ═══════════════════════════════════════════════════════════════════════════════
// Clients
// ═══════════════════════════════════════════════════════════════════════════════

export * from './clients';

// ═══════════════════════════════════════════════════════════════════════════════
// Domain Layer (Cache, Events)
// ═══════════════════════════════════════════════════════════════════════════════

export * from './domain';

// ═══════════════════════════════════════════════════════════════════════════════
// Mappers (Pure functions for DTO transformations)
// ═══════════════════════════════════════════════════════════════════════════════

// Note: Re-export specific items to avoid conflicts with domain exports
export {
    // Order mappers
    mapDirectionToOrderSide,
    mapDeribitOrderTypeToOrderType,
    mapOrderStateToOrderStatus,
    mapTimeInForceToCommon,
    isPartiallyFilled,
    getFillPercentage,
    mapDeribitOrderToIOrder,
    mapDeribitOrderUpdateToIOrder,
    mapDeribitOrdersToIOrders,
    mapDeribitOrderUpdatesToIOrders,
    // Position mappers
    getPositionDirection,
    isFlatPosition,
    calculateUnrealizedPnlPercent,
    getPositionSide,
    getAbsoluteSize,
    mapDeribitPositionToIPosition,
    mapDeribitPositionUpdateToIPosition,
    mapDeribitPositionsToIPositions,
    mapDeribitPositionUpdatesToIPositions,
    filterActivePositions,
    // Account mappers
    type IAccountSummary,
    calculateMarginRatio,
    isMarginWarning,
    isMarginCritical,
    getAvailableMarginPercent,
    getTotalSessionPnl,
    getFuturesSessionPnl,
    getOptionsSessionPnl,
    mapAccountSummaryToCommon,
    mapAccountSummariesToCommon,
    getAccountDisplaySummary
} from './mappers';

// ═══════════════════════════════════════════════════════════════════════════════
// Services
// ═══════════════════════════════════════════════════════════════════════════════

export * from './services';
