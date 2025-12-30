/**
 * @fileoverview Universal Transfer Types for Binance SAPI
 * @module models/binance/TransferTypes
 * 
 * Types for POST /sapi/v1/asset/transfer (Universal Transfer)
 * Note: Universal Transfer is NOT available on Testnet
 */

/**
 * Universal Transfer types supported by Binance
 * https://binance-docs.github.io/apidocs/spot/en/#universal-transfer
 */
export type UniversalTransferType =
    | 'MAIN_UMFUTURE'     // Spot → USD-M Futures
    | 'UMFUTURE_MAIN';    // USD-M Futures → Spot

/**
 * Universal Transfer request parameters
 */
export interface UniversalTransferRequest {
    /** Transfer type (direction) */
    type: UniversalTransferType;

    /** Asset to transfer (e.g., 'USDT', 'BTC') */
    asset: string;

    /** Amount to transfer */
    amount: number;
}

/**
 * Universal Transfer response
 */
export interface UniversalTransferResponse {
    /** Transaction ID */
    tranId: number;
}

/**
 * Transfer history record
 */
export interface TransferRecord {
    /** Asset transferred */
    asset: string;

    /** Amount transferred */
    amount: string;

    /** Transfer type */
    type: UniversalTransferType;

    /** Status: CONFIRMED, FAILED, PENDING */
    status: 'CONFIRMED' | 'FAILED' | 'PENDING';

    /** Transaction ID */
    tranId: number;

    /** Timestamp (ms) */
    timestamp: number;
}

/**
 * Transfer history query parameters
 */
export interface TransferHistoryQuery {
    /** Transfer type */
    type: UniversalTransferType;

    /** Start time (ms) */
    startTime?: number;

    /** End time (ms) */
    endTime?: number;

    /** Current page (default 1) */
    current?: number;

    /** Page size (default 10, max 100) */
    size?: number;
}

/**
 * Transfer history response
 */
export interface TransferHistoryResponse {
    total: number;
    rows: TransferRecord[];
}
