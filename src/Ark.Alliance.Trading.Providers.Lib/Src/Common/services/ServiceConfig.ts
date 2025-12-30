/**
 * @fileoverview Base Service Configuration
 * @module Common/services/ServiceConfig
 *
 * Configuration interface for BaseService instances.
 */

/**
 * Configuration options for BaseService.
 */
export interface ServiceConfig {
    /** Unique identifier for this service instance. */
    instanceKey: string;

    /** Enable Socket.IO streaming to clients. Default: false. */
    enableStreaming?: boolean;

    /** Socket.IO namespace for this service. Default: '/'. */
    streamingNamespace?: string;

    /** Timeout for async lock operations in ms. Default: 30000. */
    lockTimeoutMs?: number;

    /** Enable automatic error recovery. Default: true. */
    autoRecover?: boolean;

    /** Maximum recovery attempts. Default: 3. */
    maxRecoveryAttempts?: number;

    /** Delay between recovery attempts in ms. Default: 5000. */
    recoveryDelayMs?: number;
}

/**
 * Default service configuration values.
 */
export const DEFAULT_SERVICE_CONFIG: Required<ServiceConfig> = {
    instanceKey: 'default',
    enableStreaming: false,
    streamingNamespace: '/',
    lockTimeoutMs: 30000,
    autoRecover: true,
    maxRecoveryAttempts: 3,
    recoveryDelayMs: 5000
};

/**
 * Merges user config with defaults.
 */
export function mergeServiceConfig(config: ServiceConfig): Required<ServiceConfig> {
    return { ...DEFAULT_SERVICE_CONFIG, ...config };
}
