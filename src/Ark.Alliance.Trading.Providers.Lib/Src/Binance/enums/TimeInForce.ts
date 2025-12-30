/**
 * @fileoverview Time In Force Enumeration
 * @module enums/TimeInForce
 *
 * Defines Time-In-Force values for order execution in Binance Futures.
 *
 * @remarks
 * Time-In-Force determines how long an order remains active before
 * being executed or expired.
 *
 * @see https://binance-docs.github.io/apidocs/futures/en/#public-endpoints-info
 */

/**
 * Time-In-Force enumeration.
 *
 * @enum {string}
 */
export enum TimeInForce {
    /**
     * Good-Til-Canceled: Order remains until filled or canceled.
     * Default for most orders.
     */
    GTC = 'GTC',

    /**
     * Immediate-Or-Cancel: Execute immediately and cancel unfilled portion.
     * Good for immediate partial fills.
     */
    IOC = 'IOC',

    /**
     * Fill-Or-Kill: Execute entire order immediately or cancel completely.
     * All-or-nothing execution.
     */
    FOK = 'FOK',

    /**
     * Good-Til-Crossing (Post Only): Only maker orders.
     * Order is rejected if it would execute immediately as taker.
     * Used for maker rebates and avoiding -5022 errors.
     */
    GTX = 'GTX',

    /**
     * Good-Til-Date: Order remains until specified goodTillDate timestamp.
     * Auto-cancels at the specified time.
     */
    GTD = 'GTD'
}

/**
 * Type alias for Time-In-Force string literals.
 * @deprecated Use TimeInForce enum instead.
 */
export type TimeInForceType = 'GTC' | 'IOC' | 'FOK' | 'GTX' | 'GTD';

/**
 * Checks if a Time-In-Force is post-only (maker only).
 *
 * @param tif - The Time-In-Force value.
 * @returns True if GTX (post-only).
 */
export function isPostOnly(tif: TimeInForce): boolean {
    return tif === TimeInForce.GTX;
}
