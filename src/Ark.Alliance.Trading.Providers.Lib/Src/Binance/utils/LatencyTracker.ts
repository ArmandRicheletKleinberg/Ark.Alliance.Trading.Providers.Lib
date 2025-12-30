/**
 * @fileoverview Latency Tracker Utility
 * @module utils/LatencyTracker
 * 
 * Tracks request latency statistics with rolling window.
 * Features:
 * - Min, max, average latency
 * - P95/P99 percentiles
 * - Rolling window (last N samples)
 */

export interface LatencyStats {
    min: number;
    max: number;
    avg: number;
    average: number; // Alias for avg (backward compatibility)
    p50: number;
    p95: number;
    p99: number;
    count: number;
    lastLatency: number;
}

/**
 * LatencyTracker - Tracks request latency with statistics
 */
export class LatencyTracker {
    private samples: number[] = [];
    private maxSamples: number;

    constructor(maxSamples: number = 100) {
        this.maxSamples = maxSamples;
    }

    /**
     * Record a latency sample (milliseconds)
     */
    record(latencyMs: number): void {
        this.samples.push(latencyMs);

        // Keep only the last N samples
        if (this.samples.length > this.maxSamples) {
            this.samples.shift();
        }
    }

    /**
     * Get latency statistics
     */
    getStats(): LatencyStats {
        if (this.samples.length === 0) {
            return {
                min: 0,
                max: 0,
                avg: 0,
                average: 0,
                p50: 0,
                p95: 0,
                p99: 0,
                count: 0,
                lastLatency: 0
            };
        }

        const sorted = [...this.samples].sort((a, b) => a - b);
        const count = sorted.length;
        const sum = sorted.reduce((a, b) => a + b, 0);
        const avgValue = Math.round(sum / count);

        return {
            min: sorted[0],
            max: sorted[count - 1],
            avg: avgValue,
            average: avgValue, // Alias
            p50: this.percentile(sorted, 50),
            p95: this.percentile(sorted, 95),
            p99: this.percentile(sorted, 99),
            count,
            lastLatency: sorted[count - 1]
        };
    }

    /**
     * Calculate percentile value
     */
    private percentile(sorted: number[], p: number): number {
        if (sorted.length === 0) return 0;

        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * Reset all samples
     */
    reset(): void {
        this.samples = [];
    }

    /**
     * Get sample count
     */
    getSampleCount(): number {
        return this.samples.length;
    }
}
