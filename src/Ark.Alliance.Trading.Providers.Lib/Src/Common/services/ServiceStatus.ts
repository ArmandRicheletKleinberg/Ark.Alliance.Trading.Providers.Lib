/**
 * @fileoverview Service Status Enumeration
 * @module Common/services/ServiceStatus
 *
 * Extensible service status values for tracking service lifecycle and health.
 * These statuses complement ServiceState (lifecycle) with operational health information.
 *
 * @remarks
 * **Naming Convention**: Uses industry-standard terminology:
 * - Present participle (-ING) for transitional states
 * - Past participle (-ED) or adjectives for stable states
 *
 * **Extensibility**: Services can define custom statuses by extending this enum
 * in their own modules while maintaining compatibility with base infrastructure.
 *
 * @example
 * ```typescript
 * // Extending statuses for a specific service
 * const TradingServiceStatus = {
 *     ...ServiceStatus,
 *     RECONNECTING: 'RECONNECTING',
 *     RATE_LIMITED: 'RATE_LIMITED',
 *     MARKET_CLOSED: 'MARKET_CLOSED'
 * } as const;
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Service Status Enumeration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standard service status values.
 *
 * @remarks
 * Status categories:
 * - **Lifecycle**: IDLE, INITIALIZING, STARTING, RUNNING, STOPPING, STOPPED
 * - **Transitional**: SHUTTING_DOWN, RESTARTING, RECOVERING
 * - **Health**: HEALTHY, DEGRADED, WARNING, ERROR, CRITICAL
 * - **Operational**: PAUSED, SUSPENDED, MAINTENANCE
 *
 * @enum {string}
 */
export const ServiceStatus = {
    // ═══════════════════════════════════════════════════════════════════════════
    // Lifecycle Statuses
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Service is idle and has not been initialized.
     * Initial state before any configuration.
     */
    IDLE: 'IDLE',

    /**
     * Service is initializing resources.
     * Loading configuration, establishing connections.
     */
    INITIALIZING: 'INITIALIZING',

    /**
     * Service is starting up.
     * Resources initialized, beginning operations.
     */
    STARTING: 'STARTING',

    /**
     * Service is running normally.
     * Fully operational and processing requests.
     */
    RUNNING: 'RUNNING',

    /**
     * Service is stopping.
     * Graceful shutdown in progress.
     */
    STOPPING: 'STOPPING',

    /**
     * Service has stopped.
     * All resources released, not operational.
     */
    STOPPED: 'STOPPED',

    /**
     * Service is executing shutdown hooks.
     * Between STOPPING and STOPPED - cleaning up resources.
     */
    SHUTTING_DOWN: 'SHUTTING_DOWN',

    /**
     * Service is restarting.
     * Stop and start cycle in progress.
     */
    RESTARTING: 'RESTARTING',

    // ═══════════════════════════════════════════════════════════════════════════
    // Health Statuses
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Service is healthy.
     * All systems operational, no issues.
     */
    HEALTHY: 'HEALTHY',

    /**
     * Service is degraded.
     * Operational but with reduced functionality or performance.
     */
    DEGRADED: 'DEGRADED',

    /**
     * Service has a warning condition.
     * Operational but requires attention.
     */
    WARNING: 'WARNING',

    /**
     * Service has an error condition.
     * Some functionality may be impaired.
     */
    ERROR: 'ERROR',

    /**
     * Service has a critical error.
     * Severely impaired or non-functional.
     */
    CRITICAL: 'CRITICAL',

    /**
     * Service is recovering from an error.
     * Attempting to restore normal operation.
     */
    RECOVERING: 'RECOVERING',

    // ═══════════════════════════════════════════════════════════════════════════
    // Operational Statuses
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Service is paused.
     * Temporarily suspended, can be resumed quickly.
     */
    PAUSED: 'PAUSED',

    /**
     * Service is suspended.
     * Long-term pause, may require restart.
     */
    SUSPENDED: 'SUSPENDED',

    /**
     * Service is in maintenance mode.
     * Limited functionality while maintenance is performed.
     */
    MAINTENANCE: 'MAINTENANCE',

    /**
     * Service status is unknown.
     * Unable to determine current status.
     */
    UNKNOWN: 'UNKNOWN'
} as const;

/**
 * Type for service status values.
 */
export type ServiceStatusType = typeof ServiceStatus[keyof typeof ServiceStatus];

// ═══════════════════════════════════════════════════════════════════════════════
// Status Categories
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lifecycle status values.
 */
export const LIFECYCLE_STATUSES: readonly ServiceStatusType[] = [
    ServiceStatus.IDLE,
    ServiceStatus.INITIALIZING,
    ServiceStatus.STARTING,
    ServiceStatus.RUNNING,
    ServiceStatus.STOPPING,
    ServiceStatus.STOPPED,
    ServiceStatus.SHUTTING_DOWN,
    ServiceStatus.RESTARTING
];

/**
 * Health status values (can occur alongside lifecycle).
 */
export const HEALTH_STATUSES: readonly ServiceStatusType[] = [
    ServiceStatus.HEALTHY,
    ServiceStatus.DEGRADED,
    ServiceStatus.WARNING,
    ServiceStatus.ERROR,
    ServiceStatus.CRITICAL,
    ServiceStatus.RECOVERING
];

/**
 * Operational status values.
 */
export const OPERATIONAL_STATUSES: readonly ServiceStatusType[] = [
    ServiceStatus.PAUSED,
    ServiceStatus.SUSPENDED,
    ServiceStatus.MAINTENANCE
];

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Checks if status indicates service is active (processing requests).
 *
 * @param status - Status to check.
 * @returns True if service is active.
 */
export function isActiveStatus(status: ServiceStatusType): boolean {
    return status === ServiceStatus.RUNNING || status === ServiceStatus.HEALTHY;
}

/**
 * Checks if status indicates service is in a transitional state.
 *
 * @param status - Status to check.
 * @returns True if service is transitioning.
 */
export function isTransitionalStatus(status: ServiceStatusType): boolean {
    return status === ServiceStatus.INITIALIZING ||
        status === ServiceStatus.STARTING ||
        status === ServiceStatus.STOPPING ||
        status === ServiceStatus.SHUTTING_DOWN ||
        status === ServiceStatus.RESTARTING ||
        status === ServiceStatus.RECOVERING;
}

/**
 * Checks if status indicates an error condition.
 *
 * @param status - Status to check.
 * @returns True if status indicates error.
 */
export function isErrorStatus(status: ServiceStatusType): boolean {
    return status === ServiceStatus.ERROR ||
        status === ServiceStatus.CRITICAL;
}

/**
 * Checks if status requires attention.
 *
 * @param status - Status to check.
 * @returns True if status requires attention.
 */
export function requiresAttention(status: ServiceStatusType): boolean {
    return status === ServiceStatus.WARNING ||
        status === ServiceStatus.ERROR ||
        status === ServiceStatus.CRITICAL ||
        status === ServiceStatus.DEGRADED;
}

/**
 * Gets severity level for status (for sorting/prioritization).
 *
 * @param status - Status to check.
 * @returns Severity level (0 = highest/worst).
 */
export function getStatusSeverity(status: ServiceStatusType): number {
    const severities: Record<string, number> = {
        [ServiceStatus.CRITICAL]: 0,
        [ServiceStatus.ERROR]: 1,
        [ServiceStatus.WARNING]: 2,
        [ServiceStatus.DEGRADED]: 3,
        [ServiceStatus.RECOVERING]: 4,
        [ServiceStatus.MAINTENANCE]: 5,
        [ServiceStatus.SHUTTING_DOWN]: 6,
        [ServiceStatus.STOPPING]: 7,
        [ServiceStatus.RESTARTING]: 8,
        [ServiceStatus.STARTING]: 9,
        [ServiceStatus.INITIALIZING]: 10,
        [ServiceStatus.PAUSED]: 11,
        [ServiceStatus.SUSPENDED]: 12,
        [ServiceStatus.RUNNING]: 13,
        [ServiceStatus.HEALTHY]: 14,
        [ServiceStatus.STOPPED]: 15,
        [ServiceStatus.IDLE]: 16,
        [ServiceStatus.UNKNOWN]: 99
    };
    return severities[status] ?? 99;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Extension Utilities
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates an extended status object with additional custom statuses.
 *
 * @param customStatuses - Additional status values to add.
 * @returns Extended status object.
 *
 * @example
 * ```typescript
 * const ExtendedStatus = extendServiceStatus({
 *     RECONNECTING: 'RECONNECTING',
 *     RATE_LIMITED: 'RATE_LIMITED'
 * });
 *
 * // Type includes both base and custom statuses
 * const status: ExtendedStatusType = ExtendedStatus.RECONNECTING;
 * ```
 */
export function extendServiceStatus<T extends Record<string, string>>(
    customStatuses: T
): typeof ServiceStatus & T {
    return { ...ServiceStatus, ...customStatuses };
}
