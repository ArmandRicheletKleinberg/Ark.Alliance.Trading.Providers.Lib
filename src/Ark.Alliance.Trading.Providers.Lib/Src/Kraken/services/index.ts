/**
 * @fileoverview Kraken Services Barrel Export
 * @module Kraken/services
 *
 * Centralized exports for all Kraken services.
 */

// Trading Service
export {
    KrakenTradingService,
    type KrakenTradingServiceConfig
} from './KrakenTradingService';

// Market Data Service
export {
    KrakenMarketDataService,
    type KrakenMarketDataServiceConfig
} from './KrakenMarketDataService';
