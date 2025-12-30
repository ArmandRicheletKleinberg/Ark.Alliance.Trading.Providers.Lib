/**
 * @fileoverview JSON-RPC Types
 * @module Common/Clients/Base/types/JsonRpcTypes
 *
 * Type definitions for JSON-RPC 2.0 protocol.
 */

/**
 * JSON-RPC version string.
 */
export const JSONRPC_VERSION = '2.0' as const;

/**
 * JSON-RPC request structure.
 */
export interface JsonRpcRequest<TParams = Record<string, unknown>> {
    readonly jsonrpc: typeof JSONRPC_VERSION;
    readonly id: string | number;
    readonly method: string;
    readonly params?: TParams;
}

/**
 * JSON-RPC success response structure.
 */
export interface JsonRpcSuccessResponse<TResult = unknown> {
    readonly jsonrpc: typeof JSONRPC_VERSION;
    readonly id: string | number;
    readonly result: TResult;
    /** Deribit-specific: microseconds when request was received */
    readonly usIn?: number;
    /** Deribit-specific: microseconds when response was sent */
    readonly usOut?: number;
    /** Deribit-specific: processing time in microseconds */
    readonly usDiff?: number;
    /** Deribit-specific: whether this is testnet */
    readonly testnet?: boolean;
}

/**
 * JSON-RPC error object.
 */
export interface JsonRpcError {
    readonly code: number;
    readonly message: string;
    readonly data?: unknown;
}

/**
 * JSON-RPC error response structure.
 */
export interface JsonRpcErrorResponse {
    readonly jsonrpc: typeof JSONRPC_VERSION;
    readonly id: string | number | null;
    readonly error: JsonRpcError;
    readonly testnet?: boolean;
    readonly usIn?: number;
    readonly usOut?: number;
    readonly usDiff?: number;
}

/**
 * JSON-RPC notification (subscription update).
 */
export interface JsonRpcNotification<TData = unknown> {
    readonly jsonrpc: typeof JSONRPC_VERSION;
    readonly method: 'subscription';
    readonly params: {
        readonly channel: string;
        readonly data: TData;
    };
}

/**
 * Union type for any JSON-RPC response.
 */
export type JsonRpcResponse<TResult = unknown> =
    | JsonRpcSuccessResponse<TResult>
    | JsonRpcErrorResponse;

/**
 * Union type for any incoming JSON-RPC message.
 */
export type JsonRpcIncoming<TResult = unknown, TData = unknown> =
    | JsonRpcResponse<TResult>
    | JsonRpcNotification<TData>;

/**
 * Pending request tracking.
 */
export interface PendingRequest<T = unknown> {
    readonly id: string;
    readonly method: string;
    readonly timestamp: number;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    timeoutId?: NodeJS.Timeout;
}

/**
 * Type guard to check if response is success.
 */
export function isSuccessResponse<T>(
    response: JsonRpcResponse<T>
): response is JsonRpcSuccessResponse<T> {
    return 'result' in response;
}

/**
 * Type guard to check if response is error.
 */
export function isErrorResponse(
    response: JsonRpcResponse<unknown>
): response is JsonRpcErrorResponse {
    return 'error' in response;
}

/**
 * Type guard to check if message is notification.
 */
export function isNotification<T>(
    message: JsonRpcIncoming<unknown, T>
): message is JsonRpcNotification<T> {
    return 'method' in message && message.method === 'subscription';
}

/**
 * Create a JSON-RPC request object.
 */
export function createRequest<TParams = Record<string, unknown>>(
    id: string | number,
    method: string,
    params?: TParams
): JsonRpcRequest<TParams> {
    const request: JsonRpcRequest<TParams> = {
        jsonrpc: JSONRPC_VERSION,
        id,
        method
    };

    if (params !== undefined) {
        return { ...request, params };
    }

    return request;
}
