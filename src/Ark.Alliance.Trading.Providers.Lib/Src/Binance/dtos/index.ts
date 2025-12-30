/**
 * @fileoverview Models Barrel Export
 * @module models
 *
 * Provides centralized exports for all models in the Binance provider library.
 * Models are organized by category:
 * - binance: Binance API specific types and parsers
 * - events: Legacy event types (deprecated, use domain/events instead)
 * - position: Position-related models
 * - userDataStream: User data stream event models
 *
 * @example
 * ```typescript
 * import {
 *     Position,
 *     OrderUpdate,
 *     parseOrderTradeUpdate,
 *     AccountBalance
 * } from '../models';
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Result Pattern (re-exported from Common for backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

export {
    Result,
    type ServiceResult,
    successResult,
    errorResult
} from '../../Common/result';

// ═══════════════════════════════════════════════════════════════════════════════
// Binance API Models
// ═══════════════════════════════════════════════════════════════════════════════

export {
    AssetBalance,
    AccountPosition,
    AccountBalance,
    AccountStatusRawResponse,
    parseAccountStatus
} from './binance/AccountBalance';

export {
    AlgoOrderStatus,
    AlgoOrderUpdateRaw,
    AlgoOrderUpdate,
    parseAlgoOrderUpdate,
    type AlgoType
} from './binance/AlgoOrderUpdate';

export {
    BinanceOrderResponse,
    OrderBook,
    ListenKeyResponse,
    LeverageResponse,
    AccountUpdateEvent,
    BalanceUpdate,
    PositionUpdateRaw,
    OrderTradeUpdateEvent,
    RateLimitInfo
} from './binance/BinanceTypes';

export {
    ConditionalOrderTriggerRejectRaw,
    ConditionalOrderTriggerReject,
    parseConditionalOrderTriggerReject
} from './binance/ConditionalOrderTriggerReject';

export {
    // Note: Enums (OrderSide, OrderType, etc.) are exported from ./enums barrel
    ExpiryReason,
    OrderTradeUpdateRaw,
    OrderUpdate,
    parseOrderTradeUpdate
} from './binance/OrderUpdate';

export {
    BinanceRateLimit,
    RateLimitStatus,
    RateLimitSummary
    // Note: RateLimitType and RateLimitInterval are exported from ./enums barrel
} from './binance/RateLimits';

export {
    UniversalTransferRequest,
    UniversalTransferResponse,
    TransferRecord,
    TransferHistoryQuery,
    TransferHistoryResponse
    // Note: UniversalTransferType is exported from ./enums barrel
} from './binance/TransferTypes';

// ═══════════════════════════════════════════════════════════════════════════════
// Position Models
// ═══════════════════════════════════════════════════════════════════════════════

export {
    Position,
    PositionUpdate,
    PositionRisk,
    // Note: PositionSide and MarginType are exported from ./enums barrel
} from './position/Position';

// ═══════════════════════════════════════════════════════════════════════════════
// User Data Stream Models
// ═══════════════════════════════════════════════════════════════════════════════

export * from './userDataStream';


// ═══════════════════════════════════════════════════════════════════════════════
// Legacy Event Types (use domain/events for new code)
// ═══════════════════════════════════════════════════════════════════════════════

export {
    POSITION_EVENTS,
    PositionEventPayload,
    ClickEventPayload,
    InversionEventPayload,
    StrategyStatusEventPayload,
    ErrorEventPayload,
    RetryLimitEventPayload,
    type EventPayload
} from './events/PositionEvents';

// ═══════════════════════════════════════════════════════════════════════════════
// Market Data Models
// ═══════════════════════════════════════════════════════════════════════════════

export * from './marketData';
