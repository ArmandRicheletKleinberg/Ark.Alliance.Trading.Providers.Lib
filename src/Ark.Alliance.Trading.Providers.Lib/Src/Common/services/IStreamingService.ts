/**
 * @fileoverview Streaming Service Interface
 * @module Common/services/IStreamingService
 *
 * Interface for Socket.IO streaming capabilities.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';

/**
 * Interface for services that support Socket.IO streaming.
 */
export interface IStreamingService {
    /**
     * Emits data to all connected clients.
     * @param event - Event name.
     * @param data - Data to emit.
     */
    emitToClients<T>(event: string, data: T): void;

    /**
     * Emits data to clients in a specific room.
     * @param room - Room name.
     * @param event - Event name.
     * @param data - Data to emit.
     */
    emitToRoom<T>(room: string, event: string, data: T): void;

    /**
     * Broadcasts data to all clients except sender.
     * @param event - Event name.
     * @param data - Data to emit.
     */
    broadcast<T>(event: string, data: T): void;

    /**
     * Joins a socket to a room.
     * @param socketId - Socket ID.
     * @param room - Room name.
     */
    joinRoom(socketId: string, room: string): Promise<void>;

    /**
     * Removes a socket from a room.
     * @param socketId - Socket ID.
     * @param room - Room name.
     */
    leaveRoom(socketId: string, room: string): Promise<void>;

    /**
     * Gets the count of connected clients.
     */
    getClientCount(): number;

    /**
     * Gets clients in a specific room.
     * @param room - Room name.
     */
    getRoomClients(room: string): Promise<string[]>;
}

/**
 * Streaming options for emitting data.
 */
export interface StreamingOptions {
    /** Target room (optional, broadcasts to all if not specified). */
    room?: string;
    /** Exclude these socket IDs. */
    exclude?: string[];
    /** Include only these socket IDs. */
    include?: string[];
    /** Whether to use volatile emit (no guarantee of delivery). */
    volatile?: boolean;
}

/**
 * Streaming event wrapper with metadata.
 */
export interface StreamingEvent<T> {
    /** Event type/name. */
    event: string;
    /** Event payload. */
    data: T;
    /** Timestamp of emission. */
    timestamp: number;
    /** Source service instance key. */
    source: string;
    /** Optional correlation ID. */
    correlationId?: string;
}

/**
 * Creates a streaming event wrapper.
 */
export function createStreamingEvent<T>(
    event: string,
    data: T,
    source: string,
    correlationId?: string
): StreamingEvent<T> {
    return {
        event,
        data,
        timestamp: Date.now(),
        source,
        correlationId
    };
}
