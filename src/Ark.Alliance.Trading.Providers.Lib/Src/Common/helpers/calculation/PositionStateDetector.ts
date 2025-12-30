/**
 * @fileoverview Position State Detector
 * @module helpers/calculation/PositionStateDetector
 * 
 * Detects position state transitions:
 * - OPENED: No position → Has position
 * - CLOSED: Has position → No position
 * - REVERSED: LONG → SHORT or SHORT → LONG (inversion)
 * - UPDATED: Same direction, different values
 */

import { Position } from '../../../Binance/dtos/position/Position';

/**
 * Position direction
 */
export type PositionDirection = 'LONG' | 'SHORT' | 'FLAT';

/**
 * Position state change types
 */
export type PositionChangeType = 'OPENED' | 'CLOSED' | 'REVERSED' | 'UPDATED' | 'NONE';

/**
 * Position state change result
 */
export interface PositionStateChange {
    type: PositionChangeType;
    previousDirection: PositionDirection;
    currentDirection: PositionDirection;
    isSignificant: boolean;  // True for OPENED, CLOSED, REVERSED
}

/**
 * Position State Detector - Detects position transitions
 */
export class PositionStateDetector {
    /**
     * Detect position state change between two states
     */
    static detectChange(
        existingPosition: Position | undefined,
        newPosition: Position
    ): PositionStateChange {
        const previousDirection = this.getDirection(existingPosition?.positionAmt || 0);
        const currentDirection = this.getDirection(newPosition.positionAmt);

        // Determine change type
        let type: PositionChangeType;

        if (previousDirection === 'FLAT' && currentDirection !== 'FLAT') {
            type = 'OPENED';
        } else if (previousDirection !== 'FLAT' && currentDirection === 'FLAT') {
            type = 'CLOSED';
        } else if (this.isReversed(previousDirection, currentDirection)) {
            type = 'REVERSED';
        } else if (previousDirection !== 'FLAT' && currentDirection !== 'FLAT') {
            type = 'UPDATED';
        } else {
            type = 'NONE';
        }

        return {
            type,
            previousDirection,
            currentDirection,
            isSignificant: type === 'OPENED' || type === 'CLOSED' || type === 'REVERSED'
        };
    }

    /**
     * Get position direction from amount
     */
    static getDirection(positionAmt: number): PositionDirection {
        if (positionAmt > 0) return 'LONG';
        if (positionAmt < 0) return 'SHORT';
        return 'FLAT';
    }

    /**
     * Check if position direction reversed
     */
    static isReversed(
        previousDirection: PositionDirection,
        currentDirection: PositionDirection
    ): boolean {
        return (
            (previousDirection === 'LONG' && currentDirection === 'SHORT') ||
            (previousDirection === 'SHORT' && currentDirection === 'LONG')
        );
    }

    /**
     * Check if position is open (non-zero)
     */
    static isOpen(positionAmt: number): boolean {
        return Math.abs(positionAmt) > 0;
    }

    /**
     * Check if position was open
     */
    static wasOpen(existingPosition: Position | undefined): boolean {
        return !!existingPosition && Math.abs(existingPosition.positionAmt) > 0;
    }

    /**
     * Get position side based on amount direction
     */
    static getPositionSide(positionAmt: number): 'BUY' | 'SELL' | null {
        if (positionAmt > 0) return 'BUY';
        if (positionAmt < 0) return 'SELL';
        return null;
    }
}
