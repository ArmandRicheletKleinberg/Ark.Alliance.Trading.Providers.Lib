/**
 * @fileoverview Cancellation Module Barrel Export
 * @module Common/services/cancellation
 *
 * Centralized exports for cancellation infrastructure.
 * Provides cooperative cancellation pattern for async operations.
 */

// State enumeration
export {
    CancellationState,
    type CancellationStateType,
    isCancellationRequested,
    isCancelled,
    canRequestCancellation
} from './CancellationState';

// Cancellation token (read-only)
export {
    CancellationToken,
    CancelledError,
    type CancellationCallback,
    type CancellationRegistration
} from './CancellationToken';

// Cancellation token source (control)
export {
    CancellationTokenSource
} from './CancellationTokenSource';
