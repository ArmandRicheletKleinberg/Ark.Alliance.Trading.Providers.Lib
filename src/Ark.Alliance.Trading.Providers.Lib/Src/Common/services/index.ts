/**
 * @fileoverview Services Module Barrel Export
 * @module Common/services
 *
 * Centralized exports for service infrastructure classes.
 * Provides service lifecycle, cancellation, events, and streaming capabilities.
 */

// Service state management (lifecycle)
export {
    ServiceState,
    type ServiceStateType,
    isActiveState,
    canStart,
    canStop
} from './ServiceState';

// Service status (health/operational)
export {
    ServiceStatus,
    type ServiceStatusType,
    LIFECYCLE_STATUSES,
    HEALTH_STATUSES,
    OPERATIONAL_STATUSES,
    isActiveStatus,
    isTransitionalStatus,
    isErrorStatus,
    requiresAttention,
    getStatusSeverity,
    extendServiceStatus
} from './ServiceStatus';

// Service configuration
export {
    type ServiceConfig,
    DEFAULT_SERVICE_CONFIG,
    mergeServiceConfig
} from './ServiceConfig';

// Streaming interface
export {
    type IStreamingService,
    type StreamingOptions,
    type StreamingEvent,
    createStreamingEvent
} from './IStreamingService';

// Cancellation support
export {
    CancellationState,
    type CancellationStateType,
    isCancellationRequested,
    isCancelled,
    canRequestCancellation,
    CancellationToken,
    CancelledError,
    type CancellationCallback,
    type CancellationRegistration,
    CancellationTokenSource
} from './cancellation';

// Event management
export {
    type EventHandler,
    type EventCondition,
    type EventExpression,
    type EventRegistration,
    type EventEmissionResult,
    type EventHandlerError,
    DEFAULT_HANDLER_PRIORITY,
    MAX_HANDLERS_PER_EVENT,
    HANDLER_TIMEOUT_MS,
    ServiceEventManager
} from './events';

// Base service class
export {
    BaseService,
    type ServiceStats
} from './_BaseService';
