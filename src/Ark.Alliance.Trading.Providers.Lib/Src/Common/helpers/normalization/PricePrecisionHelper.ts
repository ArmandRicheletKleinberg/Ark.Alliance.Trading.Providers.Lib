/**
 * Price Precision Helper
 * 
 * Provides deterministic price and quantity rounding utilities aligned with exchange filters.
 * 
 * **Business Logic:** All order prices and quantities must conform to exchange-defined
 * increments (tickSize, stepSize) and bounds (min/max). Incorrect rounding leads to
 * order rejection with errors like "Filter failure: PRICE_FILTER" or "Filter failure: LOT_SIZE".
 * 
 * **Thread-Safety:** All methods are static, pure functions with no shared state.
 * Safe to call from multiple contexts concurrently.
 * 
 * **Precision:** Uses number arithmetic throughout. For critical financial calculations
 * requiring absolute precision, consider using a decimal library like decimal.js.
 * 
 * Ported from C# Ark.Trading.Common.Normalization.PricePrecisionHelper
 * @see file:///C:/Repos/Monitor/src/Ark.Trading.Common/Normalization/PricePrecisionHelper.cs
 */

export class PricePrecisionHelper {

    /**
     * Rounds a value to the nearest permitted increment using banker's rounding.
     * 
     * @param value - The value to round
     * @param step - The increment to round to. Must be positive (e.g., 0.01 rounds to nearest cent)
     * @returns Value rounded to nearest multiple of step
     * @throws {Error} If step is zero or negative
     * 
     * **Use Case:** Rounding limit prices to tickSize.
     * 
     * **Rounding Mode:** Midpoint values round to nearest even number (banker's rounding).
     * This reduces cumulative rounding bias over many operations.
     * 
     * **Example:**
     * ```typescript
     * roundToStep(50.123, 0.01)  // → 50.12
     * roundToStep(50.125, 0.01)  // → 50.12 (rounds to even)
     * roundToStep(50.135, 0.01)  // → 50.14 (rounds to even)
     * ```
     */
    public static roundToStep(value: number, step: number): number {
        if (step <= 0) {
            throw new Error('Step must be positive');
        }

        // PRECISION FIX: Use integer arithmetic to avoid floating-point errors
        // E.g., 7.635 / 0.01 = 763.4999999999999 instead of 763.5
        const precision = this.countDecimalsFromString(step.toString());
        const multiplier = Math.pow(10, precision + 4); // Extra precision for safety
        const scaledValue = Math.round(value * multiplier);
        const scaledStep = Math.round(step * multiplier);

        // Banker's rounding (round half to even)
        const divided = scaledValue / scaledStep;
        const rounded = Math.round(divided);

        // Check if we're exactly at a midpoint
        const remainder = divided - Math.floor(divided);
        if (Math.abs(remainder - 0.5) < 0.0001) {
            // We're at a midpoint - round to even
            const evenRounded = (rounded % 2 === 0 ? rounded : rounded - 1);
            const result = evenRounded * scaledStep / multiplier;
            return Number(result.toFixed(precision));
        }

        const result = rounded * scaledStep / multiplier;
        return Number(result.toFixed(precision));
    }

    /**
     * Floors a value to the closest permitted increment not greater than the source value.
     * 
     * @param value - The value to floor
     * @param step - The increment to floor to. Must be positive
     * @returns Largest multiple of step that is ≤ value
     * @throws {Error} If step is zero or negative
     * 
     * **Use Case:** Rounding order quantities down to stepSize. Always use floor (not round)
     * for quantities to avoid accidentally exceeding available balance or position size.
     * 
     * **Example:**
     * ```typescript
     * floorToStep(1.2345, 0.001)  // → 1.234
     * floorToStep(0.999, 1)       // → 0
     * floorToStep(10.5, 0.1)      // → 10.5
     * ```
     */
    public static floorToStep(value: number, step: number): number {
        if (step <= 0) {
            throw new Error('Step must be positive');
        }

        // PRECISION FIX: Use integer arithmetic to avoid floating-point errors
        // E.g., Math.floor(7.63 / 0.01) * 0.01 = 7.630000000000001
        const precision = this.countDecimalsFromString(step.toString());
        const multiplier = Math.pow(10, precision + 4); // Extra precision for intermediate calc
        const scaledValue = Math.round(value * multiplier);
        const scaledStep = Math.round(step * multiplier);
        const result = Math.floor(scaledValue / scaledStep) * scaledStep / multiplier;

        // Round to precision to eliminate any remaining floating-point artifacts
        return Number(result.toFixed(precision));
    }

    /**
     * Ceils a value to the closest permitted increment not smaller than the source value.
     * 
     * @param value - The value to ceil
     * @param step - The increment to ceil to. Must be positive
     * @returns Smallest multiple of step that is ≥ value
     * @throws {Error} If step is zero or negative
     * 
     * **Use Case:** Calculating minimum quantity to meet minNotional requirement.
     * If minNotional=10 and price=4.5, minimum quantity is ceil(10/4.5) = 2.223 → round up to stepSize.
     * 
     * **Example:**
     * ```typescript
     * ceilToStep(1.2345, 0.001)   // → 1.235
     * ceilToStep(0.001, 1)        // → 1
     * ceilToStep(10.5, 0.1)       // → 10.5
     * ```
     */
    public static ceilToStep(value: number, step: number): number {
        if (step <= 0) {
            throw new Error('Step must be positive');
        }

        // PRECISION FIX: Use integer arithmetic to avoid floating-point errors
        const precision = this.countDecimalsFromString(step.toString());
        const multiplier = Math.pow(10, precision + 4); // Extra precision for intermediate calc
        const scaledValue = Math.round(value * multiplier);
        const scaledStep = Math.round(step * multiplier);
        const result = Math.ceil(scaledValue / scaledStep) * scaledStep / multiplier;

        // Round to precision to eliminate any remaining floating-point artifacts
        return Number(result.toFixed(precision));
    }

    /**
     * Clamps a numeric value between minimum and maximum bounds when defined.
     * 
     * @param value - The value to clamp
     * @param min - Minimum bound. Zero means no minimum enforced
     * @param max - Maximum bound. Zero means no maximum enforced
     * @returns Value clamped to [min, max] range, or original value if no bounds are enforced
     * 
     * **Use Case:** Enforcing minPrice/maxPrice, minQty/maxQty after rounding.
     * 
     * **Zero Handling:** Zero bounds are treated as "no limit". This follows Binance conventions
     * where maxPrice=0 or maxQty=0 in exchange info means unlimited.
     * 
     * **Example:**
     * ```typescript
     * clamp(50, 10, 100)    // → 50 (within bounds)
     * clamp(5, 10, 100)     // → 10 (below minimum)
     * clamp(150, 10, 100)   // → 100 (above maximum)
     * clamp(50, 0, 0)       // → 50 (no bounds enforced)
     * ```
     */
    public static clamp(value: number, min: number, max: number): number {
        // Zero means no limit (Binance convention)
        if (min === 0 && max === 0) {
            return value;
        }

        if (min !== 0 && value < min) {
            return min;
        }

        if (max !== 0 && value > max) {
            return max;
        }

        return value;
    }

    /**
     * Counts the number of decimal places in a number.
     * 
     * @param value - The value to analyze
     * @returns Number of decimal places (e.g., 0.001 → 3, 10 → 0, 1.5 → 1)
     * 
     * **Use Case:** Determining precision requirements from tickSize/stepSize.
     * If tickSize=0.01, we need 2 decimal places for prices.
     * 
     * **Example:**
     * ```typescript
     * countDecimals(0.001)   // → 3
     * countDecimals(0.01)    // → 2
     * countDecimals(1)       // → 0
     * countDecimals(1.5)     // → 1
     * ```
     */
    public static countDecimals(value: number): number {
        if (Math.floor(value) === value) {
            return 0;
        }

        let str = value.toString();

        // Handle scientific notation (e.g. 1e-7)
        if (str.includes('e-')) {
            return parseInt(str.split('e-')[1], 10);
        }

        // Remove trailing zeros (e.g. "0.0100" -> "0.01")
        if (str.includes('.')) {
            str = str.replace(/0+$/, '');
            if (str.endsWith('.')) {
                return 0;
            }
        }

        const decimalIndex = str.indexOf('.');
        if (decimalIndex === -1) {
            return 0;
        }

        return str.length - decimalIndex - 1;
    }

    /**
     * Formats a number to a specific number of decimal places.
     * 
     * @param value - The value to format
     * @param decimals - Number of decimal places
     * @returns Formatted string (e.g., formatToDecimals(1.23456, 2) → "1.23")
     * 
     * **Use Case:** Formatting prices/quantities for API requests.
     * Binance API rejects trailing zeros or incorrect precision.
     * 
     * **Example:**
     * ```typescript
     * formatToDecimals(1.23456, 2)   // → "1.23"
     * formatToDecimals(10, 2)        // → "10.00"
     * formatToDecimals(1.5, 4)       // → "1.5000"
     * ```
     */
    public static formatToDecimals(value: number, decimals: number): string {
        return value.toFixed(decimals);
    }

    /**
     * Removes trailing zeros from a numeric string.
     * 
     * @param value - The numeric string to clean
     * @returns String without trailing zeros (e.g., "1.2000" → "1.2", "10.00" → "10")
     * 
     * **Use Case:** Cleaning formatted values for Binance API.
     * Binance accepts both "1.20" and "1.2" but "1.2" is preferred.
     * 
     * **Example:**
     * ```typescript
     * removeTrailingZeros("1.2000")   // → "1.2"
     * removeTrailingZeros("10.00")    // → "10"
     * removeTrailingZeros("1.5")      // → "1.5"
     * ```
     */
    public static removeTrailingZeros(value: string): string {
        if (!value.includes('.')) {
            return value;
        }

        return value.replace(/\.?0+$/, '');
    }

    /**
     * Counts significant decimal places from a STRING value.
     * NOTE: Trailing zeros are NOT significant for Binance precision.
     * 
     * Binance tickSize/stepSize like "0.0100" means step is 0.01, so 2 decimals.
     * 
     * @param value - The string value (e.g., "0.0100")
     * @returns Number of significant decimal places
     * 
     * **Example:**
     * ```typescript
     * countDecimalsFromString("0.0100")  // → 2 (0.01 step = 2 decimals)
     * countDecimalsFromString("0.01")    // → 2
     * countDecimalsFromString("0.001")   // → 3
     * countDecimalsFromString("1")       // → 0
     * countDecimalsFromString("10")      // → 0
     * ```
     */
    public static countDecimalsFromString(value: string): number {
        const index = value.indexOf('.');
        if (index === -1) return 0;

        // Get the decimal portion and remove trailing zeros
        const decimalPart = value.slice(index + 1).replace(/0+$/, '');
        return decimalPart.length;
    }
}
