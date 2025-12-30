/**
 * @fileoverview Service Event Handler Types
 * @module Common/services/events/ServiceEventTypes
 *
 * Type definitions for dynamic service events with expressions and conditions.
 * Enables runtime event configuration with conditional triggering.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Event Handler Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Event handler function signature.
 * @template TData - Event data type.
 * @template TContext - Context type (usually the service instance).
 */
export type EventHandler<TData = unknown, TContext = unknown> = (
    data: TData,
    context: TContext
) => void | Promise<void>;

/**
 * Condition function to determine if event handler should execute.
 * @template TData - Event data type.
 * @template TContext - Context type.
 */
export type EventCondition<TData = unknown, TContext = unknown> = (
    data: TData,
    context: TContext
) => boolean;

/**
 * Expression function to transform event data before handler execution.
 * @template TData - Input event data type.
 * @template TOutput - Transformed output type.
 * @template TContext - Context type.
 */
export type EventExpression<TData = unknown, TOutput = unknown, TContext = unknown> = (
    data: TData,
    context: TContext
) => TOutput;

// ═══════════════════════════════════════════════════════════════════════════════
// Event Registration Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for registering a dynamic event handler.
 * @template TData - Event data type.
 * @template TContext - Context type.
 */
export interface EventRegistration<TData = unknown, TContext = unknown> {
    /** Unique identifier for this registration. */
    id: string;

    /** Event name to listen for. */
    eventName: string;

    /** Handler function to execute. */
    handler: EventHandler<TData, TContext>;

    /**
     * Optional condition - handler only executes if condition returns true.
     */
    condition?: EventCondition<TData, TContext>;

    /**
     * Optional expression to transform data before handler.
     */
    expression?: EventExpression<TData, unknown, TContext>;

    /**
     * Whether handler should execute only once then auto-unregister.
     */
    once?: boolean;

    /**
     * Priority for handler execution order (lower = earlier).
     */
    priority?: number;

    /**
     * Whether handler errors should prevent other handlers from running.
     */
    stopOnError?: boolean;

    /**
     * Optional description for debugging/logging.
     */
    description?: string;
}

/**
 * Result of event emission.
 */
export interface EventEmissionResult {
    /** Event name that was emitted. */
    eventName: string;
    /** Number of handlers that were invoked. */
    handlersInvoked: number;
    /** Number of handlers that were skipped due to conditions. */
    handlersSkipped: number;
    /** Any errors that occurred during handler execution. */
    errors: EventHandlerError[];
    /** Total execution time in milliseconds. */
    executionTimeMs: number;
}

/**
 * Error information from handler execution.
 */
export interface EventHandlerError {
    /** Registration ID of the failed handler. */
    registrationId: string;
    /** Error that occurred. */
    error: Error;
    /** Whether error stopped other handlers. */
    stoppedPropagation: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default handler priority.
 */
export const DEFAULT_HANDLER_PRIORITY = 100;

/**
 * Maximum number of handlers per event.
 */
export const MAX_HANDLERS_PER_EVENT = 100;

/**
 * Handler execution timeout in milliseconds.
 */
export const HANDLER_TIMEOUT_MS = 30000;
