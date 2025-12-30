/**
 * @fileoverview Service Events Module Barrel Export
 * @module Common/services/events
 *
 * Centralized exports for service event infrastructure.
 */

// Event types
export {
    type EventHandler,
    type EventCondition,
    type EventExpression,
    type EventRegistration,
    type EventEmissionResult,
    type EventHandlerError,
    DEFAULT_HANDLER_PRIORITY,
    MAX_HANDLERS_PER_EVENT,
    HANDLER_TIMEOUT_MS
} from './ServiceEventTypes';

// Event manager
export {
    ServiceEventManager
} from './ServiceEventManager';
