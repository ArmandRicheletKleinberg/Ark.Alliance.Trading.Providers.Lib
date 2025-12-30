/**
 * @fileoverview Deribit Domain Events
 * @module Deribit/domain/events
 *
 * Domain events for Deribit trading operations following DDD principles.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Base Event
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Event source identifiers.
 */
export enum DeribitEventSource {
    USER_DATA_STREAM = 'DERIBIT_USER_DATA_STREAM',
    MARKET_DATA_STREAM = 'DERIBIT_MARKET_DATA_STREAM',
    TRADING_CLIENT = 'DERIBIT_TRADING_CLIENT',
    CACHE = 'DERIBIT_CACHE',
    SYSTEM = 'DERIBIT_SYSTEM'
}

/**
 * Event type identifiers.
 */
export enum DeribitEventType {
    // Order Events
    ORDER_CREATED = 'ORDER_CREATED',
    ORDER_FILLED = 'ORDER_FILLED',
    ORDER_PARTIALLY_FILLED = 'ORDER_PARTIALLY_FILLED',
    ORDER_CANCELLED = 'ORDER_CANCELLED',
    ORDER_REJECTED = 'ORDER_REJECTED',
    ORDER_TRIGGERED = 'ORDER_TRIGGERED',
    ORDER_EXPIRED = 'ORDER_EXPIRED',

    // Position Events
    POSITION_OPENED = 'POSITION_OPENED',
    POSITION_CLOSED = 'POSITION_CLOSED',
    POSITION_UPDATED = 'POSITION_UPDATED',
    POSITION_FLIPPED = 'POSITION_FLIPPED',
    LIQUIDATION_WARNING = 'LIQUIDATION_WARNING',
    LIQUIDATION = 'LIQUIDATION',

    // Account Events
    ACCOUNT_UPDATED = 'ACCOUNT_UPDATED',
    MARGIN_CALL = 'MARGIN_CALL',
    DEPOSIT = 'DEPOSIT',
    WITHDRAWAL = 'WITHDRAWAL',

    // Connection Events
    CONNECTED = 'CONNECTED',
    DISCONNECTED = 'DISCONNECTED',
    RECONNECTING = 'RECONNECTING',
    AUTH_SUCCESS = 'AUTH_SUCCESS',
    AUTH_FAILED = 'AUTH_FAILED'
}

/**
 * Base domain event.
 */
export interface DeribitBaseEvent {
    /** Event type */
    type: DeribitEventType;
    /** Event source */
    source: DeribitEventSource;
    /** Event timestamp */
    timestamp: number;
    /** Optional correlation ID for tracing */
    correlationId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Events
// ═══════════════════════════════════════════════════════════════════════════════

import { DeribitOrder, DeribitTrade } from '../../dtos';

/**
 * Order created event.
 */
export interface DeribitOrderCreatedEvent extends DeribitBaseEvent {
    type: DeribitEventType.ORDER_CREATED;
    order: DeribitOrder;
}

/**
 * Order filled event (full or partial).
 */
export interface DeribitOrderFilledEvent extends DeribitBaseEvent {
    type: DeribitEventType.ORDER_FILLED | DeribitEventType.ORDER_PARTIALLY_FILLED;
    order: DeribitOrder;
    trades: DeribitTrade[];
    isFullFill: boolean;
}

/**
 * Order cancelled event.
 */
export interface DeribitOrderCancelledEvent extends DeribitBaseEvent {
    type: DeribitEventType.ORDER_CANCELLED;
    order: DeribitOrder;
    cancelReason?: string;
}

/**
 * Order rejected event.
 */
export interface DeribitOrderRejectedEvent extends DeribitBaseEvent {
    type: DeribitEventType.ORDER_REJECTED;
    order: DeribitOrder;
    rejectReason: string;
}

/**
 * Order triggered event (for conditional orders).
 */
export interface DeribitOrderTriggeredEvent extends DeribitBaseEvent {
    type: DeribitEventType.ORDER_TRIGGERED;
    order: DeribitOrder;
    triggerPrice: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Position Events
// ═══════════════════════════════════════════════════════════════════════════════

import { DeribitPosition } from '../../dtos';

/**
 * Position opened event.
 */
export interface DeribitPositionOpenedEvent extends DeribitBaseEvent {
    type: DeribitEventType.POSITION_OPENED;
    position: DeribitPosition;
}

/**
 * Position closed event.
 */
export interface DeribitPositionClosedEvent extends DeribitBaseEvent {
    type: DeribitEventType.POSITION_CLOSED;
    position: DeribitPosition;
    realizedPnl: number;
}

/**
 * Position updated event.
 */
export interface DeribitPositionUpdatedEvent extends DeribitBaseEvent {
    type: DeribitEventType.POSITION_UPDATED;
    previousPosition: DeribitPosition;
    currentPosition: DeribitPosition;
    unrealizedPnlChange: number;
}

/**
 * Position flipped event (direction changed).
 */
export interface DeribitPositionFlippedEvent extends DeribitBaseEvent {
    type: DeribitEventType.POSITION_FLIPPED;
    previousPosition: DeribitPosition;
    currentPosition: DeribitPosition;
}

/**
 * Liquidation warning event.
 */
export interface DeribitLiquidationWarningEvent extends DeribitBaseEvent {
    type: DeribitEventType.LIQUIDATION_WARNING;
    position: DeribitPosition;
    liquidationPrice: number;
    markPrice: number;
    percentToLiquidation: number;
}

/**
 * Liquidation event.
 */
export interface DeribitLiquidationEvent extends DeribitBaseEvent {
    type: DeribitEventType.LIQUIDATION;
    position: DeribitPosition;
    realizedLoss: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Account Events
// ═══════════════════════════════════════════════════════════════════════════════

import { DeribitAccountSummary } from '../../dtos';

/**
 * Account updated event.
 */
export interface DeribitAccountUpdatedEvent extends DeribitBaseEvent {
    type: DeribitEventType.ACCOUNT_UPDATED;
    account: DeribitAccountSummary;
    previousEquity?: number;
    equityChange?: number;
}

/**
 * Margin call event.
 */
export interface DeribitMarginCallEvent extends DeribitBaseEvent {
    type: DeribitEventType.MARGIN_CALL;
    currency: string;
    maintenanceMargin: number;
    equity: number;
    marginRatio: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Connection Events
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Connected event.
 */
export interface DeribitConnectedEvent extends DeribitBaseEvent {
    type: DeribitEventType.CONNECTED;
    environment: 'mainnet' | 'testnet';
}

/**
 * Disconnected event.
 */
export interface DeribitDisconnectedEvent extends DeribitBaseEvent {
    type: DeribitEventType.DISCONNECTED;
    reason: string;
    wasClean: boolean;
}

/**
 * Reconnecting event.
 */
export interface DeribitReconnectingEvent extends DeribitBaseEvent {
    type: DeribitEventType.RECONNECTING;
    attempt: number;
    maxAttempts: number;
    delayMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event Union Type
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Union type of all Deribit domain events.
 */
export type DeribitDomainEvent =
    | DeribitOrderCreatedEvent
    | DeribitOrderFilledEvent
    | DeribitOrderCancelledEvent
    | DeribitOrderRejectedEvent
    | DeribitOrderTriggeredEvent
    | DeribitPositionOpenedEvent
    | DeribitPositionClosedEvent
    | DeribitPositionUpdatedEvent
    | DeribitPositionFlippedEvent
    | DeribitLiquidationWarningEvent
    | DeribitLiquidationEvent
    | DeribitAccountUpdatedEvent
    | DeribitMarginCallEvent
    | DeribitConnectedEvent
    | DeribitDisconnectedEvent
    | DeribitReconnectingEvent;

// ═══════════════════════════════════════════════════════════════════════════════
// Event Factory
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a domain event with common fields populated.
 *
 * @param type - Event type
 * @param source - Event source
 * @param correlationId - Optional correlation ID
 * @returns Partial event with common fields
 */
export function createEventBase(
    type: DeribitEventType,
    source: DeribitEventSource,
    correlationId?: string
): DeribitBaseEvent {
    return {
        type,
        source,
        timestamp: Date.now(),
        correlationId
    };
}
