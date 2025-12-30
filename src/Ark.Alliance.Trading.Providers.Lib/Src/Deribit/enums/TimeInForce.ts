/**
 * @fileoverview Deribit Time In Force Enum
 * @module Deribit/enums/TimeInForce
 *
 * Defines time in force values for Deribit orders.
 */

/**
 * Deribit time in force.
 */
export enum DeribitTimeInForce {
    GOOD_TIL_CANCELLED = 'good_til_cancelled',
    GOOD_TIL_DAY = 'good_til_day',
    FILL_OR_KILL = 'fill_or_kill',
    IMMEDIATE_OR_CANCEL = 'immediate_or_cancel'
}

/**
 * Type alias for time in force values.
 */
export type DeribitTimeInForceType = `${DeribitTimeInForce}`;

/**
 * Check if order is day order.
 */
export function isDayOrder(tif: DeribitTimeInForce): boolean {
    return tif === DeribitTimeInForce.GOOD_TIL_DAY;
}

/**
 * Check if order requires immediate execution (IOC or FOK).
 */
export function requiresImmediateExecution(tif: DeribitTimeInForce): boolean {
    return [
        DeribitTimeInForce.FILL_OR_KILL,
        DeribitTimeInForce.IMMEDIATE_OR_CANCEL
    ].includes(tif);
}
