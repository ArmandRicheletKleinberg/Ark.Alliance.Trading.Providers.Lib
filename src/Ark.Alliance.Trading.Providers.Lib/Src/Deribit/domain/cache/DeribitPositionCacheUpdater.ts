/**
 * @fileoverview Deribit Position Cache Updater
 * @module Deribit/domain/cache/DeribitPositionCacheUpdater
 *
 * Central orchestrator for all Deribit position cache operations.
 * Pattern aligned with Binance's PositionCacheUpdater implementation.
 *
 * FEATURES:
 * - Applies deltas from WS user.changes subscription
 * - Applies deltas from REST snapshot reconciliation
 * - Updates mark prices from market data stream
 * - Thread-safe via mutex
 */

import { EventEmitter } from 'events';
import { DeribitPosition, DeribitPositionUpdate } from '../../dtos';
import { Direction } from '../../enums';
import { DeribitPositionCache } from './DeribitPositionCache';
import {
    DeribitPositionDeltaComparator,
    DeribitPositionDeltaResult,
    isActivePosition
} from './DeribitPositionDeltaComparator';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Position lifecycle events.
 */
export const DERIBIT_POSITION_EVENTS = {
    POSITION_OPENED: 'positionOpened',
    POSITION_UPDATED: 'positionUpdated',
    POSITION_CLOSED: 'positionClosed',
    POSITION_REVERSED: 'positionReversed',
    POSITION_MARK_PRICE_UPDATED: 'positionMarkPriceUpdated',
    RECONCILIATION_COMPLETE: 'reconciled'
} as const;

/**
 * Position state change type.
 */
export type PositionStateChange =
    | 'OPENED'
    | 'UPDATED'
    | 'CLOSED'
    | 'REVERSED'
    | 'UNCHANGED';

/**
 * Position event payload.
 */
export interface DeribitPositionEventPayload {
    position?: DeribitPosition;
    previousPosition?: DeribitPosition;
    timestamp: number;
    instanceKey: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DeribitPositionCacheUpdater
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deribit Position Cache Updater.
 *
 * @remarks
 * Centralizes all position cache update logic with thread safety.
 * - Updates cache from WebSocket `user.changes` subscription
 * - Reconciles cache from REST `private/get_positions` snapshots
 * - Emits position lifecycle events for downstream consumers
 *
 * @example
 * ```typescript
 * const updater = new DeribitPositionCacheUpdater(cache, 'account1');
 *
 * updater.on('positionOpened', (payload) => {
 *     console.log('Position opened:', payload.position);
 * });
 *
 * // From WebSocket
 * const { stateChange } = await updater.updateFromWsEvent(positionUpdate);
 *
 * // From REST snapshot
 * await updater.refreshFromSnapshot(snapshotPositions);
 * ```
 */
export class DeribitPositionCacheUpdater extends EventEmitter {
    private readonly cache: DeribitPositionCache;
    private readonly comparator: DeribitPositionDeltaComparator;
    private readonly instanceKey: string;

    /** Simple mutex for thread safety. */
    private lockPromise: Promise<void> | null = null;

    constructor(cache: DeribitPositionCache, instanceKey: string) {
        super();
        this.cache = cache;
        this.instanceKey = instanceKey;
        this.comparator = new DeribitPositionDeltaComparator();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Mutex
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Acquire simple mutex lock.
     */
    private async acquireLock(): Promise<() => void> {
        while (this.lockPromise) {
            await this.lockPromise;
        }

        let release: () => void = () => { };
        this.lockPromise = new Promise((resolve) => {
            release = () => {
                this.lockPromise = null;
                resolve();
            };
        });

        return release;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Delta Application
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Apply delta result atomically to cache.
     *
     * @param delta - Delta result from comparator
     */
    async applyDelta(delta: DeribitPositionDeltaResult): Promise<void> {
        const release = await this.acquireLock();
        try {
            // Apply deletes first (the cache handles removal via update with zero size)
            for (const position of delta.toDelete) {
                // Create a zero-size position to trigger cache removal
                const closedPosition: DeribitPosition = { ...position, size: 0 };
                this.cache.update(closedPosition);
                this.emit(DERIBIT_POSITION_EVENTS.POSITION_CLOSED, {
                    previousPosition: position,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                } as DeribitPositionEventPayload);
            }

            // Apply updates
            for (const position of delta.toUpdate) {
                this.cache.update(position);
                this.emit(DERIBIT_POSITION_EVENTS.POSITION_UPDATED, {
                    position,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                } as DeribitPositionEventPayload);
            }

            // Apply creates
            for (const position of delta.toCreate) {
                this.cache.update(position);
                this.emit(DERIBIT_POSITION_EVENTS.POSITION_OPENED, {
                    position,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                } as DeribitPositionEventPayload);
            }

            // Emit reconciliation complete
            this.emit(DERIBIT_POSITION_EVENTS.RECONCILIATION_COMPLETE, {
                created: delta.toCreate.length,
                updated: delta.toUpdate.length,
                deleted: delta.toDelete.length,
                timestamp: Date.now()
            });

            if (delta.toCreate.length > 0 || delta.toUpdate.length > 0 || delta.toDelete.length > 0) {
                console.log(
                    `[DeribitPositionCacheUpdater] Reconciled: ` +
                    `+${delta.toCreate.length} ~${delta.toUpdate.length} -${delta.toDelete.length}`
                );
            }
        } finally {
            release();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Snapshot Refresh
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Refresh cache from REST snapshot (private/get_positions).
     *
     * @param snapshotPositions - Positions from REST API
     */
    async refreshFromSnapshot(snapshotPositions: DeribitPosition[]): Promise<void> {
        const release = await this.acquireLock();
        try {
            const currentPositions = this.cache.getActivePositions();
            const delta = this.comparator.compare(currentPositions, snapshotPositions);

            // Release lock before applying delta (applyDelta acquires its own)
            release();

            // Only apply if there are changes
            if (delta.toCreate.length > 0 || delta.toUpdate.length > 0 || delta.toDelete.length > 0) {
                await this.applyDelta(delta);
            }
        } catch (err) {
            release();
            throw err;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // WebSocket Update
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Update cache from WebSocket user.changes position update.
     *
     * @param positionUpdate - Position update from WebSocket
     * @returns State change and existing position
     */
    async updateFromWsEvent(positionUpdate: DeribitPositionUpdate): Promise<{
        stateChange: PositionStateChange;
        existingPosition?: DeribitPosition;
    }> {
        const release = await this.acquireLock();
        try {
            const existing = this.cache.getPosition(positionUpdate.instrument_name);

            // Convert update to full position format
            const position: DeribitPosition = {
                instrument_name: positionUpdate.instrument_name,
                direction: positionUpdate.direction,
                size: positionUpdate.size,
                size_currency: positionUpdate.size_currency,
                average_price: positionUpdate.average_price,
                mark_price: positionUpdate.mark_price,
                index_price: positionUpdate.index_price,
                delta: positionUpdate.delta,
                initial_margin: positionUpdate.initial_margin,
                maintenance_margin: positionUpdate.maintenance_margin,
                open_orders_margin: existing?.open_orders_margin ?? 0,
                estimated_liquidation_price: existing?.estimated_liquidation_price ?? 0,
                floating_profit_loss: positionUpdate.floating_profit_loss,
                floating_profit_loss_usd: existing?.floating_profit_loss_usd,
                realized_profit_loss: positionUpdate.realized_profit_loss,
                realized_funding: positionUpdate.realized_funding ?? 0,
                total_profit_loss: positionUpdate.total_profit_loss,
                settlement_price: positionUpdate.settlement_price,
                leverage: positionUpdate.leverage,
                kind: positionUpdate.kind,
                interest_value: positionUpdate.interest_value
            };

            // Handle position closure
            if (!isActivePosition(position)) {
                if (existing && isActivePosition(existing)) {
                    this.cache.update(position); // This will trigger removal in cache
                    this.emit(DERIBIT_POSITION_EVENTS.POSITION_CLOSED, {
                        previousPosition: existing,
                        timestamp: Date.now(),
                        instanceKey: this.instanceKey
                    } as DeribitPositionEventPayload);
                    return { stateChange: 'CLOSED', existingPosition: existing };
                }
                return { stateChange: 'UNCHANGED' };
            }

            // Update cache
            this.cache.update(position);

            // Detect state change
            if (!existing || !isActivePosition(existing)) {
                this.emit(DERIBIT_POSITION_EVENTS.POSITION_OPENED, {
                    position,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                } as DeribitPositionEventPayload);
                return { stateChange: 'OPENED' };
            }

            // Check for reversal (direction flip)
            const wasLong = existing.direction === Direction.BUY;
            const isLong = position.direction === Direction.BUY;
            if (wasLong !== isLong) {
                this.emit(DERIBIT_POSITION_EVENTS.POSITION_REVERSED, {
                    position,
                    previousPosition: existing,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                } as DeribitPositionEventPayload);
                return { stateChange: 'REVERSED', existingPosition: existing };
            }

            this.emit(DERIBIT_POSITION_EVENTS.POSITION_UPDATED, {
                position,
                previousPosition: existing,
                timestamp: Date.now(),
                instanceKey: this.instanceKey
            } as DeribitPositionEventPayload);
            return { stateChange: 'UPDATED', existingPosition: existing };
        } finally {
            release();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Mark Price Updates
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Update mark price for an instrument from market data.
     *
     * @param instrument - Instrument name
     * @param markPrice - New mark price
     */
    updateMarkPrice(instrument: string, markPrice: number): void {
        const position = this.cache.getPosition(instrument);
        if (position && isActivePosition(position)) {
            // Create updated position with new mark price
            const updatedPosition: DeribitPosition = { ...position, mark_price: markPrice };
            this.cache.update(updatedPosition);
            this.emit(DERIBIT_POSITION_EVENTS.POSITION_MARK_PRICE_UPDATED, {
                position: updatedPosition,
                timestamp: Date.now(),
                instanceKey: this.instanceKey
            } as DeribitPositionEventPayload);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Accessors
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get underlying cache (for read operations).
     */
    getCache(): DeribitPositionCache {
        return this.cache;
    }

    /**
     * Get instance key.
     */
    getInstanceKey(): string {
        return this.instanceKey;
    }
}
