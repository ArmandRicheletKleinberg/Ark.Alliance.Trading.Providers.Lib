/**
 * @fileoverview Services Barrel Export
 * @module Services
 *
 * Centralized exports for provider-agnostic service interfaces and factories.
 */

// Trading Service
export {
    PlaceOrderParams,
    CancelOrderParams,
    CancelAllOrdersParams,
    ClosePositionParams,
    ITradingService
} from './ITradingService';

// Market Data Service
export {
    QuoteCallback,
    TickerCallback,
    OrderBookCallback,
    TradeCallback,
    SubscriptionHandle,
    IMarketDataService
} from './IMarketDataService';

// Factories
export {
    ProviderConfig,
    BinanceConfig,
    DeribitConfig,
    ProviderConfigUnion,
    TradingServiceFactory,
    MarketDataServiceFactory
} from './ProviderServiceFactory';

// Re-export BaseService and related types from Common/services
// This is the canonical service base - use this instead of creating duplicates
export {
    BaseService,
    ServiceState,
    ServiceConfig,
    ServiceStatus,
    ServiceStats
} from '../Common/services';
