/**
 * @fileoverview REST Client Configuration
 * @module clients/Base/BaseModels/_RestClientConfig
 *
 * Configuration interface for REST client initialization.
 */

/**
 * Configuration options for BaseRestClient.
 */
export interface RestClientConfig {
    /**
     * Request timeout in milliseconds.
     * @default 30000
     */
    timeoutMs?: number;

    /**
     * Maximum retry attempts for failed requests.
     * @default 3
     */
    maxRetries?: number;

    /**
     * Base delay between retries in milliseconds.
     * Uses exponential backoff: delay * 2^attempt
     * @default 1000
     */
    retryDelayMs?: number;

    /**
     * Whether to track latency statistics.
     * @default true
     */
    trackLatency?: boolean;

    /**
     * Whether to track rate limits from response headers.
     * @default true
     */
    trackRateLimits?: boolean;
}
