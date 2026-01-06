/**
 * @fileoverview Kraken Futures Provider Main Export
 * @module Kraken
 *
 * Centralized exports for the Kraken Futures trading provider.
 * This module provides a complete implementation for interacting with
 * Kraken Futures API, including trading and market data services.
 * 
 * @example
 * ```typescript
 * import { Kraken } from './Kraken';
 * 
 * // Create trading service
 * const tradingService = new Kraken.KrakenTradingService({
 *     apiKey: 'your-key',
 *     apiSecret: 'your-secret',
 *     environment: Kraken.KrakenEnvironment.TESTNET
 * });
 * 
 * // Create market data service
 * const marketDataService = new Kraken.KrakenMarketDataService({
 *     environment: Kraken.KrakenEnvironment.MAINNET
 * });
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════════════════════════

export {
    // Environment
    KrakenEnvironment,
    isMainnet,
    isTestnet,
    getRestBaseUrl,
    getWsUrl,
    type KrakenEnvironmentType,

    // Order Side
    KrakenOrderSide,
    getOppositeSide,
    type KrakenOrderSideType,

    // Order Type
    KrakenOrderType,
    requiresPrice,
    requiresStopPrice,
    isStopOrder,
    type KrakenOrderTypeType,

    // Order Status
    KrakenOrderStatus,
    isTerminalState,
    isActiveState,
    hasBeenFilled,
    type KrakenOrderStatusType,

    // Time In Force
    KrakenTimeInForce,
    requiresImmediateExecution,
    isPostOnly,
    type KrakenTimeInForceType
} from './enums';

// ═══════════════════════════════════════════════════════════════════════════════
// Shared (Constants, Errors, Security)
// ═══════════════════════════════════════════════════════════════════════════════

export {
    // Constants
    MAINNET_REST_URL,
    TESTNET_REST_URL,
    MAINNET_WS_URL,
    TESTNET_WS_URL,
    API_PATH_PREFIX,
    WS_PING_INTERVAL_MS,
    DEFAULT_TIMEOUT_MS,
    ENDPOINTS,
    WS_FEEDS,
    WS_EVENTS,
    PERPETUALS,
    type KrakenPerpetual,

    // Errors
    ERROR_CODES,
    KrakenError,
    KrakenAuthError,
    KrakenConnectionError,
    KrakenRateLimitError,
    KrakenOrderError,
    KrakenInsufficientFundsError,
    createErrorFromCode,
    isRetryableError,

    // Security
    KrakenSignatureGenerator,
    generateWsAuthSignature,
    generateNonce
} from './shared';

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export {
    // Trading DTOs
    type SendOrderRequest,
    type EditOrderRequest,
    type CancelOrderRequest,
    type BatchOrderRequest,
    type SendOrderResponse,
    type OrderEvent,
    type KrakenOrder,
    type CancelOrderResponse,
    type OpenOrdersResponse,
    type OrderStatusResponse,

    // Account DTOs
    type AccountsResponse,
    type AccountInfo,
    type CashAccount,
    type CashBalance,
    type FlexAccount,
    type FlexCurrencyBalance,
    type MultiCollateralAccount,
    type MultiCollateralBalance,
    type MarginRequirements,
    type TriggerEstimates,
    type OpenPositionsResponse,
    type KrakenPosition,

    // Market Data DTOs
    type InstrumentsResponse,
    type KrakenInstrument,
    type MarginLevel,
    type TickersResponse,
    type KrakenTicker,
    type OrderBookResponse,
    type KrakenOrderBook,
    type TradeHistoryResponse,
    type KrakenTrade,

    // WebSocket DTOs
    type WsMessage,
    type WsSubscriptionRequest,
    type WsSubscriptionResponse,
    type WsChallengeResponse,
    type WsAuthRequest,
    type WsTickerMessage,
    type WsBookSnapshotMessage,
    type WsBookDeltaMessage,
    type WsTradeMessage,
    type WsFillMessage,
    type WsOpenOrderMessage,
    type WsOpenPositionMessage,
    type WsHeartbeatMessage,
    type WsInfoMessage
} from './dtos';

// ═══════════════════════════════════════════════════════════════════════════════
// Clients
// ═══════════════════════════════════════════════════════════════════════════════

export {
    KrakenRestClient,
    type KrakenRestClientConfig,
    KrakenWebSocketClient,
    type KrakenWebSocketClientConfig,
    type KrakenWebSocketEvents
} from './clients';

// ═══════════════════════════════════════════════════════════════════════════════
// Mappers
// ═══════════════════════════════════════════════════════════════════════════════

export {
    // Order Mapping
    mapKrakenSideToOrderSide,
    mapOrderSideToKraken,
    mapKrakenTypeToOrderType,
    mapOrderTypeToKraken,
    mapKrakenStatusToOrderStatus,
    mapTimeInForceToKraken,
    mapKrakenOrderToIOrder,
    mapKrakenOrdersToIOrders,

    // Position Mapping
    mapKrakenSideToDirection,
    getDirectionFromSize,
    isFlat,
    getAbsoluteSize,
    calculateUnrealizedPnlPercent,
    mapKrakenPositionToIPosition,
    mapKrakenPositionsToIPositions,
    mapWsPositionToIPosition
} from './mappers';

// ═══════════════════════════════════════════════════════════════════════════════
// Services
// ═══════════════════════════════════════════════════════════════════════════════

export {
    KrakenTradingService,
    type KrakenTradingServiceConfig,
    KrakenMarketDataService,
    type KrakenMarketDataServiceConfig
} from './services';
