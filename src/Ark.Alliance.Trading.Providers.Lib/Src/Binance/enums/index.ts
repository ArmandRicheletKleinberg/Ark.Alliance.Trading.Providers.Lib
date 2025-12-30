/**
 * @fileoverview Enums Barrel Export
 * @module enums
 *
 * Centralized exports for all enumerations in the Binance provider library.
 * Use these enums instead of inline string literals for type safety.
 *
 * @example
 * ```typescript
 * import {
 *     OrderSide,
 *     OrderType,
 *     PositionSide,
 *     TimeInForce,
 *     getOppositeSide
 * } from '../enums';
 *
 * const side = OrderSide.BUY;
 * const opposite = getOppositeSide(side); // OrderSide.SELL
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Order Enums
// ═══════════════════════════════════════════════════════════════════════════════

export {
    OrderSide,
    getOppositeSide,
    type OrderSideType
} from './OrderSide';

export {
    OrderType,
    requiresPrice,
    requiresStopPrice,
    isConditionalOrder,
    type OrderTypeType
} from './OrderType';

export {
    OrderStatus,
    isTerminalStatus,
    isActiveStatus,
    hasBeenFilled,
    type OrderStatusType
} from './OrderStatus';

export {
    OrderCategory,
    type OrderCategoryType
} from './OrderCategory';

export {
    TimeInForce,
    isPostOnly,
    type TimeInForceType
} from './TimeInForce';

export {
    ExecutionType,
    isTradeExecution,
    type ExecutionTypeType
} from './ExecutionType';

export {
    WorkingType,
    type WorkingTypeType
} from './WorkingType';

// ═══════════════════════════════════════════════════════════════════════════════
// Position Enums
// ═══════════════════════════════════════════════════════════════════════════════

export {
    PositionSide,
    PositionDirection,
    getPositionDirection,
    getPositionOrderSide,
    isPositionInversion,
    type PositionSideType,
    type PositionDirectionType
} from './PositionSide';

export {
    MarginType,
    type MarginTypeType
} from './MarginType';

// ═══════════════════════════════════════════════════════════════════════════════
// System Enums
// ═══════════════════════════════════════════════════════════════════════════════

export {
    BinanceEnvironment,
    isMainnet,
    isTestnet,
    type BinanceEnvironmentType
} from './BinanceEnvironment';

export {
    RateLimitType,
    RateLimitInterval,
    type RateLimitTypeType,
    type RateLimitIntervalType
} from './RateLimit';

// ═══════════════════════════════════════════════════════════════════════════════
// Market Data Enums
// ═══════════════════════════════════════════════════════════════════════════════

export {
    KlineInterval,
    ALL_KLINE_INTERVALS,
    MINUTE_INTERVALS,
    HOUR_INTERVALS,
    LONG_INTERVALS,
    getIntervalMs,
    getIntervalLabel,
    isValidKlineInterval,
    parseKlineInterval,
    type KlineIntervalType
} from './KlineInterval';

export {
    ContractType,
    type ContractTypeType
} from './ContractType';

export {
    SymbolStatus,
    isTradingAllowed,
    type SymbolStatusType
} from './SymbolStatus';

export {
    FilterType,
    type FilterTypeType
} from './FilterType';

// ═══════════════════════════════════════════════════════════════════════════════
// Account Enums
// ═══════════════════════════════════════════════════════════════════════════════

export {
    AccountUpdateReason,
    isTradingRelated,
    type AccountUpdateReasonType
} from './AccountUpdateReason';

export {
    UniversalTransferType,
    getTransferSource,
    getTransferDestination,
    involvesUsdmFutures,
    type UniversalTransferTypeType
} from './UniversalTransferType';

export {
    MarginModifyType,
    type MarginModifyTypeValue
} from './MarginModifyType';

// ═══════════════════════════════════════════════════════════════════════════════
// User Data Stream Enums
// ═══════════════════════════════════════════════════════════════════════════════

export {
    UserDataEventType,
    GridStrategyStatus,
    ExpiryReasonCode,
    isGridStrategyActive,
    getExpiryReasonDescription,
    type UserDataEventTypeType,
    type GridStrategyStatusType,
    type ExpiryReasonCodeType
} from './UserDataStreamEnums';

