/**
 * @fileoverview Cancellation Token Source Class
 * @module Common/services/cancellation/CancellationTokenSource
 *
 * Controls cancellation of async operations by providing a cancellation token
 * and the ability to trigger cancellation.
 *
 * @remarks
 * Follows the .NET CancellationTokenSource pattern adapted for TypeScript.
 * - Create a source to get a token
 * - Pass the token to async operations
 * - Call cancel() to request cancellation
 * - Operations check the token and abort gracefully
 *
 * @see https://docs.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource
 */

import { CancellationState, canRequestCancellation } from './CancellationState';
import { CancellationToken, CancellationCallback } from './CancellationToken';
import { logger } from '../../helpers/logger';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Timeout for callback execution before logging a warning.
 */
const CALLBACK_TIMEOUT_WARNING_MS = 5000;

// ═══════════════════════════════════════════════════════════════════════════════
// CancellationTokenSource Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Controls cancellation by providing a token and triggering cancellation.
 *
 * @example
 * ```typescript
 * // Create source and get token
 * const cts = new CancellationTokenSource();
 * const token = cts.token;
 *
 * // Pass token to async operation
 * const operationPromise = longRunningOperation(token);
 *
 * // Cancel after timeout
 * setTimeout(() => cts.cancel(), 5000);
 *
 * try {
 *     await operationPromise;
 * } catch (error) {
 *     if (CancelledError.isCancelledError(error)) {
 *         console.log('Operation was cancelled');
 *     }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Create with automatic timeout cancellation
 * const cts = CancellationTokenSource.createWithTimeout(30000);
 * await operation(cts.token);
 * cts.dispose(); // Clean up timeout if operation completes
 * ```
 */
export class CancellationTokenSource {
    /**
     * Current cancellation state.
     * @private
     */
    private _state: CancellationState = CancellationState.NONE;

    /**
     * Registered cancellation callbacks.
     * @private
     */
    private readonly _callbacks: Map<string, CancellationCallback> = new Map();

    /**
     * The cancellation token controlled by this source.
     * @private
     */
    private readonly _token: CancellationToken;

    /**
     * Timeout handle for auto-cancellation.
     * @private
     */
    private _timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    /**
     * Whether the source has been disposed.
     * @private
     */
    private _isDisposed: boolean = false;

    /**
     * Creates a new CancellationTokenSource.
     */
    constructor() {
        this._token = new CancellationToken(
            () => this._state,
            this._callbacks
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Properties
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Gets the cancellation token controlled by this source.
     */
    public get token(): CancellationToken {
        this.throwIfDisposed();
        return this._token;
    }

    /**
     * Gets the current cancellation state.
     */
    public get state(): CancellationState {
        return this._state;
    }

    /**
     * Whether cancellation has been requested.
     */
    public get isCancellationRequested(): boolean {
        return this._state !== CancellationState.NONE;
    }

    /**
     * Whether this source has been disposed.
     */
    public get isDisposed(): boolean {
        return this._isDisposed;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Requests cancellation of associated operations.
     *
     * @param reason - Optional reason for cancellation (for logging).
     * @returns Promise that resolves when all callbacks have been invoked.
     *
     * @example
     * ```typescript
     * await cts.cancel('User requested shutdown');
     * ```
     */
    public async cancel(reason?: string): Promise<void> {
        this.throwIfDisposed();

        if (!canRequestCancellation(this._state)) {
            return; // Already cancelled
        }

        this._state = CancellationState.REQUESTED;

        if (reason) {
            logger.info(`Cancellation requested: ${reason}`);
        }

        // Invoke all registered callbacks
        await this.invokeCallbacks();

        this._state = CancellationState.CANCELLED;
    }

    /**
     * Schedules cancellation after a specified delay.
     *
     * @param delayMs - Delay in milliseconds before cancellation.
     *
     * @example
     * ```typescript
     * cts.cancelAfter(30000); // Cancel after 30 seconds
     * ```
     */
    public cancelAfter(delayMs: number): void {
        this.throwIfDisposed();

        if (this._timeoutHandle) {
            clearTimeout(this._timeoutHandle);
        }

        this._timeoutHandle = setTimeout(() => {
            this.cancel(`Timeout after ${delayMs}ms`);
        }, delayMs);
    }

    /**
     * Disposes the source and releases resources.
     * Call this when the operation completes to clean up timeouts.
     */
    public dispose(): void {
        if (this._isDisposed) {
            return;
        }

        if (this._timeoutHandle) {
            clearTimeout(this._timeoutHandle);
            this._timeoutHandle = null;
        }

        this._callbacks.clear();
        this._isDisposed = true;
    }

    /**
     * Invokes all registered callbacks.
     * @private
     */
    private async invokeCallbacks(): Promise<void> {
        const callbackPromises: Promise<void>[] = [];

        for (const [id, callback] of this._callbacks) {
            const callbackPromise = (async () => {
                try {
                    const startTime = Date.now();
                    await callback();
                    const elapsed = Date.now() - startTime;

                    if (elapsed > CALLBACK_TIMEOUT_WARNING_MS) {
                        logger.warn(`Cancellation callback ${id} took ${elapsed}ms`);
                    }
                } catch (error) {
                    logger.error(`Cancellation callback ${id} failed`, error);
                }
            })();

            callbackPromises.push(callbackPromise);
        }

        await Promise.all(callbackPromises);
    }

    /**
     * Throws if the source has been disposed.
     * @private
     */
    private throwIfDisposed(): void {
        if (this._isDisposed) {
            throw new Error('CancellationTokenSource has been disposed');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Static Factory Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Creates a source that automatically cancels after a timeout.
     *
     * @param timeoutMs - Timeout in milliseconds.
     * @returns A new CancellationTokenSource with scheduled cancellation.
     *
     * @example
     * ```typescript
     * const cts = CancellationTokenSource.createWithTimeout(30000);
     * try {
     *     await operation(cts.token);
     * } finally {
     *     cts.dispose();
     * }
     * ```
     */
    public static createWithTimeout(timeoutMs: number): CancellationTokenSource {
        const source = new CancellationTokenSource();
        source.cancelAfter(timeoutMs);
        return source;
    }

    /**
     * Creates a linked source that cancels when any of the provided tokens are cancelled.
     *
     * @param tokens - Tokens to link.
     * @returns A new CancellationTokenSource linked to the provided tokens.
     *
     * @example
     * ```typescript
     * const linked = CancellationTokenSource.createLinked(parentToken, timeoutToken);
     * await operation(linked.token);
     * ```
     */
    public static createLinked(...tokens: CancellationToken[]): CancellationTokenSource {
        const source = new CancellationTokenSource();

        for (const token of tokens) {
            if (token.isCancellationRequested) {
                source.cancel('Linked token already cancelled');
                break;
            }

            token.onCancellationRequested(() => {
                source.cancel('Linked token cancelled');
            });
        }

        return source;
    }
}
