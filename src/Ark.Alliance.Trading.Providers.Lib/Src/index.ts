/**
 * @fileoverview Trading Providers Library - Main Entry Point
 * @module Ark.Alliance.Trading.Providers.Lib
 *
 * Multi-provider trading library supporting Binance and Deribit exchanges.
 * Provides provider-agnostic interfaces and abstractions for trading operations.
 *
 * @example
 * ```typescript
 * import {
 *     ProviderType,
 *     TradingServiceFactory,
 *     MarketDataServiceFactory,
 *     OrderSide,
 *     OrderType
 * } from 'ark-alliance-trading-providers';
 *
 * // Create services
 * const config = { provider: ProviderType.BINANCE, ... };
 * const tradingService = TradingServiceFactory.create(config);
 * const marketDataService = MarketDataServiceFactory.create(config);
 *
 * // Use provider-agnostic APIs
 * await tradingService.connect();
 * const order = await tradingService.placeOrder({
 *     instrument: 'BTCUSDT',
 *     side: OrderSide.BUY,
 *     type: OrderType.LIMIT,
 *     quantity: '0.01',
 *     price: '50000'
 * });
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Common (Provider-Agnostic)
// ═══════════════════════════════════════════════════════════════════════════════

export * from './Common';

// ═══════════════════════════════════════════════════════════════════════════════
// Common Domain Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

export * from './Common/Domain';

// ═══════════════════════════════════════════════════════════════════════════════
// Common Client Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

export * from './Common/Clients';

// ═══════════════════════════════════════════════════════════════════════════════
// Provider-Agnostic Services
// ═══════════════════════════════════════════════════════════════════════════════

export * from './Services';

// ═══════════════════════════════════════════════════════════════════════════════
// Binance Provider
// ═══════════════════════════════════════════════════════════════════════════════

export * as Binance from './Binance';

// ═══════════════════════════════════════════════════════════════════════════════
// Deribit Provider
// ═══════════════════════════════════════════════════════════════════════════════

export * as Deribit from './Deribit';
