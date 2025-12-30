/**
 * @fileoverview Account Domain Events
 * @module domain/events/AccountEvents
 *
 * Domain events related to account state changes including balance updates,
 * margin calls, and asset transfers.
 */

import { BaseEvent } from './BaseEvent';
import { EventType } from './EventType';
import { EventSource } from './EventSource';
import { type PositionDirectionType } from '../../enums';

// ═══════════════════════════════════════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Balance change information for a specific asset.
 */
export interface BalanceChangeInfo {
    /**
     * Asset symbol (e.g., 'USDT', 'BTC').
     */
    readonly asset: string;

    /**
     * New wallet balance after the change.
     */
    readonly walletBalance: number;

    /**
     * Amount of change (positive or negative).
     */
    readonly changeAmount: number;

    /**
     * Available balance after the change.
     */
    readonly availableBalance: number;
}

/**
 * Position at risk information for margin call events.
 */
export interface PositionAtRiskInfo {
    /**
     * Trading symbol.
     */
    readonly symbol: string;

    /**
     * Position side (LONG or SHORT).
     */
    readonly positionSide: PositionDirectionType;

    /**
     * Current unrealized PnL.
     */
    readonly unrealizedPnL: number;

    /**
     * Maintenance margin required.
     */
    readonly maintenanceMargin: number;

    /**
     * Current mark price.
     */
    readonly markPrice: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event Classes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Event fired when account balance is updated.
 *
 * @extends BaseEvent
 */
export class AccountUpdatedEvent extends BaseEvent {
    /**
     * Creates an AccountUpdatedEvent instance.
     *
     * @param reason - The reason for the account update.
     * @param balances - Array of balance changes.
     * @param totalWalletBalance - Total wallet balance after update.
     * @param totalUnrealizedPnL - Total unrealized PnL.
     * @param transactionTime - Binance transaction time.
     * @param correlationId - Optional correlation ID for tracing.
     */
    constructor(
        public readonly reason: string,
        public readonly balances: ReadonlyArray<BalanceChangeInfo>,
        public readonly totalWalletBalance: number,
        public readonly totalUnrealizedPnL: number,
        public readonly transactionTime: number,
        correlationId?: string
    ) {
        super(EventType.ACCOUNT_UPDATED, EventSource.BINANCE_USER_DATA_STREAM, correlationId);
    }

    /**
     * Serializes the event to JSON.
     *
     * @returns JSON representation of the event.
     */
    public toJSON(): Record<string, unknown> {
        return {
            ...this.getBaseJSON(),
            reason: this.reason,
            balances: this.balances,
            totalWalletBalance: this.totalWalletBalance,
            totalUnrealizedPnL: this.totalUnrealizedPnL,
            transactionTime: this.transactionTime
        };
    }
}

/**
 * Event fired when a margin call is triggered.
 *
 * @extends BaseEvent
 *
 * @remarks
 * This event indicates that positions are at risk of liquidation.
 * Immediate action may be required to add margin or reduce positions.
 */
export class MarginCallEvent extends BaseEvent {
    /**
     * Creates a MarginCallEvent instance.
     *
     * @param crossWalletBalance - Current cross wallet balance.
     * @param positionsAtRisk - Array of positions at risk.
     * @param correlationId - Optional correlation ID for tracing.
     */
    constructor(
        public readonly crossWalletBalance: number,
        public readonly positionsAtRisk: ReadonlyArray<PositionAtRiskInfo>,
        correlationId?: string
    ) {
        super(EventType.MARGIN_CALL, EventSource.BINANCE_USER_DATA_STREAM, correlationId);
    }

    /**
     * Serializes the event to JSON.
     *
     * @returns JSON representation of the event.
     */
    public toJSON(): Record<string, unknown> {
        return {
            ...this.getBaseJSON(),
            crossWalletBalance: this.crossWalletBalance,
            positionsAtRisk: this.positionsAtRisk
        };
    }
}

/**
 * Event fired when a specific asset balance changes.
 *
 * @extends BaseEvent
 */
export class BalanceChangedEvent extends BaseEvent {
    /**
     * Creates a BalanceChangedEvent instance.
     *
     * @param asset - The asset that changed (e.g., 'USDT').
     * @param previousBalance - Balance before the change.
     * @param newBalance - Balance after the change.
     * @param changeAmount - Amount of change.
     * @param reason - Reason for the balance change.
     * @param correlationId - Optional correlation ID for tracing.
     */
    constructor(
        public readonly asset: string,
        public readonly previousBalance: number,
        public readonly newBalance: number,
        public readonly changeAmount: number,
        public readonly reason: string,
        correlationId?: string
    ) {
        super(EventType.BALANCE_CHANGED, EventSource.BINANCE_USER_DATA_STREAM, correlationId);
    }

    /**
     * Serializes the event to JSON.
     *
     * @returns JSON representation of the event.
     */
    public toJSON(): Record<string, unknown> {
        return {
            ...this.getBaseJSON(),
            asset: this.asset,
            previousBalance: this.previousBalance,
            newBalance: this.newBalance,
            changeAmount: this.changeAmount,
            reason: this.reason
        };
    }
}
