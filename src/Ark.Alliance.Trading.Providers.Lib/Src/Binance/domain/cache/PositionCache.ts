/**
 * @fileoverview Position Cache
 * @module domain/cache/PositionCache
 *
 * FEATURES:
 * - Per-symbol and position-side storage
 * - Event emission for position changes
 * - Auto-removal of closed positions (qty = 0)
 * - Mark price and leverage updates
 *
 * @remarks
 * Extends BaseDomainCache for cache management.
 * Uses composite key: "symbol|positionSide" for storage.
 * Emits 'positionClosed', 'cleared', 'replaced' events.
 *
 * @example
 * ```typescript
 * const cache = new PositionCache();
 * cache.on('positionClosed', (event) => console.log('Closed:', event));
 * cache.update(position);
 * ```
 */

import { EventEmitter } from 'events';
import { Position } from '../../dtos/position/Position';
import { PositionSide } from '../../enums/PositionSide';
import { BaseDomainCache } from './Base/BaseDomainCache';
import { CacheConfig, CacheStats } from '../../../Common/helpers/cache/CacheConfig';

/**
 * Position cache configuration.
 */
export interface PositionCacheConfig extends CacheConfig {
    // No additional config needed currently
}

/**
 * Position Cache - Storage with event notifications.
 *
 * @extends BaseDomainCache<string, Position>
 *
 * @remarks
 * Composes with EventEmitter for position change notifications.
 * Key format: "SYMBOL|POSITION_SIDE"
 */
export class PositionCache extends BaseDomainCache<string, Position> {
    /**
     * Event emitter for position change notifications.
     */
    private readonly emitter: EventEmitter = new EventEmitter();

    /**
     * Creates a new PositionCache instance.
     *
     * @param config - Optional cache configuration.
     */
    constructor(config?: PositionCacheConfig) {
        super({
            name: 'PositionCache',
            defaultTtlMs: 0, // No TTL - positions don't expire automatically
            ...config
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Event Emitter Delegation
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Registers an event listener.
     */
    public on(event: string, listener: (...args: any[]) => void): this {
        this.emitter.on(event, listener);
        return this;
    }

    /**
     * Removes an event listener.
     */
    public off(event: string, listener: (...args: any[]) => void): this {
        this.emitter.off(event, listener);
        return this;
    }

    /**
     * Emits an event.
     */
    public emit(event: string, ...args: any[]): boolean {
        return this.emitter.emit(event, ...args);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Key Generation
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Generates cache key from symbol and position side.
     *
     * @param symbol - Trading symbol.
     * @param positionSide - Position side.
     * @returns Cache key in format "SYMBOL|POSITION_SIDE".
     */
    private generateKey(symbol: string, positionSide: string): string {
        return `${symbol}|${positionSide}`;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Domain Operations
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Updates or adds a position to the cache.
     * Automatically removes closed positions (qty = 0).
     *
     * @param position - Position to cache.
     */
    public update(position: Position): void {
        const key = this.generateKey(position.symbol, position.positionSide);

        // CRITICAL: Auto-delete closed positions (qty = 0)
        if (Math.abs(position.positionAmt) === 0) {
            if (this.has(key)) {
                this.remove(key);
                this.emit('positionClosed', { symbol: position.symbol, positionSide: position.positionSide });
                console.log(`[PositionCache] Position closed and removed: ${position.symbol}`);
            }
            return;
        }

        // Check for out-of-order updates
        const existing = this.get(key);
        if (existing?.updateTime && position.updateTime && position.updateTime < existing.updateTime) {
            console.warn(
                `[PositionCache] Rejecting stale update for ${position.symbol}: ` +
                `incoming ${position.updateTime} < cached ${existing.updateTime}`
            );
            return;
        }

        this.set(key, { ...position, updateTime: position.updateTime || Date.now() });
    }

    /**
     * Batch updates multiple positions.
     *
     * @param positions - Array of positions to update.
     */
    public updateBatch(positions: Position[]): void {
        positions.forEach(pos => this.update(pos));
    }

    /**
     * Gets a position from cache.
     *
     * @param symbol - Trading symbol.
     * @param positionSide - Position side (default: 'BOTH').
     * @returns Cached position or undefined.
     */
    public getPosition(symbol: string, positionSide: string = PositionSide.BOTH): Position | undefined {
        const key = this.generateKey(symbol, positionSide);
        return this.get(key);
    }

    /**
     * Gets all positions.
     *
     * @returns Array of all cached positions.
     */
    public getAllPositions(): Position[] {
        return this.getAll();
    }

    /**
     * Checks if a position exists.
     *
     * @param symbol - Trading symbol.
     * @param positionSide - Position side.
     * @returns True if position exists.
     */
    public hasPosition(symbol: string, positionSide: string = PositionSide.BOTH): boolean {
        const key = this.generateKey(symbol, positionSide);
        return this.has(key);
    }

    /**
     * Deletes a position from cache.
     *
     * @param symbol - Trading symbol.
     * @param positionSide - Position side.
     * @returns True if deleted.
     */
    public deletePosition(symbol: string, positionSide: string = PositionSide.BOTH): boolean {
        const key = this.generateKey(symbol, positionSide);
        const deleted = this.remove(key);
        if (deleted) {
            console.log(`[PositionCache] 🗑️ Deleted position: ${key}`);
        }
        return deleted;
    }

    /**
     * Replaces all positions atomically (for snapshot reconciliation).
     *
     * @param positions - New positions to replace current cache.
     */
    public replaceAll(positions: Position[]): void {
        this.clear();
        for (const pos of positions) {
            const key = this.generateKey(pos.symbol, pos.positionSide);
            this.set(key, { ...pos, updateTime: Date.now() });
        }
        this.emit('replaced', { count: positions.length });
    }

    /**
     * Gets positions by symbol (all sides).
     *
     * @param symbol - Trading symbol.
     * @returns Array of positions for this symbol.
     */
    public getBySymbol(symbol: string): Position[] {
        return this.getAll().filter(pos => pos.symbol === symbol);
    }

    /**
     * Gets only active positions (non-zero amount).
     *
     * @returns Array of active positions.
     */
    public getActivePositions(): Position[] {
        return this.getAll().filter(pos => Math.abs(pos.positionAmt) > 0);
    }

    /**
     * Updates mark price for a position.
     *
     * @param symbol - Trading symbol.
     * @param markPrice - New mark price.
     * @param positionSide - Position side (default: 'BOTH').
     */
    public updateMarkPrice(symbol: string, markPrice: number, positionSide: string = PositionSide.BOTH): void {
        const position = this.getPosition(symbol, positionSide);
        if (position) {
            const priceDiff = markPrice - position.entryPrice;
            const isLong = position.positionAmt > 0;
            const unrealizedProfit = isLong
                ? priceDiff * Math.abs(position.positionAmt)
                : -priceDiff * Math.abs(position.positionAmt);

            this.update({
                ...position,
                markPrice,
                unrealizedProfit,
                notional: markPrice * Math.abs(position.positionAmt),
                updateTime: Date.now()
            });
        }
    }

    /**
     * Updates leverage for a position.
     *
     * @param symbol - Trading symbol.
     * @param leverage - New leverage value.
     * @param positionSide - Position side (default: 'BOTH').
     */
    public updateLeverage(symbol: string, leverage: number, positionSide: string = PositionSide.BOTH): void {
        const position = this.getPosition(symbol, positionSide);
        if (position) {
            this.update({
                ...position,
                leverage,
                updateTime: Date.now()
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Statistics Override
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Gets position cache statistics.
     *
     * @returns Statistics including total and active position counts.
     */
    public getPositionStats(): {
        totalPositions: number;
        activePositions: number;
        symbols: string[];
    } {
        const all = this.getAll();
        const active = this.getActivePositions();
        return {
            totalPositions: all.length,
            activePositions: active.length,
            symbols: [...new Set(active.map(p => p.symbol))]
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Lifecycle Override
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Clears all positions and emits 'cleared' event.
     */
    public override clear(): void {
        super.clear();
        this.emit('cleared');
    }

    /**
     * Disposes the cache and removes all listeners.
     */
    public override dispose(): void {
        this.emitter.removeAllListeners();
        super.dispose();
    }
}
