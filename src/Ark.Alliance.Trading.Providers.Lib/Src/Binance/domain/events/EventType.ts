/**
 * @fileoverview Event Type Enumeration
 * @module domain/events/EventType
 *
 * Defines all event types used in the Binance provider library.
 * Provides type-safe event type identification across the system.
 */

/**
 * Enumeration of all domain event types in the Binance provider.
 *
 * @remarks
 * Event types are organized by domain area:
 * - Account: Balance and margin-related events
 * - Order: Order lifecycle events
 * - Position: Position state change events
 * - Strategy: Trading strategy-related events
 * - System: Infrastructure and connection events
 */
export enum EventType {
    // ═══════════════════════════════════════════════════════════════════════════
    // Account Events
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Fired when account balance is updated.
     */
    ACCOUNT_UPDATED = 'account:updated',

    /**
     * Fired when a specific asset balance changes.
     */
    BALANCE_CHANGED = 'account:balance_changed',

    /**
     * Fired when margin call is triggered.
     */
    MARGIN_CALL = 'account:margin_call',

    // ═══════════════════════════════════════════════════════════════════════════
    // Order Events
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Fired when a new order is placed.
     */
    ORDER_CREATED = 'order:created',

    /**
     * Fired when an order is partially or fully filled.
     */
    ORDER_FILLED = 'order:filled',

    /**
     * Fired when an order is cancelled.
     */
    ORDER_CANCELLED = 'order:cancelled',

    /**
     * Fired when an order expires.
     */
    ORDER_EXPIRED = 'order:expired',

    /**
     * Fired when an order is rejected.
     */
    ORDER_REJECTED = 'order:rejected',

    /**
     * Fired when an algo order status changes.
     */
    ALGO_ORDER_UPDATE = 'order:algo_update',

    // ═══════════════════════════════════════════════════════════════════════════
    // Position Events
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Fired when a new position is opened.
     */
    POSITION_OPENED = 'position:opened',

    /**
     * Fired when a position is updated (size, PnL, etc.).
     */
    POSITION_UPDATED = 'position:updated',

    /**
     * Fired when a position is closed.
     */
    POSITION_CLOSED = 'position:closed',

    // ═══════════════════════════════════════════════════════════════════════════
    // Strategy Events
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Fired when a click event occurs in click strategy.
     */
    STRATEGY_CLICK = 'strategy:click',

    /**
     * Fired when an inversion event occurs.
     */
    STRATEGY_INVERSION = 'strategy:inversion',

    /**
     * Fired when strategy status changes.
     */
    STRATEGY_STATUS_CHANGED = 'strategy:status',

    /**
     * Fired when retry limit is reached.
     */
    STRATEGY_RETRY_LIMIT = 'strategy:retry_limit',

    // ═══════════════════════════════════════════════════════════════════════════
    // System Events
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Fired when WebSocket connects.
     */
    CONNECTION_ESTABLISHED = 'system:connected',

    /**
     * Fired when WebSocket disconnects.
     */
    CONNECTION_LOST = 'system:disconnected',

    /**
     * Fired when a system error occurs.
     */
    SYSTEM_ERROR = 'system:error'
}
