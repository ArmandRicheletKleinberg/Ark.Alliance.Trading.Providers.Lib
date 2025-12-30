/**
 * @fileoverview Deribit Position Cache
 * @module Deribit/domain/cache/DeribitPositionCache
 *
 * Position caching with event notifications following DDD principles.
 * Pattern aligned with Binance's PositionCache implementation.
 *
 * FEATURES:
 * - Symbol + direction keying
 * - Auto-removal of closed positions
 * - Event emission for position changes
 * - Batch update support
 */

import { EventEmitter } from 'events';
import { DeribitPosition } from '../../dtos';
import { Direction } from '../../enums';
import {
    DEFAULT_CLOSED_POSITION_TTL_MS,
    DEFAULT_POSITION_CACHE_CLEANUP_INTERVAL_MS
} from '../../../Common/constants';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Position cache statistics.
 */
export interface DeribitPositionCacheStats {
    totalPositions: number;
    activePositions: number;
    instruments: string[];
    totalUnrealizedPnl: number;
    totalRealizedPnl: number;
    lastUpdate: Date | null;
}

/**
 * Position cache configuration.
 */
export interface DeribitPositionCacheConfig {
    /** Auto-remove positions with zero size */
    autoRemoveZeroSize?: boolean;
    /** Keep closed positions for this duration (ms) */
    closedPositionTtlMs?: number;
    /** Cleanup timer interval (ms) */
    cleanupIntervalMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DeribitPositionCache
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Position cache for Deribit positions with event notifications.
 *
 * @remarks
 * Provides position storage with:
 * - Event emission on position changes (open, close, update)
 * - Auto-removal of closed positions
 * - Batch update for snapshot reconciliation
 * - PnL tracking across all positions
 *
 * @example
 * ```typescript
 * const cache = new DeribitPositionCache();
 *
 * cache.on('positionOpened', (pos) => console.log('Position opened:', pos.instrument_name));
 * cache.on('positionClosed', (pos) => console.log('Position closed:', pos.instrument_name));
 *
 * cache.update(position);
 * const allPositions = cache.getAllPositions();
 * ```
 */
export class DeribitPositionCache extends EventEmitter {
    private readonly positions: Map<string, DeribitPosition> = new Map();
    private readonly config: Required<DeribitPositionCacheConfig>;
    private lastUpdateTime: Date | null = null;
    private cleanupTimer: NodeJS.Timeout | null = null;



    constructor(config?: DeribitPositionCacheConfig) {
        super();
        this.config = {
            autoRemoveZeroSize: config?.autoRemoveZeroSize ?? true,
            closedPositionTtlMs: config?.closedPositionTtlMs ?? DEFAULT_CLOSED_POSITION_TTL_MS,
            cleanupIntervalMs: config?.cleanupIntervalMs ?? DEFAULT_POSITION_CACHE_CLEANUP_INTERVAL_MS
        };

        // Start cleanup timer
        this.startCleanupTimer();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Key Generation
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Generate cache key from instrument name.
     * Deribit uses single-directional positions per instrument.
     */
    private generateKey(instrumentName: string): string {
        return instrumentName.toUpperCase();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Update Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Update position in cache.
     *
     * @param position - Position to cache
     */
    update(position: DeribitPosition): void {
        const key = this.generateKey(position.instrument_name);
        const existingPosition = this.positions.get(key);

        // Detect position state changes
        if (!existingPosition) {
            if (position.size !== 0) {
                this.emit('positionOpened', position);
            }
        } else {
            // Check for direction change (flip)
            if (existingPosition.direction !== position.direction && position.size !== 0) {
                this.emit('positionFlipped', { previous: existingPosition, current: position });
            }

            // Check for close
            if (existingPosition.size !== 0 && position.size === 0) {
                this.emit('positionClosed', {
                    position: existingPosition,
                    realizedPnl: position.realized_profit_loss
                });

                if (this.config.autoRemoveZeroSize) {
                    this.positions.delete(key);
                    this.emit('positionRemoved', { instrument: position.instrument_name });
                    this.lastUpdateTime = new Date();
                    return;
                }
            }

            // Regular update
            this.emit('positionUpdated', { previous: existingPosition, current: position });
        }

        this.positions.set(key, position);
        this.lastUpdateTime = new Date();
    }

    /**
     * Batch update multiple positions.
     *
     * @param positions - Positions to cache
     */
    updateBatch(positions: DeribitPosition[]): void {
        for (const position of positions) {
            this.update(position);
        }
        this.emit('batchUpdated', { count: positions.length });
    }

    /**
     * Replace all positions atomically (for snapshot reconciliation).
     *
     * @param positions - New positions to replace current cache
     */
    replaceAll(positions: DeribitPosition[]): void {
        const previousPositions = new Map(this.positions);
        this.positions.clear();

        for (const position of positions) {
            if (position.size !== 0 || !this.config.autoRemoveZeroSize) {
                const key = this.generateKey(position.instrument_name);
                this.positions.set(key, position);
            }
        }

        this.lastUpdateTime = new Date();
        this.emit('replaced', {
            previousCount: previousPositions.size,
            newCount: this.positions.size
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Query Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get position by instrument.
     *
     * @param instrumentName - Instrument name
     * @returns Position or undefined
     */
    getPosition(instrumentName: string): DeribitPosition | undefined {
        return this.positions.get(this.generateKey(instrumentName));
    }

    /**
     * Get all positions.
     *
     * @returns Array of all positions
     */
    getAllPositions(): DeribitPosition[] {
        return Array.from(this.positions.values());
    }

    /**
     * Get active positions (non-zero size).
     *
     * @returns Array of active positions
     */
    getActivePositions(): DeribitPosition[] {
        return Array.from(this.positions.values()).filter((p) => p.size !== 0);
    }

    /**
     * Get positions by currency.
     *
     * @param currency - Currency to filter by (derived from instrument name)
     * @returns Array of positions for the currency
     */
    getPositionsByCurrency(currency: string): DeribitPosition[] {
        const upperCurrency = currency.toUpperCase();
        return Array.from(this.positions.values()).filter((p) =>
            p.instrument_name.startsWith(upperCurrency)
        );
    }

    /**
     * Get positions by direction.
     *
     * @param direction - Position direction (buy = long, sell = short)
     * @returns Array of positions with the direction
     */
    getPositionsByDirection(direction: Direction): DeribitPosition[] {
        return Array.from(this.positions.values()).filter(
            (p) => p.direction === direction && p.size !== 0
        );
    }

    /**
     * Check if position exists.
     *
     * @param instrumentName - Instrument name
     * @returns true if position exists
     */
    hasPosition(instrumentName: string): boolean {
        return this.positions.has(this.generateKey(instrumentName));
    }

    /**
     * Check if there's an active position for instrument.
     *
     * @param instrumentName - Instrument name
     * @returns true if active position exists
     */
    hasActivePosition(instrumentName: string): boolean {
        const position = this.getPosition(instrumentName);
        return position !== undefined && position.size !== 0;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Statistics
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get position cache statistics.
     *
     * @returns Cache statistics
     */
    getStats(): DeribitPositionCacheStats {
        const positions = Array.from(this.positions.values());
        const activePositions = positions.filter((p) => p.size !== 0);

        return {
            totalPositions: positions.length,
            activePositions: activePositions.length,
            instruments: Array.from(new Set(positions.map((p) => p.instrument_name))),
            totalUnrealizedPnl: positions.reduce((sum, p) => sum + p.floating_profit_loss, 0),
            totalRealizedPnl: positions.reduce((sum, p) => sum + p.realized_profit_loss, 0),
            lastUpdate: this.lastUpdateTime
        };
    }

    /**
     * Get total unrealized PnL across all positions.
     *
     * @returns Total unrealized PnL
     */
    getTotalUnrealizedPnl(): number {
        return Array.from(this.positions.values()).reduce(
            (sum, p) => sum + p.floating_profit_loss,
            0
        );
    }

    /**
     * Get total realized PnL across all positions.
     *
     * @returns Total realized PnL
     */
    getTotalRealizedPnl(): number {
        return Array.from(this.positions.values()).reduce(
            (sum, p) => sum + p.realized_profit_loss,
            0
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Cleanup
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Delete position from cache.
     *
     * @param instrumentName - Instrument name
     * @returns true if deleted
     */
    deletePosition(instrumentName: string): boolean {
        const key = this.generateKey(instrumentName);
        const deleted = this.positions.delete(key);
        if (deleted) {
            this.emit('positionRemoved', { instrument: instrumentName });
        }
        return deleted;
    }

    /**
     * Clear all positions.
     */
    clear(): void {
        this.positions.clear();
        this.lastUpdateTime = null;
        this.emit('cleared');
    }

    /**
     * Dispose the cache.
     */
    dispose(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.clear();
        this.removeAllListeners();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Internal
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Start periodic cleanup timer.
     */
    private startCleanupTimer(): void {
        this.cleanupTimer = setInterval(() => {
            // Future: could clean up stale position data
        }, this.config.cleanupIntervalMs);
    }
}
