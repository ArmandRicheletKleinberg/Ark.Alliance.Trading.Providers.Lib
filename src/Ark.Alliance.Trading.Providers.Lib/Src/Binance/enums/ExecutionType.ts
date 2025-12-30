/**
 * @fileoverview Execution Type Enumeration
 * @module enums/ExecutionType
 *
 * Defines order execution event types from Binance User Data Stream.
 *
 * @remarks
 * Execution type indicates what happened to an order in the
 * ORDER_TRADE_UPDATE event.
 */

/**
 * Execution type enumeration.
 *
 * @enum {string}
 */
export enum ExecutionType {
    /**
     * New order created.
     */
    NEW = 'NEW',

    /**
     * Order was canceled.
     */
    CANCELED = 'CANCELED',

    /**
     * Order was calculated (position update only, no trade).
     */
    CALCULATED = 'CALCULATED',

    /**
     * Order was expired.
     */
    EXPIRED = 'EXPIRED',

    /**
     * Order was traded (partially or fully filled).
     */
    TRADE = 'TRADE',

    /**
     * Amendment operation for CM/UM futures.
     */
    AMENDMENT = 'AMENDMENT'
}

/**
 * Type alias for execution type string literals.
 * @deprecated Use ExecutionType enum instead.
 */
export type ExecutionTypeType =
    | 'NEW'
    | 'CANCELED'
    | 'CALCULATED'
    | 'EXPIRED'
    | 'TRADE'
    | 'AMENDMENT';

/**
 * Checks if an execution type represents a trade fill.
 *
 * @param executionType - The execution type.
 * @returns True if the execution was a trade.
 */
export function isTradeExecution(executionType: ExecutionType): boolean {
    return executionType === ExecutionType.TRADE;
}
