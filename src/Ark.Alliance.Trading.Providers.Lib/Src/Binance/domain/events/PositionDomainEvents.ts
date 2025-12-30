/**
 * @fileoverview Position Domain Events
 * @module domain/events/PositionEvents
 *
 * Domain events related to position state changes including opens,
 * updates, and closes.
 */

import { BaseEvent } from './BaseEvent';
import { EventType } from './EventType';
import { EventSource } from './EventSource';
import {
    PositionSide,
    MarginType,
    type PositionSideType,
    type MarginTypeType
} from '../../enums';

// Re-export enums for backward compatibility
export { PositionSide, MarginType };

// ═══════════════════════════════════════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Position snapshot information.
 */
export interface PositionSnapshot {
    /**
     * Trading symbol.
     */
    readonly symbol: string;

    /**
     * Position side.
     */
    readonly positionSide: PositionSide;

    /**
     * Position amount (positive for LONG, negative for SHORT in one-way mode).
     */
    readonly positionAmt: number;

    /**
     * Entry price.
     */
    readonly entryPrice: number;

    /**
     * Unrealized PnL.
     */
    readonly unrealizedPnL: number;

    /**
     * Margin type.
     */
    readonly marginType: MarginType;

    /**
     * Leverage.
     */
    readonly leverage: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event Classes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Event fired when a new position is opened.
 *
 * @extends BaseEvent
 */
export class PositionOpenedEvent extends BaseEvent {
    /**
     * Creates a PositionOpenedEvent instance.
     *
     * @param symbol - Trading symbol.
     * @param positionSide - Position side (LONG/SHORT/BOTH).
     * @param positionAmt - Position amount.
     * @param entryPrice - Entry price.
     * @param marginType - Margin type (isolated/cross).
     * @param leverage - Leverage used.
     * @param instanceKey - Position service instance key.
     * @param correlationId - Optional correlation ID for tracing.
     */
    constructor(
        public readonly symbol: string,
        public readonly positionSide: PositionSide,
        public readonly positionAmt: number,
        public readonly entryPrice: number,
        public readonly marginType: MarginType,
        public readonly leverage: number,
        public readonly instanceKey: string,
        correlationId?: string
    ) {
        super(EventType.POSITION_OPENED, EventSource.POSITION_SERVICE, correlationId);
    }

    /**
     * Checks if position is a long position.
     *
     * @returns True if position amount is positive.
     */
    public isLong(): boolean {
        return this.positionAmt > 0;
    }

    /**
     * Serializes the event to JSON.
     *
     * @returns JSON representation of the event.
     */
    public toJSON(): Record<string, unknown> {
        return {
            ...this.getBaseJSON(),
            symbol: this.symbol,
            positionSide: this.positionSide,
            positionAmt: this.positionAmt,
            entryPrice: this.entryPrice,
            marginType: this.marginType,
            leverage: this.leverage,
            instanceKey: this.instanceKey
        };
    }
}

/**
 * Event fired when a position is updated.
 *
 * @extends BaseEvent
 */
export class PositionUpdatedEvent extends BaseEvent {
    /**
     * Creates a PositionUpdatedEvent instance.
     *
     * @param position - Current position snapshot.
     * @param previousPositionAmt - Previous position amount.
     * @param previousUnrealizedPnL - Previous unrealized PnL.
     * @param updateReason - Reason for the update.
     * @param instanceKey - Position service instance key.
     * @param correlationId - Optional correlation ID for tracing.
     */
    constructor(
        public readonly position: PositionSnapshot,
        public readonly previousPositionAmt: number,
        public readonly previousUnrealizedPnL: number,
        public readonly updateReason: string,
        public readonly instanceKey: string,
        correlationId?: string
    ) {
        super(EventType.POSITION_UPDATED, EventSource.POSITION_SERVICE, correlationId);
    }

    /**
     * Calculates the change in position amount.
     *
     * @returns The difference between current and previous position amount.
     */
    public getPositionAmtChange(): number {
        return this.position.positionAmt - this.previousPositionAmt;
    }

    /**
     * Calculates the change in unrealized PnL.
     *
     * @returns The difference between current and previous unrealized PnL.
     */
    public getUnrealizedPnLChange(): number {
        return this.position.unrealizedPnL - this.previousUnrealizedPnL;
    }

    /**
     * Serializes the event to JSON.
     *
     * @returns JSON representation of the event.
     */
    public toJSON(): Record<string, unknown> {
        return {
            ...this.getBaseJSON(),
            position: this.position,
            previousPositionAmt: this.previousPositionAmt,
            previousUnrealizedPnL: this.previousUnrealizedPnL,
            updateReason: this.updateReason,
            instanceKey: this.instanceKey
        };
    }
}

/**
 * Event fired when a position is closed.
 *
 * @extends BaseEvent
 */
export class PositionClosedEvent extends BaseEvent {
    /**
     * Creates a PositionClosedEvent instance.
     *
     * @param symbol - Trading symbol.
     * @param positionSide - Position side that was closed.
     * @param closedQuantity - Quantity that was closed.
     * @param realizedPnL - Realized PnL from closing.
     * @param closeReason - Reason for closing (e.g., 'manual', 'stop_loss', 'liquidation').
     * @param instanceKey - Position service instance key.
     * @param correlationId - Optional correlation ID for tracing.
     */
    constructor(
        public readonly symbol: string,
        public readonly positionSide: PositionSide,
        public readonly closedQuantity: number,
        public readonly realizedPnL: number,
        public readonly closeReason: string,
        public readonly instanceKey: string,
        correlationId?: string
    ) {
        super(EventType.POSITION_CLOSED, EventSource.POSITION_SERVICE, correlationId);
    }

    /**
     * Checks if the position was profitable.
     *
     * @returns True if realized PnL is positive.
     */
    public isProfitable(): boolean {
        return this.realizedPnL > 0;
    }

    /**
     * Serializes the event to JSON.
     *
     * @returns JSON representation of the event.
     */
    public toJSON(): Record<string, unknown> {
        return {
            ...this.getBaseJSON(),
            symbol: this.symbol,
            positionSide: this.positionSide,
            closedQuantity: this.closedQuantity,
            realizedPnL: this.realizedPnL,
            closeReason: this.closeReason,
            instanceKey: this.instanceKey
        };
    }
}
