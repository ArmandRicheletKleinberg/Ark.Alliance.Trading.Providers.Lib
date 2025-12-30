/**
 * @fileoverview Cancellation State Enumeration
 * @module Common/services/cancellation/CancellationState
 *
 * Defines the possible states of a cancellation token.
 * Used for tracking cancellation lifecycle and preventing invalid state transitions.
 *
 * @remarks
 * Follows the .NET CancellationToken pattern adapted for TypeScript async operations.
 * State transitions are unidirectional: NONE -> REQUESTED -> CANCELLED
 *
 * @see https://docs.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Cancellation State Enumeration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Possible states of a cancellation token.
 *
 * @enum {string}
 *
 * @example
 * ```typescript
 * import { CancellationState } from './CancellationState';
 *
 * if (token.state === CancellationState.CANCELLED) {
 *     console.log('Operation was cancelled');
 * }
 * ```
 */
export enum CancellationState {
    /**
     * No cancellation has been requested.
     * The token is in its initial state.
     */
    NONE = 'NONE',

    /**
     * Cancellation has been requested but not yet processed.
     * Async operations should check this state and abort gracefully.
     */
    REQUESTED = 'REQUESTED',

    /**
     * Cancellation has been fully processed.
     * All registered callbacks have been invoked.
     */
    CANCELLED = 'CANCELLED'
}

// ═══════════════════════════════════════════════════════════════════════════════
// Type Aliases
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type alias for cancellation state string values.
 */
export type CancellationStateType = 'NONE' | 'REQUESTED' | 'CANCELLED';

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Checks if cancellation has been requested or completed.
 *
 * @param state - The cancellation state to check.
 * @returns True if cancellation is in progress or completed.
 */
export function isCancellationRequested(state: CancellationState): boolean {
    return state === CancellationState.REQUESTED || state === CancellationState.CANCELLED;
}

/**
 * Checks if cancellation is fully completed.
 *
 * @param state - The cancellation state to check.
 * @returns True if cancellation is fully completed.
 */
export function isCancelled(state: CancellationState): boolean {
    return state === CancellationState.CANCELLED;
}

/**
 * Checks if cancellation can still be requested.
 *
 * @param state - The cancellation state to check.
 * @returns True if state is NONE and cancellation can be requested.
 */
export function canRequestCancellation(state: CancellationState): boolean {
    return state === CancellationState.NONE;
}
