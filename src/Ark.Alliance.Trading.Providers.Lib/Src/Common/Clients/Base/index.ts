/**
 * @fileoverview Common Clients Base Barrel Export
 * @module Common/Clients/Base
 *
 * Centralized exports for provider-agnostic client interfaces and base classes.
 */

export {
    ProviderType,
    ProviderEnvironment,
    ClientStats,
    ConnectionState,
    IProviderClient,
    ISubscribableClient
} from './IProviderClient';

export {
    AuthCredentials,
    AuthenticatableRequest,
    AuthenticatedRequest,
    IAuthStrategy
} from './IAuthStrategy';

export {
    BaseJsonRpcClient,
    JsonRpcClientConfig
} from './BaseJsonRpcClient';

export * from './types';
