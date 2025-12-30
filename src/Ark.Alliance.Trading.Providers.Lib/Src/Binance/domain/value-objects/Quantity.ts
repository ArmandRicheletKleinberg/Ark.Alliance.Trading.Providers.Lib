/**
 * @fileoverview Quantity Value Object
 * @module domain/value-objects/Quantity
 *
 * Immutable value object representing a trading quantity with step size handling.
 * Encapsulates quantity formatting and validation logic.
 *
 * @remarks
 * This value object follows Domain-Driven Design (DDD) principles.
 * It provides type-safe quantity handling with automatic precision formatting
 * using the Common/helpers/normalization/PricePrecisionHelper.
 */

import { PricePrecisionHelper } from '../../../Common/helpers/normalization/PricePrecisionHelper';
import { QuantityUtils, MIN_POSITION_THRESHOLD } from '../../../Common/helpers/QuantityUtils';

/**
 * Immutable quantity value object with step size handling.
 *
 * @class Quantity
 *
 * @remarks
 * Quantities are always floored to step size to prevent exceeding
 * available balance or position size.
 *
 * @example
 * ```typescript
 * // Create quantity with step size
 * const qty = Quantity.create(1.2345, 0.001);
 * console.log(qty.value);      // 1.234 (floored to step)
 * console.log(qty.toString()); // "1.234"
 *
 * // Check if quantity is negligible
 * console.log(qty.isNegligible()); // false
 * ```
 */
export class Quantity {
    /**
     * The numeric quantity value.
     * @readonly
     */
    public readonly value: number;

    /**
     * The step size (minimum quantity increment).
     * @readonly
     */
    public readonly stepSize: number;

    /**
     * The number of decimal places.
     * @readonly
     */
    public readonly precision: number;

    /**
     * Private constructor - use static factory methods.
     *
     * @param value - The quantity value.
     * @param stepSize - The step size for this quantity.
     */
    private constructor(value: number, stepSize: number) {
        this.stepSize = stepSize;
        this.precision = PricePrecisionHelper.countDecimalsFromString(stepSize.toString());
        // Always floor quantities to prevent exceeding limits
        this.value = PricePrecisionHelper.floorToStep(Math.abs(value), stepSize);
    }

    /**
     * Creates a Quantity value object.
     *
     * @param value - The raw quantity value.
     * @param stepSize - The step size (minimum increment). Default: 0.001
     * @returns A new Quantity instance.
     *
     * @example
     * ```typescript
     * const qty = Quantity.create(0.12345, 0.001);
     * ```
     */
    public static create(value: number, stepSize: number = 0.001): Quantity {
        return new Quantity(value, stepSize);
    }

    /**
     * Creates a Quantity from a string value.
     *
     * @param value - The quantity as a string.
     * @param stepSize - The step size.
     * @returns A new Quantity instance.
     */
    public static fromString(value: string, stepSize: number = 0.001): Quantity {
        return new Quantity(parseFloat(value), stepSize);
    }

    /**
     * Creates a zero quantity.
     *
     * @param stepSize - The step size.
     * @returns A Quantity with value 0.
     */
    public static zero(stepSize: number = 0.001): Quantity {
        return new Quantity(0, stepSize);
    }

    /**
     * Creates a Quantity for closing a position.
     *
     * @param positionAmt - Current position amount.
     * @param stepSize - The step size.
     * @returns Quantity equal to absolute position amount.
     */
    public static forClose(positionAmt: number, stepSize: number = 0.001): Quantity {
        return new Quantity(Math.abs(positionAmt), stepSize);
    }

    /**
     * Creates a Quantity for inverting a position (2x).
     *
     * @param positionAmt - Current position amount.
     * @param stepSize - The step size.
     * @returns Quantity equal to 2x absolute position amount.
     */
    public static forInversion(positionAmt: number, stepSize: number = 0.001): Quantity {
        return new Quantity(Math.abs(positionAmt) * 2, stepSize);
    }

    /**
     * Adds a value to this quantity, returning a new Quantity.
     *
     * @param amount - Amount to add.
     * @returns New Quantity with added amount.
     */
    public add(amount: number): Quantity {
        return new Quantity(this.value + amount, this.stepSize);
    }

    /**
     * Subtracts a value from this quantity, returning a new Quantity.
     *
     * @param amount - Amount to subtract.
     * @returns New Quantity with subtracted amount.
     */
    public subtract(amount: number): Quantity {
        return new Quantity(Math.max(0, this.value - amount), this.stepSize);
    }

    /**
     * Multiplies this quantity by a factor, returning a new Quantity.
     *
     * @param factor - Multiplication factor.
     * @returns New Quantity multiplied by factor.
     */
    public multiply(factor: number): Quantity {
        return new Quantity(this.value * factor, this.stepSize);
    }

    /**
     * Checks if this quantity equals another quantity.
     *
     * @param other - The quantity to compare with.
     * @returns True if quantities are equal (within precision).
     */
    public equals(other: Quantity): boolean {
        return QuantityUtils.areEqual(this.value, other.value);
    }

    /**
     * Checks if this quantity is greater than another.
     *
     * @param other - The quantity to compare with.
     * @returns True if this quantity is greater.
     */
    public isGreaterThan(other: Quantity): boolean {
        return this.value > other.value;
    }

    /**
     * Checks if the quantity is zero.
     *
     * @returns True if quantity value is 0.
     */
    public isZero(): boolean {
        return this.value === 0;
    }

    /**
     * Checks if the quantity is negligible (effectively zero).
     *
     * @param threshold - Negligible threshold. Default: MIN_POSITION_THRESHOLD
     * @returns True if quantity is below threshold.
     */
    public isNegligible(threshold: number = MIN_POSITION_THRESHOLD): boolean {
        return QuantityUtils.isNegligible(this.value, threshold);
    }

    /**
     * Checks if the quantity is significant (not negligible).
     *
     * @param threshold - Negligible threshold. Default: MIN_POSITION_THRESHOLD
     * @returns True if quantity is at or above threshold.
     */
    public isSignificant(threshold: number = MIN_POSITION_THRESHOLD): boolean {
        return QuantityUtils.isSignificant(this.value, threshold);
    }

    /**
     * Returns the quantity as a formatted string.
     *
     * @returns Quantity formatted to precision.
     */
    public toString(): string {
        return this.value.toFixed(this.precision);
    }

    /**
     * Returns the quantity as a number.
     *
     * @returns The numeric quantity value.
     */
    public toNumber(): number {
        return this.value;
    }

    /**
     * Returns JSON representation.
     *
     * @returns Object with quantity details.
     */
    public toJSON(): Record<string, unknown> {
        return {
            value: this.value,
            stepSize: this.stepSize,
            precision: this.precision,
            formatted: this.toString()
        };
    }
}
