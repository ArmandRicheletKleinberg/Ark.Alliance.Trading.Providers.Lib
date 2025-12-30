/**
 * @fileoverview Domain Events Barrel Export
 * @module domain/events
 *
 * Provides centralized exports for all domain events in the Binance provider library.
 * Import from this module for access to all event classes, types, and enums.
 *
 * @example
 * ```typescript
 * import {
 *     BaseEvent,
 *     EventType,
 *     EventSource,
 *     OrderFilledEvent,
 *     PositionOpenedEvent
 * } from '../domain/events';
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Base Classes and Enums
// ═══════════════════════════════════════════════════════════════════════════════

export { BaseEvent } from './BaseEvent';
export { EventType } from './EventType';
export { EventSource } from './EventSource';

// ═══════════════════════════════════════════════════════════════════════════════
// Account Events
// ═══════════════════════════════════════════════════════════════════════════════

export {
    AccountUpdatedEvent,
    MarginCallEvent,
    BalanceChangedEvent,
    type BalanceChangeInfo,
    type PositionAtRiskInfo
} from './AccountEvents';

// ═══════════════════════════════════════════════════════════════════════════════
// Order Events
// ═══════════════════════════════════════════════════════════════════════════════

export {
    OrderCreatedEvent,
    OrderFilledEvent,
    OrderCancelledEvent,
    OrderExpiredEvent,
    OrderRejectedEvent,
    type OrderSide,
    type OrderType,
    type OrderStatus,
    type TimeInForce
} from './OrderEvents';

// ═══════════════════════════════════════════════════════════════════════════════
// Position Events
// ═══════════════════════════════════════════════════════════════════════════════

export {
    PositionOpenedEvent,
    PositionUpdatedEvent,
    PositionClosedEvent,
    type PositionSide,
    type MarginType,
    type PositionSnapshot
} from './PositionDomainEvents';

// ═══════════════════════════════════════════════════════════════════════════════
// Strategy Events
// ═══════════════════════════════════════════════════════════════════════════════

export {
    STRATEGY_EVENTS,
    type StrategyEventType,
    type StrategyEventBase,
    type StrategyLifecycleEvent,
    type SignalEvent,
    type ExecutionEvent,
    type PositionEvent,
    type StrategyEvent
} from './StrategyEvents';


// ═══════════════════════════════════════════════════════════════════════════════
// System Events
// ═══════════════════════════════════════════════════════════════════════════════

export {
    ConnectionEstablishedEvent,
    ConnectionLostEvent,
    SystemErrorEvent
} from './SystemEvents';
