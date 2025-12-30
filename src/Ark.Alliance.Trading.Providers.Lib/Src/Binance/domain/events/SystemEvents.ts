/**
 * @fileoverview System Domain Events
 * @module domain/events/SystemEvents
 *
 * Domain events related to system infrastructure including connection
 * state changes and error conditions.
 */

import { BaseEvent } from './BaseEvent';
import { EventType } from './EventType';
import { EventSource } from './EventSource';

// ═══════════════════════════════════════════════════════════════════════════════
// Event Classes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Event fired when a connection is established.
 *
 * @extends BaseEvent
 */
export class ConnectionEstablishedEvent extends BaseEvent {
    /**
     * Creates a ConnectionEstablishedEvent instance.
     *
     * @param connectionType - Type of connection (e.g., 'WebSocket', 'REST').
     * @param endpoint - The endpoint that was connected to.
     * @param reconnectAttempt - Number of reconnect attempts before success (0 for first connect).
     * @param source - The source component that established the connection.
     * @param correlationId - Optional correlation ID for tracing.
     */
    constructor(
        public readonly connectionType: string,
        public readonly endpoint: string,
        public readonly reconnectAttempt: number,
        source: EventSource,
        correlationId?: string
    ) {
        super(EventType.CONNECTION_ESTABLISHED, source, correlationId);
    }

    /**
     * Checks if this was a reconnection (not first connect).
     *
     * @returns True if reconnect attempt is greater than 0.
     */
    public isReconnection(): boolean {
        return this.reconnectAttempt > 0;
    }

    /**
     * Serializes the event to JSON.
     *
     * @returns JSON representation of the event.
     */
    public toJSON(): Record<string, unknown> {
        return {
            ...this.getBaseJSON(),
            connectionType: this.connectionType,
            endpoint: this.endpoint,
            reconnectAttempt: this.reconnectAttempt
        };
    }
}

/**
 * Event fired when a connection is lost.
 *
 * @extends BaseEvent
 */
export class ConnectionLostEvent extends BaseEvent {
    /**
     * Creates a ConnectionLostEvent instance.
     *
     * @param connectionType - Type of connection that was lost.
     * @param endpoint - The endpoint that was disconnected.
     * @param closeCode - WebSocket close code (if applicable).
     * @param closeReason - WebSocket close reason (if applicable).
     * @param source - The source component that lost the connection.
     * @param correlationId - Optional correlation ID for tracing.
     */
    constructor(
        public readonly connectionType: string,
        public readonly endpoint: string,
        public readonly closeCode: number | undefined,
        public readonly closeReason: string | undefined,
        source: EventSource,
        correlationId?: string
    ) {
        super(EventType.CONNECTION_LOST, source, correlationId);
    }

    /**
     * Serializes the event to JSON.
     *
     * @returns JSON representation of the event.
     */
    public toJSON(): Record<string, unknown> {
        return {
            ...this.getBaseJSON(),
            connectionType: this.connectionType,
            endpoint: this.endpoint,
            closeCode: this.closeCode,
            closeReason: this.closeReason
        };
    }
}

/**
 * Event fired when a system error occurs.
 *
 * @extends BaseEvent
 */
export class SystemErrorEvent extends BaseEvent {
    /**
     * Creates a SystemErrorEvent instance.
     *
     * @param errorCode - Error code identifier.
     * @param errorMessage - Human-readable error message.
     * @param errorDetails - Additional error details (if available).
     * @param isRecoverable - Whether the error is recoverable.
     * @param source - The source component where the error occurred.
     * @param correlationId - Optional correlation ID for tracing.
     */
    constructor(
        public readonly errorCode: string,
        public readonly errorMessage: string,
        public readonly errorDetails: Record<string, unknown> | undefined,
        public readonly isRecoverable: boolean,
        source: EventSource,
        correlationId?: string
    ) {
        super(EventType.SYSTEM_ERROR, source, correlationId);
    }

    /**
     * Serializes the event to JSON.
     *
     * @returns JSON representation of the event.
     */
    public toJSON(): Record<string, unknown> {
        return {
            ...this.getBaseJSON(),
            errorCode: this.errorCode,
            errorMessage: this.errorMessage,
            errorDetails: this.errorDetails,
            isRecoverable: this.isRecoverable
        };
    }
}
