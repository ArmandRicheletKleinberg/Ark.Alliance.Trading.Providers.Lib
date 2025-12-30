/**
 * Math Utilities
 * 
 * Common mathematical and statistical functions used across the application.
 * Optimized for performance and accuracy.
 */

export class MathUtils {
    /**
     * Calculate the sum of an array of numbers
     */
    static sum(values: number[]): number {
        return values.reduce((a, b) => a + b, 0);
    }

    /**
     * Calculate the arithmetic mean (average)
     */
    static mean(values: number[]): number {
        if (values.length === 0) return 0;
        return this.sum(values) / values.length;
    }

    /**
     * Calculate the standard deviation
     * @param values Array of numbers
     * @param usePopulation If true, use population std dev (div by N), else sample (div by N-1)
     */
    static stdDev(values: number[], usePopulation: boolean = false): number {
        if (values.length === 0) return 0;
        if (values.length === 1 && !usePopulation) return 0;

        const mean = this.mean(values);
        const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
            (usePopulation ? values.length : values.length - 1);

        return Math.sqrt(variance);
    }

    /**
     * Calculate Exponential Moving Average (EMA)
     * @param currentPrice Current price point
     * @param previousEma Previous EMA value
     * @param period Smoothing period
     */
    static calculateEma(currentPrice: number, previousEma: number, period: number): number {
        const multiplier = 2 / (period + 1);
        return (currentPrice * multiplier) + (previousEma * (1 - multiplier));
    }

    /**
     * Round a number to a specific number of decimal places
     */
    static round(value: number, decimals: number): number {
        return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
    }

    /**
     * Calculate percentage change between two numbers
     */
    static percentageChange(current: number, previous: number): number {
        if (previous === 0) return 0;
        return ((current - previous) / Math.abs(previous)) * 100;
    }
}
