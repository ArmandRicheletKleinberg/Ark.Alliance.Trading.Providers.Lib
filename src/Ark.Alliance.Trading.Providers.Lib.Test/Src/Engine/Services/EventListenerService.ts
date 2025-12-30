/**
 * @fileoverview Event Listener Service Abstract Class
 * @module Engine/Services/EventListenerService
 *
 * Abstract service for WebSocket event listening in tests.
 * Extends BaseService to add event subscription management.
 *
 * @remarks
 * Provider-specific implementations (Binance, Deribit) extend this
 * to connect to their respective WebSocket streams and emit events.
 * 
 * Uses BaseService lifecycle:
 * - `start()` calls `onStart()` then `onStartHook()`
 * - `stop()` calls `onShutdown()` then `onStop()`
 */

import { BaseService, ServiceConfig, ServiceState } from 'ark-alliance-trading-providers-lib/Common/services';

/**
 * Event subscription configuration.
 */
export interface EventSubscription {
    /** Event name to listen for */
    eventName: string;

    /** Optional filter criteria */
    filter?: Record<string, unknown>;

    /** Handler for matched events */
    handler?: (data: unknown) => void;
}

/**
 * Received event data structure.
 */
export interface ReceivedEvent {
    /** Event name */
    eventName: string;

    /** Event data payload */
    data: unknown;

    /** Timestamp when received */
    receivedAt: number;

    /** Optional symbol if event is symbol-specific */
    symbol?: string;
}

/**
 * Abstract event listener service configuration.
 */
export interface EventListenerConfig extends Partial<ServiceConfig> {
    /** API key for authenticated services */
    apiKey?: string;
    /** API secret for authenticated services */
    apiSecret?: string;
    /** Base REST URL */
    baseUrl?: string;
    /** WebSocket URL */
    wsUrl?: string;
    /** Provider network */
    network?: 'TESTNET' | 'MAINNET';
}

/**
 * Abstract event listener service.
 *
 * @remarks
 * Subclasses must implement:
 * - `onStart()`: Initialize WebSocket connection
 * - `onStop()`: Close connection
 * - `subscribeToEvents()`: Start listening for events
 *
 * Use `start()` and `stop()` for lifecycle management (from BaseService).
 */
export abstract class EventListenerService extends BaseService {
    /** Buffer of received events */
    protected receivedEvents: ReceivedEvent[] = [];

    /** Maximum events to buffer */
    protected readonly maxBufferSize: number = 1000;

    /** Event subscriptions */
    protected subscriptions: EventSubscription[] = [];

    /**
     * Creates event listener service.
     */
    constructor(config: EventListenerConfig) {
        super({
            instanceKey: config.instanceKey ?? 'event-listener',
            ...config
        });
    }

    /**
     * Check if service is running.
     */
    public isConnected(): boolean {
        return this.getState() === ServiceState.RUNNING;
    }

    /**
     * Subscribe to events from the WebSocket stream.
     * Override in subclasses to handle provider-specific subscriptions.
     *
     * @param events - List of event names to subscribe to
     */
    public abstract subscribeToEvents(events: string[]): Promise<void>;

    /**
     * Unsubscribe from events.
     *
     * @param events - List of event names to unsubscribe from
     */
    public abstract unsubscribeFromEvents(events: string[]): Promise<void>;

    /**
     * Waits for a specific event within timeout.
     *
     * @param eventName - Name of event to wait for
     * @param timeoutMs - Maximum wait time
     * @param filter - Optional filter criteria
     * @returns The event data if received, undefined if timeout
     */
    public waitForEvent(
        eventName: string,
        timeoutMs: number = 5000,
        filter?: Record<string, unknown>
    ): Promise<ReceivedEvent | undefined> {
        return new Promise((resolve) => {
            // Check if already received
            const existing = this.findEvent(eventName, filter);
            if (existing) {
                resolve(existing);
                return;
            }

            // Set timeout
            const timeout = setTimeout(() => {
                this.removeListener(eventName, handler);
                resolve(undefined);
            }, timeoutMs);

            // Listen for new event
            const handler = (data: unknown) => {
                if (this.matchesFilter(data, filter)) {
                    clearTimeout(timeout);
                    const event: ReceivedEvent = {
                        eventName,
                        data,
                        receivedAt: Date.now()
                    };
                    resolve(event);
                }
            };

            this.once(eventName, handler);
        });
    }

    /**
     * Records an event to the buffer.
     *
     * @param eventName - Name of the event
     * @param data - Event data
     */
    protected recordEvent(eventName: string, data: unknown): void {
        const event: ReceivedEvent = {
            eventName,
            data,
            receivedAt: Date.now()
        };

        // Extract symbol if present
        if (data && typeof data === 'object' && 'symbol' in data) {
            event.symbol = (data as { symbol: string }).symbol;
        }

        this.receivedEvents.push(event);

        // Trim buffer if needed
        if (this.receivedEvents.length > this.maxBufferSize) {
            this.receivedEvents.shift();
        }

        // Emit for listeners
        this.emit(eventName, data);
        this.emit('event', event);
    }

    /**
     * Gets all received events.
     */
    public getReceivedEvents(): ReceivedEvent[] {
        return [...this.receivedEvents];
    }

    /**
     * Clears event buffer.
     */
    public clearEvents(): void {
        this.receivedEvents = [];
    }

    /**
     * Finds an event in the buffer matching criteria.
     */
    protected findEvent(eventName: string, filter?: Record<string, unknown>): ReceivedEvent | undefined {
        return this.receivedEvents.find(e =>
            e.eventName === eventName && this.matchesFilter(e.data, filter)
        );
    }

    /**
     * Checks if data matches filter criteria.
     */
    protected matchesFilter(data: unknown, filter?: Record<string, unknown>): boolean {
        if (!filter) return true;
        if (!data || typeof data !== 'object') return false;

        for (const [key, value] of Object.entries(filter)) {
            if ((data as Record<string, unknown>)[key] !== value) {
                return false;
            }
        }
        return true;
    }
}
