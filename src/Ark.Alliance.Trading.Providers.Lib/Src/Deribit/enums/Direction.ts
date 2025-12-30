/**
 * @fileoverview Deribit Direction Enum
 * @module Deribit/enums/Direction
 *
 * Defines direction values for Deribit orders and positions.
 */

/**
 * Deribit direction.
 * @remarks Used for both orders and positions (unlike Binance which has separate positionSide).
 */
export enum Direction {
    BUY = 'buy',
    SELL = 'sell'
}

/**
 * Type alias for direction values.
 */
export type DirectionType = `${Direction}`;

/**
 * Get opposite direction.
 */
export function getOppositeDirection(direction: Direction): Direction {
    return direction === Direction.BUY ? Direction.SELL : Direction.BUY;
}

/**
 * Convert Deribit direction to normalized OrderSide.
 */
export function toOrderSide(direction: Direction): 'BUY' | 'SELL' {
    return direction === Direction.BUY ? 'BUY' : 'SELL';
}

/**
 * Convert normalized OrderSide to Deribit direction.
 */
export function fromOrderSide(side: 'BUY' | 'SELL'): Direction {
    return side === 'BUY' ? Direction.BUY : Direction.SELL;
}
