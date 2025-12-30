/**
 * @fileoverview Clients Barrel Export
 * @module clients
 */

// Base Classes
export { BaseRestClient } from './Base/_BaseRestClient';
export { BaseWebSocketClient } from './Base/_BaseWebSocketClient';
export type { RestClientConfig } from './Base/types/RestClientConfig';
export type { RestClientStats } from './Base/types/RestClientStats';
export type { WebSocketClientConfig } from './Base/types/WebSocketClientConfig';
export type { WebSocketStats } from './Base/types/WebSocketStats';
export type {
    SignedRestClientConfig,
    MarketDataRestConfig,
    MarketDataWsConfig,
    UserDataStreamConfig
} from './Base/types/ClientConfig';

// REST Clients
export { BinanceRestClient } from './BinanceRestClient';
export { BinanceMarketDataRest } from './BinanceMarketDataRest';
export { BinanceSpotClient } from './BinanceSpotClient';

// WebSocket Clients
export { BinanceApiWsClient } from './BinanceApiWsClient';
export { BinanceUserDataStream } from './BinanceUserDataStream';
export { BinanceMarketDataWs } from './BinanceMarketDataWs';
