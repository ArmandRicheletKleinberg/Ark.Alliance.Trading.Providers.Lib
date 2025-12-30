/**
 * @fileoverview Price Value Object
 * @module domain/value-objects/Price
 *
 * Immutable value object representing a price with precision handling.
 * Encapsulates price formatting and validation logic.
 *
 * @remarks
 * This value object follows Domain-Driven Design (DDD) principles.
 * It provides type-safe price handling with automatic precision formatting
 * using the Common/helpers/normalization/PricePrecisionHelper.
 */

import { PricePrecisionHelper } from '../../../Common/helpers/normalization/PricePrecisionHelper';

/**
 * Immutable price value object with precision handling.
 *
 * @class Price
 *
 * @example
 * ```typescript
 * // Create price with tick size
 * const price = Price.create(50123.456, 0.01);
 * console.log(price.value);      // 50123.46 (rounded to tick)
 * console.log(price.toString()); // "50123.46"
 *
 * // Arithmetic operations
 * const newPrice = price.add(100);
 * console.log(newPrice.value);   // 50223.46
 * ```
 */
export class Price {
    /**
     * The numeric price value.
     * @readonly
     */
    public readonly value: number;

    /**
     * The tick size (minimum price increment).
     * @readonly
     */
    public readonly tickSize: number;

    /**
     * The number of decimal places.
     * @readonly
     */
    public readonly precision: number;

    /**
     * Private constructor - use static factory methods.
     *
     * @param value - The price value.
     * @param tickSize - The tick size for this price.
     */
    private constructor(value: number, tickSize: number) {
        this.tickSize = tickSize;
        this.precision = PricePrecisionHelper.countDecimalsFromString(tickSize.toString());
        this.value = PricePrecisionHelper.roundToStep(value, tickSize);
    }

    /**
     * Creates a Price value object.
     *
     * @param value - The raw price value.
     * @param tickSize - The tick size (minimum increment). Default: 0.01
     * @returns A new Price instance.
     *
     * @example
     * ```typescript
     * const btcPrice = Price.create(50000.123, 0.01);
     * ```
     */
    public static create(value: number, tickSize: number = 0.01): Price {
        return new Price(value, tickSize);
    }

    /**
     * Creates a Price from a string value.
     *
     * @param value - The price as a string.
     * @param tickSize - The tick size.
     * @returns A new Price instance.
     */
    public static fromString(value: string, tickSize: number = 0.01): Price {
        return new Price(parseFloat(value), tickSize);
    }

    /**
     * Creates a zero price.
     *
     * @param tickSize - The tick size.
     * @returns A Price with value 0.
     */
    public static zero(tickSize: number = 0.01): Price {
        return new Price(0, tickSize);
    }

    /**
     * Adds a value to this price, returning a new Price.
     *
     * @param amount - Amount to add.
     * @returns New Price with added amount.
     */
    public add(amount: number): Price {
        return new Price(this.value + amount, this.tickSize);
    }

    /**
     * Subtracts a value from this price, returning a new Price.
     *
     * @param amount - Amount to subtract.
     * @returns New Price with subtracted amount.
     */
    public subtract(amount: number): Price {
        return new Price(this.value - amount, this.tickSize);
    }

    /**
     * Multiplies this price by a factor, returning a new Price.
     *
     * @param factor - Multiplication factor.
     * @returns New Price multiplied by factor.
     */
    public multiply(factor: number): Price {
        return new Price(this.value * factor, this.tickSize);
    }

    /**
     * Checks if this price equals another price.
     *
     * @param other - The price to compare with.
     * @returns True if prices are equal (within precision).
     */
    public equals(other: Price): boolean {
        return Math.abs(this.value - other.value) < this.tickSize / 2;
    }

    /**
     * Checks if this price is greater than another.
     *
     * @param other - The price to compare with.
     * @returns True if this price is greater.
     */
    public isGreaterThan(other: Price): boolean {
        return this.value > other.value;
    }

    /**
     * Checks if this price is less than another.
     *
     * @param other - The price to compare with.
     * @returns True if this price is less.
     */
    public isLessThan(other: Price): boolean {
        return this.value < other.value;
    }

    /**
     * Checks if the price is zero.
     *
     * @returns True if price value is 0.
     */
    public isZero(): boolean {
        return this.value === 0;
    }

    /**
     * Returns the price as a formatted string.
     *
     * @returns Price formatted to precision.
     */
    public toString(): string {
        return this.value.toFixed(this.precision);
    }

    /**
     * Returns the price as a number.
     *
     * @returns The numeric price value.
     */
    public toNumber(): number {
        return this.value;
    }

    /**
     * Returns JSON representation.
     *
     * @returns Object with price details.
     */
    public toJSON(): Record<string, unknown> {
        return {
            value: this.value,
            tickSize: this.tickSize,
            precision: this.precision,
            formatted: this.toString()
        };
    }
}
