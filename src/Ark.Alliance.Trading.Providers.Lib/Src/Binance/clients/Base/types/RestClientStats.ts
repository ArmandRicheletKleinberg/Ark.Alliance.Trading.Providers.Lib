/**
 * @fileoverview REST Client Statistics
 * @module clients/Base/BaseModels/_RestClientStats
 *
 * Statistics interface for REST client monitoring.
 */

/**
 * REST client statistics for monitoring and debugging.
 */
export interface RestClientStats {
    /**
     * Total number of requests made.
     */
    requestCount: number;

    /**
     * Number of successful requests.
     */
    successCount: number;

    /**
     * Number of failed requests.
     */
    errorCount: number;

    /**
     * Average latency in milliseconds.
     */
    avgLatencyMs: number;

    /**
     * Last request timestamp.
     */
    lastRequest: Date | null;

    /**
     * Base URL of the client.
     */
    baseUrl: string;

    /**
     * Environment (MAINNET or TESTNET).
     */
    environment: string;
}
