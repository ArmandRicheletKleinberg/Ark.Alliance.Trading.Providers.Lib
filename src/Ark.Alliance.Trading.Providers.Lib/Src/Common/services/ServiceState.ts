/**
 * @fileoverview Service Lifecycle State Enumeration
 * @module Common/services/ServiceState
 *
 * Defines service lifecycle states for managed services.
 */

/**
 * Service lifecycle states.
 * @enum {string}
 */
export enum ServiceState {
    /** Service is stopped and not running. */
    STOPPED = 'STOPPED',
    /** Service is in the process of starting. */
    STARTING = 'STARTING',
    /** Service is running and operational. */
    RUNNING = 'RUNNING',
    /** Service is in the process of stopping. */
    STOPPING = 'STOPPING',
    /** Service encountered an error. */
    ERROR = 'ERROR',
    /** Service is temporarily paused. */
    PAUSED = 'PAUSED'
}

/** Type alias for service state values. */
export type ServiceStateType = 'STOPPED' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'ERROR' | 'PAUSED';

/** Checks if service is in a running state. */
export function isActiveState(state: ServiceState): boolean {
    return state === ServiceState.RUNNING || state === ServiceState.STARTING;
}

/** Checks if service can be started. */
export function canStart(state: ServiceState): boolean {
    return state === ServiceState.STOPPED || state === ServiceState.ERROR;
}

/** Checks if service can be stopped. */
export function canStop(state: ServiceState): boolean {
    return state === ServiceState.RUNNING || state === ServiceState.PAUSED || state === ServiceState.ERROR;
}
