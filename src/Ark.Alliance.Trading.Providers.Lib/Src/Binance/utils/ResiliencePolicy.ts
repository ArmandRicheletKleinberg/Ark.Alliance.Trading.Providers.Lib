/**
 * @fileoverview Resilience Policy
 * @module utils/ResiliencePolicy
 * 
 * Provides retry logic with exponential backoff for network operations.
 */

export interface RetryOptions {
    attempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
    attempts: 5,
    baseDelayMs: 200,
    maxDelayMs: 30000
};

/**
 * Resilience Policy for retry with exponential backoff
 */
export class ResiliencePolicy {
    private opts: RetryOptions;

    constructor(opts?: Partial<RetryOptions>) {
        this.opts = {
            attempts: opts?.attempts ?? DEFAULT_OPTIONS.attempts,
            baseDelayMs: opts?.baseDelayMs ?? DEFAULT_OPTIONS.baseDelayMs,
            maxDelayMs: opts?.maxDelayMs ?? DEFAULT_OPTIONS.maxDelayMs
        };
    }

    /**
     * Execute function with retry logic
     * @param fn - Async function to execute
     * @returns Result of the function
     * @throws Last error if all retries exhausted
     */
    async retry<T>(fn: () => Promise<T>): Promise<T> {
        let attempt = 0;
        let lastError: any;

        while (attempt < this.opts.attempts) {
            try {
                return await fn();
            } catch (err) {
                lastError = err;
                attempt++;

                if (attempt >= this.opts.attempts) {
                    break;
                }

                // Calculate delay with exponential backoff
                const delay = Math.min(
                    this.opts.baseDelayMs * Math.pow(2, attempt - 1),
                    this.opts.maxDelayMs
                );

                console.warn(`[ResiliencePolicy] Attempt ${attempt}/${this.opts.attempts} failed, retrying in ${delay}ms...`);
                await this.delay(delay);
            }
        }

        throw lastError;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
