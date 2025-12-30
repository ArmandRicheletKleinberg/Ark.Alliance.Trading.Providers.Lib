/**
 * @fileoverview Base Event Abstract Class
 * @module domain/events/BaseEvent
 *
 * Provides the foundation for all domain events in the Binance provider library.
 * All domain events must extend this class to ensure consistent event structure,
 * serialization, and correlation capabilities.
 *
 * @remarks
 * This class follows Domain-Driven Design (DDD) principles for domain events.
 * Each event carries immutable metadata including a unique identifier,
 * timestamp, type, source, and optional correlation ID for event tracing.
 *
 * @example
 * ```typescript
 * class OrderFilledEvent extends BaseEvent {
 *     constructor(
 *         public readonly orderId: number,
 *         public readonly symbol: string,
 *         public readonly filledQuantity: number,
 *         correlationId?: string
 *     ) {
 *         super('OrderFilledEvent', 'BinanceUserDataStream', correlationId);
 *     }
 *
 *     toJSON(): Record<string, unknown> {
 *         return {
 *             ...this.getBaseJSON(),
 *             orderId: this.orderId,
 *             symbol: this.symbol,
 *             filledQuantity: this.filledQuantity
 *         };
 *     }
 * }
 * ```
 */

import { randomUUID } from 'crypto';

/**
 * Abstract base class for all domain events.
 *
 * @abstract
 * @class BaseEvent
 *
 * @remarks
 * Provides immutable metadata for event identification and tracing.
 * Subclasses must implement the `toJSON` method for serialization.
 */
export abstract class BaseEvent {
    /**
     * Unique identifier for this event instance.
     * @readonly
     */
    public readonly id: string;

    /**
     * Unix timestamp (milliseconds) when the event was created.
     * @readonly
     */
    public readonly timestamp: number;

    /**
     * The type/name of the event (typically the class name).
     * @readonly
     */
    public readonly type: string;

    /**
     * The source component that generated this event.
     * @readonly
     */
    public readonly source: string;

    /**
     * Optional correlation ID for tracing related events across the system.
     * @readonly
     */
    public readonly correlationId?: string;

    /**
     * Creates an instance of BaseEvent.
     *
     * @param type - The event type identifier (typically the class name).
     * @param source - The source component generating this event.
     * @param correlationId - Optional ID to correlate related events.
     *
     * @example
     * ```typescript
     * super('PositionUpdatedEvent', 'BinanceUserDataStream', 'trade-123');
     * ```
     */
    protected constructor(type: string, source: string, correlationId?: string) {
        this.id = randomUUID();
        this.timestamp = Date.now();
        this.type = type;
        this.source = source;
        this.correlationId = correlationId;
    }

    /**
     * Returns the base event metadata as a JSON object.
     *
     * @returns A record containing the base event properties.
     *
     * @remarks
     * Subclasses should spread this in their `toJSON` implementation.
     *
     * @example
     * ```typescript
     * toJSON(): Record<string, unknown> {
     *     return {
     *         ...this.getBaseJSON(),
     *         customProperty: this.customProperty
     *     };
     * }
     * ```
     */
    protected getBaseJSON(): Record<string, unknown> {
        return {
            id: this.id,
            timestamp: this.timestamp,
            type: this.type,
            source: this.source,
            correlationId: this.correlationId
        };
    }

    /**
     * Serializes the event to a JSON-compatible object.
     *
     * @abstract
     * @returns A record containing all event properties.
     *
     * @remarks
     * Subclasses must implement this method to include their specific properties.
     */
    public abstract toJSON(): Record<string, unknown>;

    /**
     * Creates a string representation of the event for logging.
     *
     * @returns A formatted string representation of the event.
     */
    public toString(): string {
        return `[${this.type}] id=${this.id} source=${this.source} timestamp=${new Date(this.timestamp).toISOString()}`;
    }
}
