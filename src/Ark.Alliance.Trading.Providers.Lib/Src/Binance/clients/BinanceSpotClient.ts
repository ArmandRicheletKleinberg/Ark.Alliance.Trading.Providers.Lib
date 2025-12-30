/**
 * @fileoverview Binance Spot API Client for Universal Transfer
 * @module clients/BinanceSpotClient
 * 
 * Uses api.binance.com (SAPI) for Universal Transfer operations.
 * Universal Transfer is NOT available on Testnet.
 */

import * as https from 'https';
import { HmacSignatureGenerator } from '../helpers/security/HmacSignatureGenerator';
import { BinanceEnvironment } from '../enums';
import { Result, ResultStatus } from '../../Common/result';
import {
    createBinanceSuccessResult,
    createBinanceErrorResult,
    createBinanceNetworkErrorResult,
    createBinanceParseErrorResult
} from '../shared/utils/BinanceResultMapper';
import { ServerTimeSync } from '../utils/ServerTimeSync';
import {
    UniversalTransferRequest,
    UniversalTransferResponse,
    TransferHistoryQuery,
    TransferHistoryResponse
} from '../dtos/binance/TransferTypes';

/**
 * Binance Spot API Client for Universal Transfer
 * 
 * Note: Uses api.binance.com (NOT fapi.binance.com)
 * Universal Transfer endpoint: POST /sapi/v1/asset/transfer
 */
export class BinanceSpotClient {
    private readonly baseUrl: string = 'api.binance.com';
    private apiKey: string;
    private signatureGenerator: HmacSignatureGenerator;
    private environment: BinanceEnvironment;

    constructor(apiKey: string, apiSecret: string, environment: BinanceEnvironment) {
        this.apiKey = apiKey;
        this.signatureGenerator = new HmacSignatureGenerator(apiSecret);
        this.environment = environment;
    }

    /**
     * Check if Universal Transfer is available (mainnet only)
     */
    isTransferAvailable(): boolean {
        return this.environment === 'MAINNET';
    }

    /**
     * Universal Transfer - Move assets between accounts
     * 
     * @param request Transfer parameters
     * @returns Transaction ID on success
     * 
     * @example
     * // Transfer 10 USDT from Futures to Spot
     * await spotClient.universalTransfer({
     *     type: 'UMFUTURE_MAIN',
     *     asset: 'USDT',
     *     amount: 10
     * });
     */
    async universalTransfer(
        request: UniversalTransferRequest
    ): Promise<Result<UniversalTransferResponse>> {
        if (!this.isTransferAvailable()) {
            return Result.fail<UniversalTransferResponse>({
                code: 'TESTNET_NOT_SUPPORTED',
                message: 'Universal Transfer is not available on Testnet',
                details: { environment: this.environment },
                timestamp: Date.now()
            }, ResultStatus.BAD_PREREQUISITES);
        }

        return this.signedPost<UniversalTransferResponse>('/sapi/v1/asset/transfer', {
            type: request.type,
            asset: request.asset,
            amount: request.amount.toString()
        });
    }

    /**
     * Get Universal Transfer history
     * 
     * @param query Query parameters
     * @returns Transfer records
     */
    async getTransferHistory(
        query: TransferHistoryQuery
    ): Promise<Result<TransferHistoryResponse>> {
        if (!this.isTransferAvailable()) {
            return Result.fail<TransferHistoryResponse>({
                code: 'TESTNET_NOT_SUPPORTED',
                message: 'Universal Transfer history is not available on Testnet',
                details: { environment: this.environment },
                timestamp: Date.now()
            }, ResultStatus.BAD_PREREQUISITES);
        }

        const params: Record<string, any> = {
            type: query.type
        };

        if (query.startTime) params.startTime = query.startTime;
        if (query.endTime) params.endTime = query.endTime;
        if (query.current) params.current = query.current;
        if (query.size) params.size = query.size;

        return this.signedGet<TransferHistoryResponse>('/sapi/v1/asset/transfer', params);
    }

    /**
     * Make signed GET request
     */
    private async signedGet<T>(endpoint: string, params: Record<string, any> = {}): Promise<Result<T>> {
        const timestamp = ServerTimeSync.getTimestamp();
        const queryParams: Record<string, any> = { ...params, timestamp };
        const signedParams: any = this.signatureGenerator.signParams(queryParams);

        const queryString = Object.keys(signedParams)
            .map(key => `${key}=${encodeURIComponent(signedParams[key])}`)
            .join('&');

        return this.makeRequest<T>('GET', `${endpoint}?${queryString}`);
    }

    /**
     * Make signed POST request
     */
    private async signedPost<T>(endpoint: string, params: Record<string, any> = {}): Promise<Result<T>> {
        const timestamp = ServerTimeSync.getTimestamp();
        const queryParams: Record<string, any> = { ...params, timestamp };
        const signedParams: any = this.signatureGenerator.signParams(queryParams);

        const queryString = Object.keys(signedParams)
            .map(key => `${key}=${encodeURIComponent(signedParams[key])}`)
            .join('&');

        return this.makeRequest<T>('POST', `${endpoint}?${queryString}`);
    }

    /**
     * Make HTTP request to Binance SAPI
     */
    private makeRequest<T>(method: string, path: string): Promise<Result<T>> {
        const endpoint = path.split('?')[0];

        return new Promise((resolve) => {
            const options = {
                hostname: this.baseUrl,
                path: path,
                method: method,
                headers: {
                    'X-MBX-APIKEY': this.apiKey,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);

                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(createBinanceSuccessResult<T>(parsed as T));
                        } else {
                            resolve(createBinanceErrorResult<T>(
                                parsed.code,
                                parsed.msg || 'Request failed',
                                {
                                    endpoint,
                                    httpStatus: res.statusCode,
                                    method,
                                    rawResponse: parsed
                                }
                            ));
                        }
                    } catch (err) {
                        resolve(createBinanceParseErrorResult<T>(
                            data,
                            err as Error,
                            endpoint
                        ));
                    }
                });
            });

            req.on('error', (error) => {
                resolve(createBinanceNetworkErrorResult<T>(error, endpoint));
            });

            req.end();
        });
    }
}
