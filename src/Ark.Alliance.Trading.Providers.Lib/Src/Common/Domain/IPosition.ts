/**
 * @fileoverview Provider-Agnostic Position Interface
 * @module Common/Domain/IPosition
 *
 * Defines the common position interface that all provider-specific
 * position implementations must conform to.
 */

/**
 * Normalized position direction.
 */
export enum PositionDirection {
    LONG = 'LONG',
    SHORT = 'SHORT',
    FLAT = 'FLAT'
}

/**
 * Normalized margin type.
 */
export enum MarginType {
    CROSS = 'CROSS',
    ISOLATED = 'ISOLATED'
}

/**
 * Provider-agnostic position interface.
 *
 * @remarks
 * This interface represents the common position properties across all providers.
 * Provider-specific properties are accessible via the `providerData` field.
 *
 * All numeric values are stored as strings to preserve precision.
 *
 * @example
 * ```typescript
 * function displayPosition(pos: IPosition) {
 *     console.log(`${pos.instrument}: ${pos.direction} ${pos.size}`);
 *     console.log(`PnL: ${pos.unrealizedPnl} (${pos.unrealizedPnlPercent}%)`);
 * }
 * ```
 */
export interface IPosition {
    /**
     * Instrument/symbol name in provider-specific format.
     */
    readonly instrument: string;

    /**
     * Position direction (LONG, SHORT, or FLAT).
     */
    readonly direction: PositionDirection;

    /**
     * Position size as string.
     * @remarks Positive for long, negative for short on some providers.
     * Use `direction` field for consistent interpretation.
     */
    readonly size: string;

    /**
     * Average entry price.
     */
    readonly entryPrice: string;

    /**
     * Current mark price.
     */
    readonly markPrice: string;

    /**
     * Liquidation price (0 or undefined if not applicable).
     */
    readonly liquidationPrice?: string;

    /**
     * Unrealized PnL in quote currency.
     */
    readonly unrealizedPnl: string;

    /**
     * Unrealized PnL as percentage.
     */
    readonly unrealizedPnlPercent?: string;

    /**
     * Realized PnL in quote currency.
     */
    readonly realizedPnl: string;

    /**
     * Current leverage.
     */
    readonly leverage: number;

    /**
     * Margin type (cross or isolated).
     */
    readonly marginType: MarginType;

    /**
     * Initial margin required.
     */
    readonly initialMargin: string;

    /**
     * Maintenance margin required.
     */
    readonly maintenanceMargin: string;

    /**
     * Last update timestamp (milliseconds).
     */
    readonly updatedAt: number;

    /**
     * Provider-specific data.
     */
    readonly providerData: unknown;
}

/**
 * Position update event data.
 */
export interface IPositionUpdate extends IPosition {
    /**
     * Type of update.
     */
    readonly updateType: string;

    /**
     * Previous size before update (for delta calculation).
     */
    readonly previousSize?: string;
}

/**
 * Helper function to check if position is flat (no exposure).
 */
export function isFlat(position: IPosition): boolean {
    return position.direction === PositionDirection.FLAT ||
        parseFloat(position.size) === 0;
}

/**
 * Helper function to determine position direction from size.
 */
export function getDirectionFromSize(size: string | number): PositionDirection {
    const numSize = typeof size === 'string' ? parseFloat(size) : size;
    if (numSize > 0) return PositionDirection.LONG;
    if (numSize < 0) return PositionDirection.SHORT;
    return PositionDirection.FLAT;
}
