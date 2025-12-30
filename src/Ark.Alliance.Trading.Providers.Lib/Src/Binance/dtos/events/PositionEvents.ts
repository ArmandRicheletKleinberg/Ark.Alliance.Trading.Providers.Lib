/**
 * @fileoverview Position and Strategy Events
 * @module dtos/events/PositionEvents
 */

import { Position } from '../position/Position';

/**
 * Click level state for strategy events.
 * @remarks Defined locally as ClickStrategyConfig is in a separate strategy module.
 */
export interface ClickLevelState {
    /** Current click level. */
    level: number;
    /** Whether level is locked. */
    locked: boolean;
    /** Timestamp of last update. */
    timestamp: number;
}

/**
 * Position event types
 */
export enum POSITION_EVENTS {
    /** New position opened */
    POSITION_OPENED = 'position:opened',

    /** Position updated (size, PnL, etc.) */
    POSITION_UPDATED = 'position:updated',

    /** Position closed */
    POSITION_CLOSED = 'position:closed',

    /** Click event occurred */
    CLICK_EVENT = 'strategy:click',

    /**  Inversion event occurred */
    INVERSION_EVENT = 'strategy:inversion',

    /** Strategy status changed */
    STRATEGY_STATUS_CHANGED = 'strategy:status',

    /** Order attempt initiated */
    ORDER_ATTEMPT = 'order:attempt',

    /** Error occurred */
    ERROR = 'error',

    /** Retry limit reached - requires user action */
    RETRY_LIMIT_REACHED = 'strategy:retry_limit'
}

/**
 * Position event payload
 */
export interface PositionEventPayload {
    event: POSITION_EVENTS;
    position: Position;
    timestamp: number;
    instanceKey: string;
}

/**
 * Click event payload
 */
export interface ClickEventPayload {
    event: POSITION_EVENTS.CLICK_EVENT;
    symbol: string;
    currentPnL: number;
    newLevels: ClickLevelState;
    timestamp: number;
    instanceKey: string;
}

/**
 * Inversion event payload
 */
export interface InversionEventPayload {
    event: POSITION_EVENTS.INVERSION_EVENT;
    symbol: string;
    currentPnL: number;
    reversalOrderId?: number;
    timestamp: number;
    instanceKey: string;
}

/**
 * Strategy status event payload
 */
export interface StrategyStatusEventPayload {
    event: POSITION_EVENTS.STRATEGY_STATUS_CHANGED;
    symbol: string;
    oldStatus: string;
    newStatus: string;
    timestamp: number;
    instanceKey: string;
}

/**
 * Error event payload
 */
export interface ErrorEventPayload {
    event: POSITION_EVENTS.ERROR;
    error: string;
    details?: any;
    timestamp: number;
    instanceKey: string;
}

/**
 * Union type for all event payloads
 */
export type EventPayload =
    | PositionEventPayload
    | ClickEventPayload
    | InversionEventPayload
    | StrategyStatusEventPayload
    | ErrorEventPayload
    | RetryLimitEventPayload;

/**
 * Retry limit reached event payload
 */
export interface RetryLimitEventPayload {
    event: POSITION_EVENTS.RETRY_LIMIT_REACHED;
    symbol: string;
    error: string;
    currentRetries: number;
    maxRetries: number;
    timestamp: number;
    instanceKey: string;
}
