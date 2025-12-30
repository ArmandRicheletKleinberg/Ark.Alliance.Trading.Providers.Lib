/**
 * @fileoverview Server Time Response Model
 * @module models/marketData/ServerTime
 *
 * Response model for GET /fapi/v1/time endpoint.
 */

/**
 * Server time response from Binance API.
 *
 * @see https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Check-Server-Time
 */
export interface ServerTimeResponse {
    /**
     * Binance server time in Unix milliseconds.
     */
    serverTime: number;
}
