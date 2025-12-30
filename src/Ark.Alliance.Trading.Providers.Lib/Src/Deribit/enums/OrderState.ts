/**
 * @fileoverview Deribit Order State Enum
 * @module Deribit/enums/OrderState
 *
 * Defines the order states in Deribit API.
 */

/**
 * Deribit order state.
 * @remarks From Deribit API documentation.
 */
export enum OrderState {
    OPEN = 'open',
    FILLED = 'filled',
    REJECTED = 'rejected',
    CANCELLED = 'cancelled',
    UNTRIGGERED = 'untriggered',
    TRIGGERED = 'triggered'
}

/**
 * Type alias for order state values.
 */
export type OrderStateType = `${OrderState}`;

/**
 * Check if order is in terminal state.
 */
export function isTerminalState(state: OrderState): boolean {
    return [OrderState.FILLED, OrderState.REJECTED, OrderState.CANCELLED].includes(state);
}

/**
 * Check if order is active (can be modified/cancelled).
 */
export function isActiveState(state: OrderState): boolean {
    return [OrderState.OPEN, OrderState.UNTRIGGERED].includes(state);
}

/**
 * Check if order has been filled (partially or fully).
 */
export function hasBeenFilled(state: OrderState): boolean {
    return state === OrderState.FILLED;
}
