/**
 * AsyncLock - Simple async mutex implementation
 * 
 * Ensures only one async operation runs at a time for a given key.
 * Used to prevent race conditions in order processing and inversion handling.
 * 
 * @example
 * ```typescript
 * const lock = new AsyncLock();
 * 
 * // Method 1: Manual acquire/release
 * const release = await lock.acquire('my-key');
 * try {
 *     await doSomething();
 * } finally {
 *     release();
 * }
 * 
 * // Method 2: Auto-release with callback
 * await lock.withLock('my-key', async () => {
 *     await doSomething();
 * });
 * ```
 */

import { logger } from '../logger';

export class AsyncLock {
    private locks = new Map<string, Promise<void>>();
    private resolvers = new Map<string, () => void>();
    private waitCounts = new Map<string, number>();

    // Timeout to prevent deadlocks (default: 30 seconds)
    private defaultTimeoutMs = 30000;

    /**
     * Acquire lock for a key, waiting if necessary
     * 
     * @param key - Lock identifier
     * @param timeoutMs - Maximum wait time (optional)
     * @returns Release function to call when done
     * @throws Error if timeout exceeded
     */
    async acquire(key: string, timeoutMs?: number): Promise<() => void> {
        const timeout = timeoutMs ?? this.defaultTimeoutMs;
        const startTime = Date.now();

        // Track wait count for metrics
        this.waitCounts.set(key, (this.waitCounts.get(key) || 0) + 1);

        // Wait for existing lock with timeout
        while (this.locks.has(key)) {
            const elapsed = Date.now() - startTime;
            if (elapsed > timeout) {
                this.waitCounts.set(key, (this.waitCounts.get(key) || 1) - 1);
                throw new Error(`AsyncLock timeout for key '${key}' after ${timeout}ms`);
            }

            // Wait for current lock to release
            try {
                await Promise.race([
                    this.locks.get(key),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Lock wait timeout')), timeout - elapsed)
                    )
                ]);
            } catch (e) {
                // Timeout or error, continue to check if lock is still held
            }
        }

        // Create new lock
        let resolver: () => void;
        const lock = new Promise<void>(resolve => {
            resolver = resolve;
        });

        this.locks.set(key, lock);
        this.resolvers.set(key, resolver!);

        const acquireTime = Date.now();
        logger.debug('AsyncLock acquired', {
            key,
            waitTime: acquireTime - startTime,
            queueDepth: this.waitCounts.get(key) || 0
        });

        // Return release function
        return () => {
            this.resolvers.get(key)?.();
            this.locks.delete(key);
            this.resolvers.delete(key);
            this.waitCounts.set(key, Math.max(0, (this.waitCounts.get(key) || 1) - 1));

            logger.debug('AsyncLock released', {
                key,
                heldTime: Date.now() - acquireTime
            });
        };
    }

    /**
     * Execute callback with lock, auto-releasing on completion
     * 
     * @param key - Lock identifier
     * @param callback - Async function to execute
     * @param timeoutMs - Maximum wait time (optional)
     * @returns Result of callback
     */
    async withLock<T>(
        key: string,
        callback: () => Promise<T>,
        timeoutMs?: number
    ): Promise<T> {
        const release = await this.acquire(key, timeoutMs);
        try {
            return await callback();
        } finally {
            release();
        }
    }

    /**
     * Try to acquire lock without waiting
     * 
     * @param key - Lock identifier
     * @returns Release function if acquired, null if lock is held
     */
    tryAcquire(key: string): (() => void) | null {
        if (this.locks.has(key)) {
            return null;
        }

        // Create lock synchronously
        let resolver: () => void;
        const lock = new Promise<void>(resolve => {
            resolver = resolve;
        });

        this.locks.set(key, lock);
        this.resolvers.set(key, resolver!);

        const acquireTime = Date.now();

        return () => {
            this.resolvers.get(key)?.();
            this.locks.delete(key);
            this.resolvers.delete(key);
            logger.debug('AsyncLock released (tryAcquire)', {
                key,
                heldTime: Date.now() - acquireTime
            });
        };
    }

    /**
     * Check if a key is currently locked
     */
    isLocked(key: string): boolean {
        return this.locks.has(key);
    }

    /**
     * Get current wait queue depth for a key
     */
    getQueueDepth(key: string): number {
        return this.waitCounts.get(key) || 0;
    }

    /**
     * Get all currently held lock keys
     */
    getActiveLocks(): string[] {
        return Array.from(this.locks.keys());
    }

    /**
     * Force release all locks (use with caution - for shutdown/cleanup only)
     */
    releaseAll(): void {
        for (const resolver of this.resolvers.values()) {
            resolver();
        }
        this.locks.clear();
        this.resolvers.clear();
        this.waitCounts.clear();
        logger.warn('AsyncLock: All locks force-released');
    }
}

/**
 * Singleton instance for shared locking across services
 */
let sharedLockInstance: AsyncLock | null = null;

export function getSharedLock(): AsyncLock {
    if (!sharedLockInstance) {
        sharedLockInstance = new AsyncLock();
    }
    return sharedLockInstance;
}
