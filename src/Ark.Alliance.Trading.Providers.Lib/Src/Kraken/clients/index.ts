/**
 * @fileoverview Kraken Clients Barrel Export
 * @module Kraken/clients
 *
 * Centralized exports for all Kraken API clients.
 */

// REST Client
export {
    KrakenRestClient,
    type KrakenRestClientConfig
} from './KrakenRestClient';

// WebSocket Client
export {
    KrakenWebSocketClient,
    type KrakenWebSocketClientConfig,
    type KrakenWebSocketEvents
} from './KrakenWebSocketClient';
