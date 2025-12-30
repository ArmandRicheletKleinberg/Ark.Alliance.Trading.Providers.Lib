/**
 * @fileoverview Position Cache Updater
 * @module core/cache/PositionCacheUpdater
 * 
 * Central orchestrator for all position cache operations.
 * Features:
 * - Applies deltas from WS events
 * - Applies deltas from REST snapshot reconciliation
 * - Updates mark prices from market data stream
 * - Thread-safe via mutex
 */

import { EventEmitter } from 'events';
import { Position } from '../../dtos/position/Position';
import { PositionCache } from './PositionCache';
import { PositionDeltaComparator, DeltaResult } from './PositionDeltaComparator';
import { ResiliencePolicy } from '../../utils/ResiliencePolicy';
import { POSITION_EVENTS } from '../../dtos/events/PositionEvents';

/**
 * Position Cache Updater
 * Centralizes all cache update logic with thread safety
 */
export class PositionCacheUpdater extends EventEmitter {
    private cache: PositionCache;
    private comparator: PositionDeltaComparator;
    private resilience: ResiliencePolicy;
    private instanceKey: string;

    // Simple mutex for thread safety
    private lockPromise: Promise<void> | null = null;

    constructor(
        cache: PositionCache,
        instanceKey: string,
        opts?: { resilience?: ResiliencePolicy }
    ) {
        super();
        this.cache = cache;
        this.instanceKey = instanceKey;
        this.comparator = new PositionDeltaComparator();
        this.resilience = opts?.resilience ?? new ResiliencePolicy();
    }

    /**
     * Acquire simple mutex lock
     */
    private async acquireLock(): Promise<() => void> {
        while (this.lockPromise) {
            await this.lockPromise;
        }

        let release: () => void = () => { };
        this.lockPromise = new Promise(resolve => {
            release = () => {
                this.lockPromise = null;
                resolve();
            };
        });

        return release;
    }

    /**
     * Apply delta result atomically to cache
     */
    async applyDelta(delta: DeltaResult): Promise<void> {
        const release = await this.acquireLock();
        try {
            // Apply deletes first
            for (const pos of delta.toDelete) {
                this.cache.deletePosition(pos.symbol, pos.positionSide);
                this.emit(POSITION_EVENTS.POSITION_CLOSED, {
                    event: POSITION_EVENTS.POSITION_CLOSED,
                    previousPosition: pos,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
            }

            // Apply updates
            for (const pos of delta.toUpdate) {
                this.cache.update(pos);
                this.emit(POSITION_EVENTS.POSITION_UPDATED, {
                    event: POSITION_EVENTS.POSITION_UPDATED,
                    position: pos,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
            }

            // Apply creates
            for (const pos of delta.toCreate) {
                this.cache.update(pos);
                this.emit(POSITION_EVENTS.POSITION_OPENED, {
                    event: POSITION_EVENTS.POSITION_OPENED,
                    position: pos,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
            }

            // Emit reconciliation complete event
            this.emit('reconciled', {
                created: delta.toCreate.length,
                updated: delta.toUpdate.length,
                deleted: delta.toDelete.length,
                timestamp: Date.now()
            });

            if (delta.toCreate.length > 0 || delta.toUpdate.length > 0 || delta.toDelete.length > 0) {
                console.log(`[PositionCacheUpdater] Reconciled: +${delta.toCreate.length} ~${delta.toUpdate.length} -${delta.toDelete.length}`);
            }
        } finally {
            release();
        }
    }

    /**
     * Refresh cache from REST snapshot
     * Uses comparator to calculate delta and apply atomically
     */
    async refreshFromSnapshot(snapshotPositions: Position[]): Promise<void> {
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

    /**
     * Update cache from WebSocket ACCOUNT_UPDATE event
     * Called by AccountUpdateHandler
     */
    async updateFromWsEvent(positionUpdate: Position): Promise<{
        stateChange: 'OPENED' | 'UPDATED' | 'CLOSED' | 'REVERSED' | 'UNCHANGED';
        existingPosition?: Position;
    }> {
        const release = await this.acquireLock();
        try {
            const existing = this.cache.getPosition(positionUpdate.symbol, positionUpdate.positionSide);

            // Handle position closure
            if (Math.abs(positionUpdate.positionAmt) === 0) {
                if (existing && Math.abs(existing.positionAmt) > 0) {
                    this.cache.deletePosition(positionUpdate.symbol, positionUpdate.positionSide);
                    return { stateChange: 'CLOSED', existingPosition: existing };
                }
                return { stateChange: 'UNCHANGED' };
            }

            // Merge with existing to preserve fields not in WS event
            const merged: Position = {
                ...positionUpdate,
                // CRITICAL: Preserve entryPrice if update has 0 but existing has valid value
                entryPrice: (positionUpdate.entryPrice === 0 && existing?.entryPrice && existing.entryPrice > 0)
                    ? existing.entryPrice
                    : positionUpdate.entryPrice,
                // Preserve from existing if not in update
                markPrice: existing?.markPrice || positionUpdate.markPrice || positionUpdate.entryPrice,
                leverage: existing?.leverage || positionUpdate.leverage || 1,
                liquidationPrice: existing?.liquidationPrice || positionUpdate.liquidationPrice || 0,
                updateTime: Date.now()
            };

            this.cache.update(merged);

            // Detect state change
            if (!existing || Math.abs(existing.positionAmt) === 0) {
                return { stateChange: 'OPENED' };
            }

            // Check for reversal (sign flip)
            const wasLong = existing.positionAmt > 0;
            const isLong = merged.positionAmt > 0;
            if (wasLong !== isLong) {
                return { stateChange: 'REVERSED', existingPosition: existing };
            }

            return { stateChange: 'UPDATED', existingPosition: existing };
        } finally {
            release();
        }
    }

    /**
     * Update mark price for a symbol from market data
     * Also recalculates unrealized PnL
     */
    updateMarkPrice(symbol: string, markPrice: number, positionSide: string = 'BOTH'): void {
        // Use cache's existing updateMarkPrice which recalculates PnL
        this.cache.updateMarkPrice(symbol, markPrice, positionSide);
    }

    /**
     * Get underlying cache (for read operations)
     */
    getCache(): PositionCache {
        return this.cache;
    }

    /**
     * Get resilience policy (for external use)
     */
    getResiliencePolicy(): ResiliencePolicy {
        return this.resilience;
    }
}
