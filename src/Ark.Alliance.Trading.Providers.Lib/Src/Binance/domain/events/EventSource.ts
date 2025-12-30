/**
 * @fileoverview Event Source Enumeration
 * @module domain/events/EventSource
 *
 * Defines all event sources in the Binance provider library.
 * Used to identify which component generated a particular event.
 */

/**
 * Enumeration of all event sources in the Binance provider.
 *
 * @remarks
 * Sources are organized by layer:
 * - Infrastructure: API clients and external integrations
 * - Application: Services and handlers
 * - Domain: Core business logic
 */
export enum EventSource {
    // ═══════════════════════════════════════════════════════════════════════════
    // Infrastructure Layer - API Clients
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Binance REST API client.
     */
    BINANCE_REST_CLIENT = 'BinanceRestClient',

    /**
     * Binance WebSocket API client for orders.
     */
    BINANCE_WS_API_CLIENT = 'BinanceApiWsClient',

    /**
     * Binance market data WebSocket stream.
     */
    BINANCE_MARKET_DATA_WS = 'BinanceMarketDataWs',

    /**
     * Binance user data stream.
     */
    BINANCE_USER_DATA_STREAM = 'BinanceUserDataStream',

    /**
     * Binance Spot API client.
     */
    BINANCE_SPOT_CLIENT = 'BinanceSpotClient',

    // ═══════════════════════════════════════════════════════════════════════════
    // Application Layer - Services
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Position service instance.
     */
    POSITION_SERVICE = 'PositionService',

    /**
     * Order cache service.
     */
    ORDER_CACHE = 'OrderCache',

    /**
     * Account cache service.
     */
    ACCOUNT_CACHE = 'AccountCache',

    /**
     * Market data service.
     */
    MARKET_DATA_SERVICE = 'MarketDataService',

    // ═══════════════════════════════════════════════════════════════════════════
    // Domain Layer - Strategy Components
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Click strategy engine.
     */
    STRATEGY_ENGINE = 'StrategyEngine',

    /**
     * Strategy lifecycle manager.
     */
    STRATEGY_LIFECYCLE = 'StrategyLifecycle',

    /**
     * Order manager component.
     */
    ORDER_MANAGER = 'OrderManager'
}
