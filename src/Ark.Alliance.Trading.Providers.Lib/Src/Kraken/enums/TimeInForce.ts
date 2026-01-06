/**
 * @fileoverview Kraken Time In Force Enum
 * @module Kraken/enums/TimeInForce
 *
 * Defines time-in-force values for Kraken Futures API.
 */

/**
 * Kraken time-in-force values.
 * 
 * @remarks
 * Kraken Futures supports the following time-in-force options:
 * - gtc: Good-til-cancelled (default)
 * - ioc: Immediate-or-cancel
 * - post: Post-only (maker only, will be rejected if would take)
 */
export enum KrakenTimeInForce {
    /** Good-til-cancelled (default) */
    GTC = 'gtc',
    /** Immediate-or-cancel */
    IOC = 'ioc',
    /** Post-only (maker only) */
    POST = 'post'
}

/** Type alias for KrakenTimeInForce values */
export type KrakenTimeInForceType = `${KrakenTimeInForce}`;

/**
 * Check if time-in-force requires immediate execution.
 */
export function requiresImmediateExecution(tif: KrakenTimeInForce): boolean {
    return tif === KrakenTimeInForce.IOC;
}

/**
 * Check if time-in-force is post-only (maker only).
 */
export function isPostOnly(tif: KrakenTimeInForce): boolean {
    return tif === KrakenTimeInForce.POST;
}
