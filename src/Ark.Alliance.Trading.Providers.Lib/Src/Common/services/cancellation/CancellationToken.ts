/**
 * @fileoverview Cancellation Token Class
 * @module Common/services/cancellation/CancellationToken
 *
 * Read-only cancellation token passed to async operations for cooperative cancellation.
 * Operations should periodically check the token and abort gracefully when cancelled.
 *
 * @remarks
 * Follows the .NET CancellationToken pattern adapted for TypeScript async operations.
 * This is a read-only view - use CancellationTokenSource to trigger cancellation.
 *
 * @see https://docs.microsoft.com/en-us/dotnet/api/system.threading.cancellationtoken
 */

import { CancellationState, isCancellationRequested, isCancelled } from './CancellationState';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Callback function invoked when cancellation is requested.
 */
export type CancellationCallback = () => void | Promise<void>;

/**
 * Handle returned when registering a cancellation callback.
 * Used to unregister the callback if needed.
 */
export interface CancellationRegistration {
    /** Unique identifier for this registration. */
    readonly id: string;
    /** Unregisters the callback. */
    unregister(): void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CancellationToken Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Read-only cancellation token for cooperative async operation cancellation.
 *
 * @remarks
 * - Check `isCancellationRequested` periodically in long-running operations
 * - Use `throwIfCancellationRequested()` to throw a CancelledError
 * - Register callbacks with `onCancellationRequested()` for cleanup
 *
 * @example
 * ```typescript
 * async function fetchWithCancellation(url: string, token: CancellationToken): Promise<Data> {
 *     token.throwIfCancellationRequested();
 *     
 *     const response = await fetch(url);
 *     
 *     // Check cancellation after slow operations
 *     token.throwIfCancellationRequested();
 *     
 *     return response.json();
 * }
 * ```
 */
export class CancellationToken {
    /**
     * Internal state getter function bound from the source.
     * @private
     */
    private readonly _getState: () => CancellationState;

    /**
     * Internal callbacks registry from the source.
     * @private
     */
    private readonly _callbacks: Map<string, CancellationCallback>;

    /**
     * Counter for generating unique callback IDs.
     * @private
     */
    private _callbackIdCounter: number = 0;

    /**
     * Creates a new CancellationToken.
     *
     * @param getState - Function to get current cancellation state.
     * @param callbacks - Shared callback registry from the source.
     * @internal This constructor should only be called by CancellationTokenSource.
     */
    constructor(
        getState: () => CancellationState,
        callbacks: Map<string, CancellationCallback>
    ) {
        this._getState = getState;
        this._callbacks = callbacks;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Properties
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Gets the current cancellation state.
     */
    public get state(): CancellationState {
        return this._getState();
    }

    /**
     * Whether cancellation has been requested.
     */
    public get isCancellationRequested(): boolean {
        return isCancellationRequested(this._getState());
    }

    /**
     * Whether cancellation is fully completed.
     */
    public get isCancelled(): boolean {
        return isCancelled(this._getState());
    }

    /**
     * Whether this token can be cancelled (not already cancelled).
     */
    public get canBeCancelled(): boolean {
        return this._getState() !== CancellationState.CANCELLED;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Throws a CancelledError if cancellation has been requested.
     *
     * @throws CancelledError if cancellation has been requested.
     *
     * @example
     * ```typescript
     * for (const item of items) {
     *     token.throwIfCancellationRequested();
     *     await processItem(item);
     * }
     * ```
     */
    public throwIfCancellationRequested(): void {
        if (this.isCancellationRequested) {
            throw new CancelledError('Operation was cancelled');
        }
    }

    /**
     * Registers a callback to be invoked when cancellation is requested.
     *
     * @param callback - Function to call when cancelled.
     * @returns Registration handle to unregister the callback.
     *
     * @example
     * ```typescript
     * const registration = token.onCancellationRequested(() => {
     *     abortController.abort();
     * });
     *
     * // Later, if cleanup needed before cancellation
     * registration.unregister();
     * ```
     */
    public onCancellationRequested(callback: CancellationCallback): CancellationRegistration {
        const id = `cb_${++this._callbackIdCounter}_${Date.now()}`;
        this._callbacks.set(id, callback);

        // If already cancelled, invoke immediately
        if (this.isCancellationRequested) {
            Promise.resolve().then(() => callback());
        }

        return {
            id,
            unregister: () => {
                this._callbacks.delete(id);
            }
        };
    }

    /**
     * Creates a promise that resolves when cancellation is requested.
     * Useful for Promise.race() patterns.
     *
     * @returns Promise that rejects with CancelledError when cancelled.
     *
     * @example
     * ```typescript
     * const result = await Promise.race([
     *     longRunningOperation(),
     *     token.waitForCancellation()
     * ]);
     * ```
     */
    public waitForCancellation(): Promise<never> {
        return new Promise((_, reject) => {
            if (this.isCancellationRequested) {
                reject(new CancelledError('Operation was cancelled'));
                return;
            }

            this.onCancellationRequested(() => {
                reject(new CancelledError('Operation was cancelled'));
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Static Factory
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Gets a token that is never cancelled.
     * Use when cancellation is not supported but a token is required.
     */
    public static get None(): CancellationToken {
        return new CancellationToken(
            () => CancellationState.NONE,
            new Map()
        );
    }

    /**
     * Gets a token that is already cancelled.
     * Use for testing or immediate cancellation scenarios.
     */
    public static get Cancelled(): CancellationToken {
        return new CancellationToken(
            () => CancellationState.CANCELLED,
            new Map()
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CancelledError Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Error thrown when an operation is cancelled.
 *
 * @extends Error
 */
export class CancelledError extends Error {
    /**
     * Error name for instanceof checks.
     */
    public readonly name = 'CancelledError';

    /**
     * Whether this is a cancellation error.
     */
    public readonly isCancelled = true;

    /**
     * Creates a new CancelledError.
     *
     * @param message - Error message.
     */
    constructor(message: string = 'Operation was cancelled') {
        super(message);
        Object.setPrototypeOf(this, CancelledError.prototype);
    }

    /**
     * Checks if an error is a CancelledError.
     *
     * @param error - Error to check.
     * @returns True if error is a CancelledError.
     */
    public static isCancelledError(error: unknown): error is CancelledError {
        return error instanceof CancelledError ||
            (error instanceof Error && error.name === 'CancelledError');
    }
}
