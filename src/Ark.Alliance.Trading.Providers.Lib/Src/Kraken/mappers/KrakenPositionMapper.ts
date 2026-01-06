/**
 * @fileoverview Kraken Position Mapper
 * @module Kraken/mappers/KrakenPositionMapper
 *
 * Maps Kraken position DTOs to common IPosition interface.
 */

import { IPosition, PositionDirection, MarginType } from '../../Common/Domain';
import { KrakenPosition } from '../dtos';

// ═══════════════════════════════════════════════════════════════════════════════
// Direction Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Kraken position side to common direction.
 */
export function mapKrakenSideToDirection(side: 'long' | 'short'): PositionDirection {
    return side === 'long' ? PositionDirection.LONG : PositionDirection.SHORT;
}

/**
 * Get position direction from size.
 */
export function getDirectionFromSize(size: number): PositionDirection {
    if (size > 0) return PositionDirection.LONG;
    if (size < 0) return PositionDirection.SHORT;
    return PositionDirection.FLAT;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Position Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if position is flat (no open position).
 */
export function isFlat(position: KrakenPosition): boolean {
    return position.size === 0;
}

/**
 * Get absolute position size.
 */
export function getAbsoluteSize(position: KrakenPosition): number {
    return Math.abs(position.size);
}

/**
 * Calculate unrealized PnL percentage.
 */
export function calculateUnrealizedPnlPercent(
    unrealizedPnl: number,
    entryPrice: number,
    size: number
): number {
    const positionValue = entryPrice * Math.abs(size);
    if (positionValue === 0) return 0;
    return (unrealizedPnl / positionValue) * 100;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Full Position Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Kraken position to common IPosition.
 */
export function mapKrakenPositionToIPosition(position: KrakenPosition): IPosition {
    const direction = mapKrakenSideToDirection(position.side);
    const size = Math.abs(position.size);

    return {
        instrument: position.symbol,
        direction,
        size: size.toString(),
        entryPrice: position.price.toString(),
        markPrice: position.price.toString(), // Use entry price as fallback
        liquidationPrice: undefined,
        unrealizedPnl: (position.unrealizedPnl ?? 0).toString(),
        unrealizedPnlPercent: undefined,
        realizedPnl: (position.realizedPnl ?? 0).toString(),
        leverage: 1, // Default, Kraken doesn't return leverage per position
        marginType: MarginType.CROSS, // Kraken Futures uses cross margin by default
        initialMargin: '0',
        maintenanceMargin: '0',
        updatedAt: Date.now(),
        providerData: position
    };
}

/**
 * Map array of Kraken positions to IPosition array.
 */
export function mapKrakenPositionsToIPositions(positions: KrakenPosition[]): IPosition[] {
    return positions
        .filter(p => !isFlat(p))
        .map(mapKrakenPositionToIPosition);
}

/**
 * Map WebSocket position update to IPosition.
 */
export function mapWsPositionToIPosition(
    data: { instrument: string; balance: number; entry_price: number; pnl?: number; mark_price?: number }
): IPosition {
    const direction = getDirectionFromSize(data.balance);

    return {
        instrument: data.instrument,
        direction,
        size: Math.abs(data.balance).toString(),
        entryPrice: data.entry_price.toString(),
        markPrice: (data.mark_price ?? data.entry_price).toString(),
        liquidationPrice: undefined,
        unrealizedPnl: (data.pnl ?? 0).toString(),
        unrealizedPnlPercent: undefined,
        realizedPnl: '0',
        leverage: 1,
        marginType: MarginType.CROSS,
        initialMargin: '0',
        maintenanceMargin: '0',
        updatedAt: Date.now(),
        providerData: data
    };
}
