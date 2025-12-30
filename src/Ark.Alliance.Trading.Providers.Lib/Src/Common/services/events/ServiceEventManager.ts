/**
 * @fileoverview Service Event Manager
 * @module Common/services/events/ServiceEventManager
 *
 * Manages dynamic event registration with conditions and expressions.
 * Enables runtime event handler configuration for service extensibility.
 *
 * @remarks
 * Features:
 * - Dynamic event handler registration
 * - Conditional execution (handler only runs if condition is true)
 * - Expression transformation (modify data before handler)
 * - Priority ordering
 * - One-time handlers
 * - Error handling with optional propagation stopping
 */

import {
    EventHandler,
    EventCondition,
    EventExpression,
    EventRegistration,
    EventEmissionResult,
    EventHandlerError,
    DEFAULT_HANDLER_PRIORITY,
    MAX_HANDLERS_PER_EVENT,
    HANDLER_TIMEOUT_MS
} from './ServiceEventTypes';

import { LoggingService, createLogger } from '../../helpers/logging';

// ═══════════════════════════════════════════════════════════════════════════════
// ServiceEventManager Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Manages dynamic event handlers with conditions and expressions.
 *
 * @template TContext - The context type (usually the service instance).
 *
 * @example
 * ```typescript
 * class TradingService extends BaseService {
 *     private events = new ServiceEventManager<TradingService>(this);
 *
 *     async onStart() {
 *         // Register conditional event
 *         this.events.on({
 *             id: 'large-order-alert',
 *             eventName: 'orderPlaced',
 *             handler: (order) => this.alertLargeOrder(order),
 *             condition: (order) => order.quantity > 1000
 *         });
 *     }
 * }
 * ```
 */
export class ServiceEventManager<TContext = unknown> {
    /**
     * Map of event names to registered handlers.
     * @private
     */
    private readonly handlers: Map<string, EventRegistration<unknown, TContext>[]> = new Map();

    /**
     * Context passed to handlers (usually the service instance).
     * @private
     */
    private readonly context: TContext;

    /**
     * Logger for event manager.
     * @private
     */
    private readonly logger: LoggingService;

    /**
     * Creates a new ServiceEventManager.
     *
     * @param context - Context passed to handlers.
     * @param loggerContext - Optional logger context name.
     */
    constructor(context: TContext, loggerContext?: string) {
        this.context = context;
        this.logger = createLogger(loggerContext ?? 'EventManager');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Registration Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Registers an event handler with full configuration.
     *
     * @param registration - Event registration configuration.
     * @returns The registration ID.
     * @throws Error if max handlers exceeded or duplicate ID.
     */
    public on<TData = unknown>(registration: EventRegistration<TData, TContext>): string {
        const eventName = registration.eventName;

        // Ensure handlers array exists
        if (!this.handlers.has(eventName)) {
            this.handlers.set(eventName, []);
        }

        const eventHandlers = this.handlers.get(eventName)!;

        // Check max handlers
        if (eventHandlers.length >= MAX_HANDLERS_PER_EVENT) {
            throw new Error(`Max handlers (${MAX_HANDLERS_PER_EVENT}) exceeded for event: ${eventName}`);
        }

        // Check duplicate ID
        if (eventHandlers.some(h => h.id === registration.id)) {
            throw new Error(`Handler with ID "${registration.id}" already registered for event: ${eventName}`);
        }

        // Add with defaults - cast to unknown data type for storage
        const fullRegistration = {
            ...registration,
            priority: registration.priority ?? DEFAULT_HANDLER_PRIORITY,
            once: registration.once ?? false,
            stopOnError: registration.stopOnError ?? false
        } as EventRegistration<unknown, TContext>;

        eventHandlers.push(fullRegistration);

        // Sort by priority (lower = earlier)
        eventHandlers.sort((a, b) => (a.priority ?? DEFAULT_HANDLER_PRIORITY) - (b.priority ?? DEFAULT_HANDLER_PRIORITY));

        this.logger.debug(`Registered handler: ${registration.id} for event: ${eventName}`, {
            description: registration.description,
            priority: registration.priority,
            once: registration.once,
            hasCondition: !!registration.condition,
            hasExpression: !!registration.expression
        });

        return registration.id;
    }

    /**
     * Registers a simple event handler without conditions.
     *
     * @param eventName - Event name.
     * @param handler - Handler function.
     * @param id - Optional handler ID (auto-generated if not provided).
     * @returns The registration ID.
     */
    public addHandler<TData = unknown>(
        eventName: string,
        handler: EventHandler<TData, TContext>,
        id?: string
    ): string {
        return this.on({
            id: id ?? `handler_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            eventName,
            handler: handler as EventHandler<unknown, TContext>
        });
    }

    /**
     * Registers a one-time event handler.
     *
     * @param eventName - Event name.
     * @param handler - Handler function.
     * @param id - Optional handler ID.
     * @returns The registration ID.
     */
    public once<TData = unknown>(
        eventName: string,
        handler: EventHandler<TData, TContext>,
        id?: string
    ): string {
        return this.on({
            id: id ?? `once_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            eventName,
            handler: handler as EventHandler<unknown, TContext>,
            once: true
        });
    }

    /**
     * Registers a conditional event handler.
     *
     * @param eventName - Event name.
     * @param handler - Handler function.
     * @param condition - Condition that must be true for handler to execute.
     * @param id - Optional handler ID.
     * @returns The registration ID.
     */
    public onIf<TData = unknown>(
        eventName: string,
        handler: EventHandler<TData, TContext>,
        condition: EventCondition<TData, TContext>,
        id?: string
    ): string {
        return this.on({
            id: id ?? `conditional_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            eventName,
            handler: handler as EventHandler<unknown, TContext>,
            condition: condition as EventCondition<unknown, TContext>
        });
    }

    /**
     * Unregisters an event handler by ID.
     *
     * @param eventName - Event name.
     * @param handlerId - Handler registration ID.
     * @returns True if handler was found and removed.
     */
    public off(eventName: string, handlerId: string): boolean {
        const eventHandlers = this.handlers.get(eventName);
        if (!eventHandlers) return false;

        const index = eventHandlers.findIndex(h => h.id === handlerId);
        if (index === -1) return false;

        eventHandlers.splice(index, 1);
        this.logger.debug(`Unregistered handler: ${handlerId} from event: ${eventName}`);
        return true;
    }

    /**
     * Unregisters all handlers for an event.
     *
     * @param eventName - Event name.
     */
    public offAll(eventName: string): void {
        this.handlers.delete(eventName);
        this.logger.debug(`Unregistered all handlers for event: ${eventName}`);
    }

    /**
     * Clears all event handlers.
     */
    public clear(): void {
        this.handlers.clear();
        this.logger.debug('Cleared all event handlers');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Emission Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Emits an event to all registered handlers.
     *
     * @param eventName - Event name.
     * @param data - Event data.
     * @returns Emission result with statistics.
     */
    public async emit<TData = unknown>(eventName: string, data: TData): Promise<EventEmissionResult> {
        const startTime = Date.now();
        const result: EventEmissionResult = {
            eventName,
            handlersInvoked: 0,
            handlersSkipped: 0,
            errors: [],
            executionTimeMs: 0
        };

        const eventHandlers = this.handlers.get(eventName);
        if (!eventHandlers || eventHandlers.length === 0) {
            result.executionTimeMs = Date.now() - startTime;
            return result;
        }

        const toRemove: string[] = [];

        for (const registration of eventHandlers) {
            try {
                // Check condition
                if (registration.condition) {
                    const conditionMet = registration.condition(data, this.context);
                    if (!conditionMet) {
                        result.handlersSkipped++;
                        continue;
                    }
                }

                // Apply expression if present
                let transformedData: unknown = data;
                if (registration.expression) {
                    transformedData = registration.expression(data, this.context);
                }

                // Execute handler
                await registration.handler(transformedData, this.context);
                result.handlersInvoked++;

                // Mark for removal if once
                if (registration.once) {
                    toRemove.push(registration.id);
                }
            } catch (error) {
                const handlerError: EventHandlerError = {
                    registrationId: registration.id,
                    error: error as Error,
                    stoppedPropagation: registration.stopOnError ?? false
                };
                result.errors.push(handlerError);

                this.logger.error(`Handler ${registration.id} failed for event ${eventName}`, error);

                if (registration.stopOnError) {
                    break;
                }
            }
        }

        // Remove one-time handlers
        for (const id of toRemove) {
            this.off(eventName, id);
        }

        result.executionTimeMs = Date.now() - startTime;
        return result;
    }

    /**
     * Synchronously emits an event (fire and forget).
     *
     * @param eventName - Event name.
     * @param data - Event data.
     */
    public emitSync<TData = unknown>(eventName: string, data: TData): void {
        this.emit(eventName, data).catch(error => {
            this.logger.error(`Async emit failed for event ${eventName}`, error);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Query Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Gets all registered event names.
     */
    public getEventNames(): string[] {
        return Array.from(this.handlers.keys());
    }

    /**
     * Gets handler count for an event.
     *
     * @param eventName - Event name.
     * @returns Number of registered handlers.
     */
    public getHandlerCount(eventName: string): number {
        return this.handlers.get(eventName)?.length ?? 0;
    }

    /**
     * Checks if event has any handlers.
     *
     * @param eventName - Event name.
     * @returns True if event has handlers.
     */
    public hasHandlers(eventName: string): boolean {
        return this.getHandlerCount(eventName) > 0;
    }

    /**
     * Gets all handler registrations for an event.
     *
     * @param eventName - Event name.
     * @returns Array of registrations (readonly).
     */
    public getRegistrations(eventName: string): readonly EventRegistration<unknown, TContext>[] {
        return this.handlers.get(eventName) ?? [];
    }
}
