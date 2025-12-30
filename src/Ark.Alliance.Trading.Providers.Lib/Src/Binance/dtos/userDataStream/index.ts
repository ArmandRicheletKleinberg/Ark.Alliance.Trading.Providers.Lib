/**
 * @fileoverview User Data Stream DTOs Barrel Export
 * @module dtos/userDataStream
 * 
 * Centralized exports for all User Data Stream event models.
 * Reference: Binance USDⓈ-M Futures User Data Streams
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Account Update (Existing)
// ═══════════════════════════════════════════════════════════════════════════════

export {
    AccountUpdateReason,
    BalanceStreamUpdate,
    PositionStreamUpdate,
    AccountUpdateStreamEvent,
    AccountUpdateRaw,
    type AccountUpdateReasonType
} from './AccountUpdateStreamEvent';

// ═══════════════════════════════════════════════════════════════════════════════
// Margin Call (Existing)
// ═══════════════════════════════════════════════════════════════════════════════

export {
    MarginCallPosition,
    MarginCallStreamEvent,
    MarginCallRaw
} from './MarginCallStreamEvent';

// ═══════════════════════════════════════════════════════════════════════════════
// Listen Key Expired (New)
// ═══════════════════════════════════════════════════════════════════════════════

export {
    ListenKeyExpiredRaw,
    ListenKeyExpiredEvent,
    parseListenKeyExpired,
    isListenKeyExpiredEvent
} from './ListenKeyExpiredEvent';

// ═══════════════════════════════════════════════════════════════════════════════
// Trade Lite (New)
// ═══════════════════════════════════════════════════════════════════════════════

export {
    TradeLiteRaw,
    TradeLiteEvent,
    parseTradeLite,
    isTradeLiteEvent
} from './TradeLiteStreamEvent';

// ═══════════════════════════════════════════════════════════════════════════════
// Account Config Update (New)
// ═══════════════════════════════════════════════════════════════════════════════

export {
    AccountConfigUpdateRaw,
    LeverageUpdate,
    AccountConfigUpdateEvent,
    parseAccountConfigUpdate,
    isAccountConfigUpdateEvent
} from './AccountConfigUpdateEvent';

// ═══════════════════════════════════════════════════════════════════════════════
// Grid Update (New)
// ═══════════════════════════════════════════════════════════════════════════════

export {
    GridUpdateRaw,
    GridStrategyData,
    GridUpdateEvent,
    parseGridUpdate,
    isGridUpdateEvent
} from './GridUpdateStreamEvent';

// ═══════════════════════════════════════════════════════════════════════════════
// Conditional Order Reject (New)
// ═══════════════════════════════════════════════════════════════════════════════

export {
    ConditionalOrderRejectRaw,
    ConditionalOrderRejectEvent,
    parseConditionalOrderReject,
    isConditionalOrderRejectEvent
} from './ConditionalOrderRejectEvent';

// ═══════════════════════════════════════════════════════════════════════════════
// Algo Update (New)
// ═══════════════════════════════════════════════════════════════════════════════

export {
    AlgoUpdateRaw,
    AlgoUpdateEvent,
    parseAlgoUpdate,
    isAlgoUpdateEvent
} from './AlgoUpdateStreamEvent';
