/**
 * @fileoverview Deribit Position Mapper
 * @module Deribit/mappers/DeribitPositionMapper
 *
 * Pure functions for mapping Deribit position DTOs to common IPosition interface.
 * Pattern aligned with Binance's PositionMapper implementation.
 */

import {
    IPosition,
    PositionDirection,
    MarginType
} from '../../Common/Domain';
import { DeribitPosition, DeribitPositionUpdate } from '../dtos';
import { Direction } from '../enums';

// ═══════════════════════════════════════════════════════════════════════════════
// Type Mappers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Deribit direction and size to common PositionDirection.
 *
 * @param direction - Deribit direction
 * @param size - Position size
 * @returns Common PositionDirection
 */
export function getPositionDirection(direction: Direction, size: number): PositionDirection {
    if (size === 0) return PositionDirection.FLAT;
    return direction === Direction.BUY ? PositionDirection.LONG : PositionDirection.SHORT;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Position Status Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if position is active (non-zero size).
 *
 * @param position - Deribit position
 * @returns true if position has non-zero size
 */
export function isActivePosition(position: DeribitPosition | DeribitPositionUpdate): boolean {
    return position.size !== 0;
}

/**
 * Check if position is flat (zero size).
 *
 * @param position - Deribit position
 * @returns true if position is flat
 */
export function isFlatPosition(position: DeribitPosition | DeribitPositionUpdate): boolean {
    return position.size === 0;
}

/**
 * Calculate unrealized PnL percentage.
 *
 * @param position - Deribit position
 * @returns PnL percentage (may be undefined if entry price is 0)
 */
export function calculateUnrealizedPnlPercent(position: DeribitPosition): number | undefined {
    if (position.average_price === 0 || position.size === 0) return undefined;

    const notional = Math.abs(position.size) * position.average_price;
    if (notional === 0) return undefined;

    return (position.floating_profit_loss / notional) * 100;
}

/**
 * Get position side as string (LONG/SHORT/FLAT).
 *
 * @param position - Deribit position
 * @returns Position side string
 */
export function getPositionSide(position: DeribitPosition | DeribitPositionUpdate): string {
    return getPositionDirection(position.direction, position.size);
}

/**
 * Get absolute position size.
 *
 * @param position - Deribit position
 * @returns Absolute size
 */
export function getAbsoluteSize(position: DeribitPosition | DeribitPositionUpdate): number {
    return Math.abs(position.size);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Mappers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map DeribitPosition to common IPosition interface.
 *
 * @param position - Deribit position DTO
 * @returns Common IPosition
 */
export function mapDeribitPositionToIPosition(position: DeribitPosition): IPosition {
    const unrealizedPnlPercent = calculateUnrealizedPnlPercent(position);

    return {
        instrument: position.instrument_name,
        direction: getPositionDirection(position.direction, position.size),
        size: String(position.size),
        entryPrice: String(position.average_price),
        markPrice: String(position.mark_price),
        liquidationPrice: position.estimated_liquidation_price !== undefined &&
            position.estimated_liquidation_price !== 0
            ? String(position.estimated_liquidation_price)
            : undefined,
        unrealizedPnl: String(position.floating_profit_loss),
        unrealizedPnlPercent: unrealizedPnlPercent !== undefined
            ? String(unrealizedPnlPercent.toFixed(4))
            : undefined,
        realizedPnl: String(position.realized_profit_loss),
        leverage: position.leverage,
        marginType: MarginType.CROSS, // Deribit uses cross margin
        initialMargin: String(position.initial_margin),
        maintenanceMargin: String(position.maintenance_margin),
        updatedAt: Date.now(),
        providerData: position
    };
}

/**
 * Map DeribitPositionUpdate (from WebSocket) to common IPosition interface.
 *
 * @param update - Deribit position update from WebSocket
 * @returns Common IPosition
 */
export function mapDeribitPositionUpdateToIPosition(update: DeribitPositionUpdate): IPosition {
    const unrealizedPnlPercent = update.average_price !== 0 && update.size !== 0
        ? (update.floating_profit_loss / (Math.abs(update.size) * update.average_price)) * 100
        : undefined;

    return {
        instrument: update.instrument_name,
        direction: getPositionDirection(update.direction, update.size),
        size: String(update.size),
        entryPrice: String(update.average_price),
        markPrice: String(update.mark_price),
        liquidationPrice: undefined, // Not available in position update
        unrealizedPnl: String(update.floating_profit_loss),
        unrealizedPnlPercent: unrealizedPnlPercent !== undefined
            ? String(unrealizedPnlPercent.toFixed(4))
            : undefined,
        realizedPnl: String(update.realized_profit_loss),
        leverage: update.leverage,
        marginType: MarginType.CROSS,
        initialMargin: String(update.initial_margin),
        maintenanceMargin: String(update.maintenance_margin),
        updatedAt: Date.now(),
        providerData: update
    };
}

/**
 * Map array of Deribit positions to common IPosition array.
 *
 * @param positions - Array of Deribit positions
 * @returns Array of common IPosition
 */
export function mapDeribitPositionsToIPositions(positions: DeribitPosition[]): IPosition[] {
    return positions.map(mapDeribitPositionToIPosition);
}

/**
 * Map array of Deribit position updates to common IPosition array.
 *
 * @param updates - Array of Deribit position updates
 * @returns Array of common IPosition
 */
export function mapDeribitPositionUpdatesToIPositions(updates: DeribitPositionUpdate[]): IPosition[] {
    return updates.map(mapDeribitPositionUpdateToIPosition);
}

/**
 * Filter active positions from array.
 *
 * @param positions - Array of Deribit positions
 * @returns Filtered array with only active positions
 */
export function filterActivePositions(positions: DeribitPosition[]): DeribitPosition[] {
    return positions.filter(isActivePosition);
}
