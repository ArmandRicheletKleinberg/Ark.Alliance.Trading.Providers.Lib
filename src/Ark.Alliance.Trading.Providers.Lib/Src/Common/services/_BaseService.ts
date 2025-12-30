/**
 * @fileoverview Abstract Base Service Class
 * @module Common/services/_BaseService
 *
 * Provides foundational service functionality with:
 * - Lifecycle management (start/stop) with hooks
 * - CancellationToken support for graceful shutdown
 * - Optional onStart/onShutdown hooks for custom logic
 * - Error handling with Result pattern
 * - Dynamic event system with conditions and expressions
 * - Context-aware logging
 * - Socket.IO streaming capabilities
 * - Async support with AsyncLock
 * - Built-in ConcurrentCache for multi-instance services
 * - Extensible service status
 *
 * @remarks
 * Abstract class that must be extended by concrete service implementations.
 * Subclasses must implement onStart() and onStop() lifecycle hooks.
 * Optional onStartHook() and onShutdown() for custom initialization/cleanup.
 */

import { EventEmitter } from 'events';
import { Server as SocketIOServer } from 'socket.io';

import { Result, createErrorDetail, createTimeoutError } from '../result';
import { ServiceState, canStart, canStop, isActiveState } from './ServiceState';
import { ServiceStatus, ServiceStatusType, isActiveStatus, isErrorStatus } from './ServiceStatus';
import { ServiceConfig, mergeServiceConfig, DEFAULT_SERVICE_CONFIG } from './ServiceConfig';
import { IStreamingService, StreamingEvent, createStreamingEvent, StreamingOptions } from './IStreamingService';
import { CancellationTokenSource, CancellationToken, CancelledError } from './cancellation';
import { ServiceEventManager, EventRegistration, EventHandler, EventCondition } from './events';
import { AsyncLock, getSharedLock } from '../helpers/concurrency/AsyncLock';
import { ConcurrentCache, CacheConfig } from '../helpers/cache';
import { LoggingService, createLogger, LogLevel } from '../helpers/logging';

// ═══════════════════════════════════════════════════════════════════════════════
// Service Statistics Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Service runtime statistics.
 */
export interface ServiceStats {
    /** Service instance key. */
    instanceKey: string;
    /** Current service state (lifecycle). */
    state: ServiceState;
    /** Current service status (health/operational). */
    status: ServiceStatusType;
    /** Service start time (null if not started). */
    startTime: Date | null;
    /** Total uptime in milliseconds. */
    uptimeMs: number;
    /** Number of errors encountered. */
    errorCount: number;
    /** Last error (if any). */
    lastError: string | null;
    /** Number of recovery attempts. */
    recoveryAttempts: number;
    /** Connected client count (if streaming enabled). */
    clientCount: number;
    /** Whether cancellation has been requested. */
    isCancellationRequested: boolean;
    /** Cache statistics (if cache enabled). */
    cacheSize: number;
    /** Number of registered event handlers. */
    eventHandlerCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Abstract Base Service Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Abstract base service class providing common service functionality.
 *
 * @abstract
 * @extends EventEmitter
 * @implements IStreamingService
 *
 * @example
 * ```typescript
 * class MyService extends BaseService {
 *     protected async onStart(): Promise<void> {
 *         // Initialize resources
 *     }
 *
 *     protected async onStop(): Promise<void> {
 *         // Cleanup resources
 *     }
 *
 *     public async doWork(): Promise<Result<string>> {
 *         return this.wrapAsync(async () => {
 *             // Protected async work with error handling
 *             return 'result';
 *         });
 *     }
 * }
 * ```
 */
export abstract class BaseService extends EventEmitter implements IStreamingService {
    // ═══════════════════════════════════════════════════════════════════════════
    // Protected Properties
    // ═══════════════════════════════════════════════════════════════════════════

    /** Service configuration. */
    protected readonly config: Required<ServiceConfig>;

    /** Current service state (lifecycle). */
    protected state: ServiceState = ServiceState.STOPPED;

    /** Current service status (health/operational). */
    protected status: ServiceStatusType = ServiceStatus.IDLE;

    /** Async lock for concurrency control. */
    protected readonly lock: AsyncLock;

    /** Socket.IO server instance. */
    protected io: SocketIOServer | null = null;

    /** Service start time. */
    protected startTime: Date | null = null;

    /** Error count since start. */
    protected errorCount: number = 0;

    /** Last error message. */
    protected lastError: string | null = null;

    /** Recovery attempt counter. */
    protected recoveryAttempts: number = 0;

    /** Cancellation token source for graceful shutdown. */
    protected readonly cancellationSource: CancellationTokenSource;

    /** Built-in cache for multi-instance services. */
    protected readonly cache: ConcurrentCache<string, unknown>;

    /** Context-aware logging service. */
    protected readonly logger: LoggingService;

    /** Dynamic event manager with conditions and expressions. */
    protected readonly events: ServiceEventManager<BaseService>;

    // ═══════════════════════════════════════════════════════════════════════════
    // Constructor
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Creates a new BaseService instance.
     * @param config - Service configuration.
     * @param sharedLock - Optional shared AsyncLock (uses global if not provided).
     * @param cacheConfig - Optional cache configuration.
     */
    constructor(config: ServiceConfig, sharedLock?: AsyncLock, cacheConfig?: CacheConfig) {
        super();
        this.config = mergeServiceConfig(config);
        this.lock = sharedLock || getSharedLock();
        this.cancellationSource = new CancellationTokenSource();
        this.cache = new ConcurrentCache<string, unknown>({
            name: `${config.instanceKey}-cache`,
            ...cacheConfig
        });

        // Initialize context-aware logger with service name
        this.logger = createLogger(this.getServiceName());

        // Initialize event manager with this service as context
        this.events = new ServiceEventManager<BaseService>(this, this.getServiceName());
    }

    /**
     * Gets the service name for logging context.
     * Override in subclasses to provide custom name.
     * @protected
     */
    protected getServiceName(): string {
        return this.constructor.name || this.config.instanceKey;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Abstract Methods (must be implemented by subclasses)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Called when service starts. Initialize resources here.
     * @protected
     * @abstract
     */
    protected abstract onStart(): Promise<void>;

    /**
     * Called when service stops. Cleanup resources here.
     * @protected
     * @abstract
     */
    protected abstract onStop(): Promise<void>;

    /**
     * Optional hook called after onStart() succeeds.
     * Use for additional initialization, registering event handlers, etc.
     * Override in subclasses to implement custom startup logic.
     * @protected
     * @virtual
     * @param token - Cancellation token for the service.
     *
     * @example
     * ```typescript
     * protected async onStartHook(token: CancellationToken): Promise<void> {
     *     // Register dynamic events
     *     this.events.on({
     *         id: 'price-alert',
     *         eventName: 'priceUpdate',
     *         handler: (price) => this.checkAlerts(price),
     *         condition: (price) => price.change > 5
     *     });
     *
     *     // Start background tasks
     *     this.startHeartbeat(token);
     * }
     * ```
     */
    protected onStartHook?(token: CancellationToken): Promise<void>;

    /**
     * Optional hook called before service stops.
     * Use for cleanup tasks like cancelling orders, saving state, etc.
     * Override in subclasses to implement custom shutdown logic.
     * @protected
     * @virtual
     * @param token - Cancellation token that is already cancelled.
     *
     * @example
     * ```typescript
     * protected async onShutdown(token: CancellationToken): Promise<void> {
     *     // Cancel pending orders
     *     await this.orderManager.cancelAllPending();
     *
     *     // Save current state
     *     await this.stateRepository.save(this.currentState);
     * }
     * ```
     */
    protected onShutdown?(token: CancellationToken): Promise<void>;

    // ═══════════════════════════════════════════════════════════════════════════
    // Lifecycle Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Starts the service.
     * Calls onStart, then onStartHook for additional initialization.
     * @returns Result indicating success or failure.
     */
    public async start(): Promise<Result<void>> {
        if (!canStart(this.state)) {
            return Result.fail({
                code: 'INVALID_STATE',
                message: `Cannot start service in state: ${this.state}`,
                timestamp: Date.now()
            });
        }

        this.state = ServiceState.STARTING;
        this.status = ServiceStatus.STARTING;
        this.emit('stateChanged', this.state);
        this.emit('statusChanged', this.status);
        this.logger.info('Service starting...');

        try {
            // 1. Call abstract onStart
            await this.onStart();

            // 2. Call optional onStartHook
            if (this.onStartHook) {
                this.logger.debug('Executing start hook...');
                await this.onStartHook(this.cancellationToken);
            }

            // 3. Update state and status
            this.state = ServiceState.RUNNING;
            this.status = ServiceStatus.RUNNING;
            this.startTime = new Date();
            this.errorCount = 0;
            this.recoveryAttempts = 0;

            this.emit('stateChanged', this.state);
            this.emit('statusChanged', this.status);
            this.emit('started');
            this.logger.info('Service started successfully');

            return Result.ok(undefined);
        } catch (error) {
            this.state = ServiceState.ERROR;
            this.status = ServiceStatus.ERROR;
            this.lastError = (error as Error).message;
            this.emit('stateChanged', this.state);
            this.emit('statusChanged', this.status);
            this.emit('error', error);
            this.logger.error('Service start failed', error);
            return Result.fromError(error as Error, 'START_FAILED');
        }
    }

    /**
     * Stops the service.
     * Triggers cancellation, calls onShutdown hook, then onStop.
     * @param reason - Optional reason for stopping (for logging).
     * @returns Result indicating success or failure.
     */
    public async stop(reason?: string): Promise<Result<void>> {
        if (!canStop(this.state)) {
            return Result.fail({
                code: 'INVALID_STATE',
                message: `Cannot stop service in state: ${this.state}`,
                timestamp: Date.now()
            });
        }

        this.state = ServiceState.STOPPING;
        this.status = ServiceStatus.STOPPING;
        this.emit('stateChanged', this.state);
        this.emit('statusChanged', this.status);
        this.logger.info(`Stopping service${reason ? `: ${reason}` : '...'}`);

        try {
            // 1. Trigger cancellation for all pending operations
            await this.cancellationSource.cancel(reason || 'Service stopping');

            // 2. Update status to SHUTTING_DOWN during cleanup
            this.status = ServiceStatus.SHUTTING_DOWN;
            this.emit('statusChanged', this.status);

            // 3. Call optional onShutdown hook for cleanup (cancel orders, save state)
            if (this.onShutdown) {
                this.logger.debug('Executing shutdown hook...');
                await this.onShutdown(this.cancellationSource.token);
            }

            // 4. Call onStop for final cleanup
            await this.onStop();

            // 5. Dispose cache and event manager
            this.cache.dispose();
            this.events.clear();

            // 6. Update final state
            this.state = ServiceState.STOPPED;
            this.status = ServiceStatus.STOPPED;
            this.startTime = null;
            this.emit('stateChanged', this.state);
            this.emit('statusChanged', this.status);
            this.emit('stopped');
            this.logger.info('Service stopped successfully');
            return Result.ok(undefined);
        } catch (error) {
            this.state = ServiceState.ERROR;
            this.status = ServiceStatus.ERROR;
            this.lastError = (error as Error).message;
            this.emit('stateChanged', this.state);
            this.emit('statusChanged', this.status);
            this.emit('error', error);
            this.logger.error('Service stop failed', error);
            return Result.fromError(error as Error, 'STOP_FAILED');
        }
    }

    /**
     * Restarts the service.
     * @returns Result indicating success or failure.
     */
    public async restart(): Promise<Result<void>> {
        const stopResult = await this.stop();
        if (!stopResult.isSuccess) {
            return stopResult;
        }
        return this.start();
    }

    /**
     * Pauses the service (if supported).
     * @returns Result indicating success or failure.
     */
    public async pause(): Promise<Result<void>> {
        if (this.state !== ServiceState.RUNNING) {
            return Result.fail({
                code: 'INVALID_STATE',
                message: 'Service must be running to pause',
                timestamp: Date.now()
            });
        }
        this.state = ServiceState.PAUSED;
        this.emit('stateChanged', this.state);
        this.emit('paused');
        return Result.ok(undefined);
    }

    /**
     * Resumes a paused service.
     * @returns Result indicating success or failure.
     */
    public async resume(): Promise<Result<void>> {
        if (this.state !== ServiceState.PAUSED) {
            return Result.fail({
                code: 'INVALID_STATE',
                message: 'Service must be paused to resume',
                timestamp: Date.now()
            });
        }
        this.state = ServiceState.RUNNING;
        this.emit('stateChanged', this.state);
        this.emit('resumed');
        return Result.ok(undefined);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Error Handling
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Handles an error with logging and state management.
     * @param error - The error to handle.
     * @param context - Optional context string.
     * @returns Result with error details.
     */
    protected handleError<T>(error: Error, context?: string): Result<T> {
        this.errorCount++;
        this.lastError = error.message;
        const contextMsg = context ? ` [${context}]` : '';
        this.logger.error(`${this.config.instanceKey}${contextMsg}: ${error.message}`, error);
        this.emit('error', error, context);

        // Attempt auto-recovery if enabled
        if (this.config.autoRecover && this.state === ServiceState.RUNNING) {
            this.attemptRecovery();
        }

        return Result.fromError(error, 'SERVICE_ERROR');
    }

    /**
     * Attempts to recover from an error.
     */
    protected async attemptRecovery(): Promise<void> {
        if (this.recoveryAttempts >= this.config.maxRecoveryAttempts) {
            this.logger.error(`${this.config.instanceKey}: Max recovery attempts reached`);
            this.state = ServiceState.ERROR;
            this.emit('stateChanged', this.state);
            this.emit('recoveryFailed');
            return;
        }

        this.recoveryAttempts++;
        this.logger.warn(`${this.config.instanceKey}: Recovery attempt ${this.recoveryAttempts}/${this.config.maxRecoveryAttempts}`);
        this.emit('recoveryAttempt', this.recoveryAttempts);

        await new Promise(resolve => setTimeout(resolve, this.config.recoveryDelayMs));

        try {
            await this.restart();
            this.recoveryAttempts = 0;
            this.emit('recovered');
        } catch (error) {
            this.logger.error(`${this.config.instanceKey}: Recovery failed`, error);
        }
    }

    /**
     * Wraps an async operation with error handling, cancellation support, and optional locking.
     * @template T - Return type.
     * @param fn - Async function to execute.
     * @param lockKey - Optional lock key for serialized execution.
     * @returns Result with data or error.
     */
    protected async wrapAsync<T>(
        fn: () => Promise<T>,
        lockKey?: string
    ): Promise<Result<T>> {
        // Check cancellation first
        if (this.cancellationToken.isCancellationRequested) {
            return Result.fail({
                code: 'OPERATION_CANCELLED',
                message: 'Operation cancelled',
                timestamp: Date.now()
            });
        }

        if (!isActiveState(this.state)) {
            return Result.fail({
                code: 'SERVICE_NOT_RUNNING',
                message: `Service is not running (state: ${this.state})`,
                timestamp: Date.now()
            });
        }

        try {
            if (lockKey) {
                const data = await this.lock.withLock(lockKey, fn, this.config.lockTimeoutMs);
                return Result.ok(data);
            } else {
                const data = await fn();
                return Result.ok(data);
            }
        } catch (error) {
            // Handle cancellation errors specifically
            if (CancelledError.isCancelledError(error)) {
                return Result.fail({
                    code: 'OPERATION_CANCELLED',
                    message: (error as Error).message,
                    timestamp: Date.now()
                });
            }
            return this.handleError(error as Error);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Cancellation Support
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Gets the cancellation token for this service.
     * Pass this token to async operations to enable cooperative cancellation.
     */
    public get cancellationToken(): CancellationToken {
        return this.cancellationSource.token;
    }

    /**
     * Whether cancellation has been requested for this service.
     */
    public get isCancellationRequested(): boolean {
        return this.cancellationSource.isCancellationRequested;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Async Lock Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Executes function with lock.
     * @param key - Lock key.
     * @param fn - Function to execute.
     * @returns Promise with function result.
     */
    protected async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
        return this.lock.withLock(key, fn, this.config.lockTimeoutMs);
    }

    /**
     * Attempts to acquire lock without waiting.
     * @param key - Lock key.
     * @returns Release function or null if lock is held.
     */
    protected tryLock(key: string): (() => void) | null {
        return this.lock.tryAcquire(key);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Streaming (Socket.IO) Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Sets the Socket.IO server for streaming.
     * @param io - Socket.IO server instance.
     */
    public setSocketServer(io: SocketIOServer): void {
        this.io = io;
        this.logger.info(`${this.config.instanceKey}: Socket.IO server configured`);
    }

    /**
     * Emits data to all connected clients.
     * @template T - Data type.
     * @param event - Event name.
     * @param data - Data to emit.
     */
    public emitToClients<T>(event: string, data: T): void {
        if (!this.io || !this.config.enableStreaming) return;

        const streamEvent = createStreamingEvent(event, data, this.config.instanceKey);
        this.io.of(this.config.streamingNamespace).emit(event, streamEvent);
    }

    /**
     * Emits data to clients in a specific room.
     * @template T - Data type.
     * @param room - Room name.
     * @param event - Event name.
     * @param data - Data to emit.
     */
    public emitToRoom<T>(room: string, event: string, data: T): void {
        if (!this.io || !this.config.enableStreaming) return;

        const streamEvent = createStreamingEvent(event, data, this.config.instanceKey);
        this.io.of(this.config.streamingNamespace).to(room).emit(event, streamEvent);
    }

    /**
     * Broadcasts data to all clients except sender.
     * @template T - Data type.
     * @param event - Event name.
     * @param data - Data to emit.
     */
    public broadcast<T>(event: string, data: T): void {
        this.emitToClients(event, data);
    }

    /**
     * Joins a socket to a room.
     * @param socketId - Socket ID.
     * @param room - Room name.
     */
    public async joinRoom(socketId: string, room: string): Promise<void> {
        if (!this.io) return;
        const socket = this.io.of(this.config.streamingNamespace).sockets.get(socketId);
        if (socket) {
            await socket.join(room);
        }
    }

    /**
     * Removes a socket from a room.
     * @param socketId - Socket ID.
     * @param room - Room name.
     */
    public async leaveRoom(socketId: string, room: string): Promise<void> {
        if (!this.io) return;
        const socket = this.io.of(this.config.streamingNamespace).sockets.get(socketId);
        if (socket) {
            await socket.leave(room);
        }
    }

    /**
     * Gets the count of connected clients.
     * @returns Number of connected clients.
     */
    public getClientCount(): number {
        if (!this.io) return 0;
        return this.io.of(this.config.streamingNamespace).sockets.size;
    }

    /**
     * Gets clients in a specific room.
     * @param room - Room name.
     * @returns Array of socket IDs.
     */
    public async getRoomClients(room: string): Promise<string[]> {
        if (!this.io) return [];
        const sockets = await this.io.of(this.config.streamingNamespace).in(room).fetchSockets();
        return sockets.map(s => s.id);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Status Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Gets the current service state.
     * @returns Current ServiceState.
     */
    public getState(): ServiceState {
        return this.state;
    }

    /**
     * Checks if service is running.
     * @returns True if running.
     */
    public isRunning(): boolean {
        return this.state === ServiceState.RUNNING;
    }

    /**
     * Gets service statistics.
     * @returns ServiceStats object.
     */
    public getStats(): ServiceStats {
        return {
            instanceKey: this.config.instanceKey,
            state: this.state,
            status: this.status,
            startTime: this.startTime,
            uptimeMs: this.startTime ? Date.now() - this.startTime.getTime() : 0,
            errorCount: this.errorCount,
            lastError: this.lastError,
            recoveryAttempts: this.recoveryAttempts,
            clientCount: this.getClientCount(),
            isCancellationRequested: this.isCancellationRequested,
            cacheSize: this.cache.size,
            eventHandlerCount: this.events.getEventNames().reduce(
                (count, name) => count + this.events.getHandlerCount(name), 0
            )
        };
    }

    /**
     * Gets the current service status.
     * @returns Current ServiceStatusType.
     */
    public getStatus(): ServiceStatusType {
        return this.status;
    }

    /**
     * Sets the service status.
     * Use for updating operational health status.
     * @param status - New status.
     * @param reason - Optional reason for status change.
     */
    public setStatus(status: ServiceStatusType, reason?: string): void {
        const oldStatus = this.status;
        this.status = status;
        this.emit('statusChanged', this.status, oldStatus);

        if (reason) {
            this.logger.info(`Status changed: ${oldStatus} -> ${status}: ${reason}`);
        } else {
            this.logger.debug(`Status changed: ${oldStatus} -> ${status}`);
        }
    }

    /**
     * Gets the instance key.
     * @returns Service instance key.
     */
    public getInstanceKey(): string {
        return this.config.instanceKey;
    }

    /**
     * Gets the logger instance for this service.
     * Child services can use this to create sub-loggers.
     */
    public getLogger(): LoggingService {
        return this.logger;
    }
}
