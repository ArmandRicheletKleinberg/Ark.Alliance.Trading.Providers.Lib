/**
 * @fileoverview Binance Position Mapper
 * @module Binance/mappers/PositionMapper
 *
 * Maps Binance position types to common IPosition interface.
 * Pure functions - no side effects.
 *
 * @remarks
 * This mapper provides interoperability between Binance-specific position types
 * and the provider-agnostic IPosition interface defined in Common/Domain.
 */

import {
    IPosition,
    PositionDirection,
    MarginType
} from '../../Common/Domain';
import { Position, PositionRisk, MarginType as BinanceMarginType } from '../dtos/position/Position';

// ═══════════════════════════════════════════════════════════════════════════════
// Direction Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine position direction from position amount.
 *
 * @param positionAmt - Position amount (positive = long, negative = short, 0 = flat)
 * @returns Common PositionDirection
 */
export function getPositionDirectionFromAmount(positionAmt: number | string): PositionDirection {
    const amt = typeof positionAmt === 'string' ? parseFloat(positionAmt) : positionAmt;
    if (amt > 0) return PositionDirection.LONG;
    if (amt < 0) return PositionDirection.SHORT;
    return PositionDirection.FLAT;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Margin Type Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Binance margin type to common MarginType.
 *
 * @param marginType - Binance margin type
 * @returns Common MarginType
 */
export function mapBinanceMarginTypeToCommon(marginType: BinanceMarginType | string): MarginType {
    const normalized = marginType.toLowerCase();
    if (normalized === 'isolated' || normalized === BinanceMarginType.ISOLATED.toLowerCase()) {
        return MarginType.ISOLATED;
    }
    return MarginType.CROSS;
}

/**
 * Map common MarginType to Binance margin type.
 *
 * @param marginType - Common MarginType
 * @returns Binance margin type string
 */
export function mapCommonMarginTypeToBinance(marginType: MarginType): string {
    return marginType === MarginType.ISOLATED ? 'ISOLATED' : 'CROSSED';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Full Position Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Binance Position (from user data stream) to common IPosition interface.
 *
 * @param position - Binance Position from user data stream
 * @returns Common IPosition interface
 *
 * @example
 * ```typescript
 * const binancePosition = positionEvent.positions[0];
 * const commonPosition = mapBinancePositionToIPosition(binancePosition);
 * console.log(commonPosition.direction, commonPosition.size);
 * ```
 */
export function mapBinancePositionToIPosition(position: Position): IPosition {
    const direction = getPositionDirectionFromAmount(position.positionAmt);

    return {
        instrument: position.symbol,
        direction,
        size: String(Math.abs(position.positionAmt)),
        entryPrice: String(position.entryPrice),
        markPrice: String(position.markPrice),
        liquidationPrice: position.liquidationPrice > 0
            ? String(position.liquidationPrice)
            : undefined,
        unrealizedPnl: String(position.unrealizedProfit),
        realizedPnl: String(position.realizedProfit || 0),
        leverage: position.leverage,
        marginType: mapBinanceMarginTypeToCommon(position.marginType),
        initialMargin: position.isolatedWallet !== undefined
            ? String(position.isolatedWallet)
            : '0',
        maintenanceMargin: '0', // Not directly available in Position type
        updatedAt: position.updateTime,
        providerData: position
    };
}

/**
 * Map Binance PositionRisk (from REST API) to common IPosition interface.
 *
 * @param position - Binance PositionRisk from REST API
 * @returns Common IPosition interface
 *
 * @example
 * ```typescript
 * const result = await binanceClient.getPositionRisk('BTCUSDT');
 * if (result.success) {
 *     const positions = result.data.map(mapBinancePositionRiskToIPosition);
 * }
 * ```
 */
export function mapBinancePositionRiskToIPosition(position: PositionRisk): IPosition {
    const positionAmt = parseFloat(position.positionAmt);
    const direction = getPositionDirectionFromAmount(positionAmt);
    const liquidationPrice = parseFloat(position.liquidationPrice);

    return {
        instrument: position.symbol,
        direction,
        size: String(Math.abs(positionAmt)),
        entryPrice: position.entryPrice,
        markPrice: position.markPrice,
        liquidationPrice: liquidationPrice > 0
            ? position.liquidationPrice
            : undefined,
        unrealizedPnl: position.unRealizedProfit,
        realizedPnl: '0', // Not available in PositionRisk
        leverage: parseInt(position.leverage, 10),
        marginType: mapBinanceMarginTypeToCommon(position.marginType),
        initialMargin: position.isolatedMargin,
        maintenanceMargin: '0', // Not directly available
        updatedAt: position.updateTime,
        providerData: position
    };
}

/**
 * Check if a position is active (non-zero size).
 *
 * @param position - Binance PositionRisk
 * @returns true if position has non-zero size
 */
export function isActivePosition(position: PositionRisk): boolean {
    return parseFloat(position.positionAmt) !== 0;
}

/**
 * Filter to only active positions.
 *
 * @param positions - Array of PositionRisk
 * @returns Array of active positions only
 */
export function filterActivePositions(positions: PositionRisk[]): PositionRisk[] {
    return positions.filter(isActivePosition);
}

/**
 * Map array of PositionRisk to array of IPosition, filtering to active only.
 *
 * @param positions - Array of Binance PositionRisk
 * @returns Array of common IPosition
 */
export function mapBinancePositionsToIPositions(positions: PositionRisk[]): IPosition[] {
    return filterActivePositions(positions).map(mapBinancePositionRiskToIPosition);
}
