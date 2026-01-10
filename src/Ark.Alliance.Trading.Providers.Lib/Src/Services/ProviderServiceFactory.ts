/**
 * @fileoverview Provider Service Factory
 * @module Services/ProviderServiceFactory
 *
 * Factory for creating provider-specific service instances.
 */

import { ProviderType, ProviderEnvironment } from '../Common/Clients/Base';
import { ITradingService } from './ITradingService';
import { IMarketDataService } from './IMarketDataService';
import { IAccountService } from './IAccountService';
import { BinanceTradingService } from '../Binance/services/BinanceTradingService';
import { BinanceMarketDataService } from '../Binance/services/BinanceMarketDataService';
import { BinanceAccountService } from '../Binance/services/BinanceAccountService';
import { DeribitTradingService } from '../Deribit/services/DeribitTradingService';
import { DeribitMarketDataService } from '../Deribit/services/DeribitMarketDataService';
import { DeribitAccountService } from '../Deribit/services/DeribitAccountService';
import { DeribitEnvironment } from '../Deribit/enums';
import { BinanceEnvironment } from '../Binance/enums';

/**
 * Provider configuration.
 */
export interface ProviderConfig {
    /**
     * Provider type.
     */
    provider: ProviderType;

    /**
     * Environment configuration.
     */
    environment: ProviderEnvironment;

    /**
     * API credentials.
     */
    credentials: {
        /**
         * API key (client_id for Deribit).
         */
        apiKey: string;

        /**
         * API secret (client_secret for Deribit).
         */
        apiSecret: string;
    };

    /**
     * Optional connection settings.
     */
    options?: {
        /**
         * Auto-reconnect on disconnect.
         */
        autoReconnect?: boolean;

        /**
         * Request timeout in milliseconds.
         */
        timeoutMs?: number;

        /**
         * Enable debug logging.
         */
        debug?: boolean;
    };
}

/**
 * Binance-specific configuration.
 */
export interface BinanceConfig extends ProviderConfig {
    provider: ProviderType.BINANCE;

    /**
     * Binance-specific options.
     */
    binanceOptions?: {
        /**
         * Receive window for timestamp validation.
         */
        recvWindow?: number;

        /**
         * Hedge mode enabled.
         */
        hedgeMode?: boolean;
    };
}

/**
 * Deribit-specific configuration.
 */
export interface DeribitConfig extends ProviderConfig {
    provider: ProviderType.DERIBIT;

    /**
     * Deribit-specific options.
     */
    deribitOptions?: {
        /**
         * OAuth scopes to request.
         */
        scopes?: string[];

        /**
         * Enable cancel-on-disconnect.
         */
        cancelOnDisconnect?: boolean;

        /**
         * Default currency for account operations.
         */
        defaultCurrency?: 'BTC' | 'ETH' | 'SOL' | 'USDC';
    };
}

/**
 * Union type for provider configurations.
 */
export type ProviderConfigUnion = BinanceConfig | DeribitConfig;

/**
 * Factory for creating trading services.
 *
 * @remarks
 * This factory creates provider-specific implementations while
 * returning the common interface, enabling provider-agnostic code.
 *
 * @example
 * ```typescript
 * const config: BinanceConfig = {
 *     provider: ProviderType.BINANCE,
 *     environment: { isTestnet: true, restBaseUrl: '...', wsBaseUrl: '...' },
 *     credentials: { apiKey: '...', apiSecret: '...' }
 * };
 *
 * const tradingService = TradingServiceFactory.create(config);
 * const marketDataService = MarketDataServiceFactory.create(config);
 * ```
 */
export class TradingServiceFactory {
    /**
     * Create a trading service for the specified provider.
     *
     * @param config - Provider configuration.
     * @returns Provider-specific trading service implementation.
     * @throws Error if provider is not supported.
     */
    static create(config: ProviderConfigUnion): ITradingService {
        switch (config.provider) {
            case ProviderType.BINANCE: {
                const binanceConfig = config as BinanceConfig;
                return new BinanceTradingService({
                    apiKey: binanceConfig.credentials.apiKey,
                    apiSecret: binanceConfig.credentials.apiSecret,
                    restBaseUrl: binanceConfig.environment.restBaseUrl,
                    wsStreamUrl: binanceConfig.environment.wsBaseUrl,
                    autoReconnect: binanceConfig.options?.autoReconnect,
                    debug: binanceConfig.options?.debug
                });
            }

            case ProviderType.DERIBIT: {
                const deribitConfig = config as DeribitConfig;
                return new DeribitTradingService({
                    apiKey: deribitConfig.credentials.apiKey,
                    apiSecret: deribitConfig.credentials.apiSecret,
                    environment: deribitConfig.environment.isTestnet
                        ? DeribitEnvironment.TESTNET
                        : DeribitEnvironment.MAINNET,
                    defaultCurrency: deribitConfig.deribitOptions?.defaultCurrency,
                    debug: deribitConfig.options?.debug
                });
            }

            default:
                throw new Error(`Unknown provider: ${(config as ProviderConfig).provider}`);
        }
    }
}

/**
 * Factory for creating market data services.
 */
export class MarketDataServiceFactory {
    /**
     * Create a market data service for the specified provider.
     *
     * @param config - Provider configuration.
     * @returns Provider-specific market data service implementation.
     * @throws Error if provider is not supported.
     */
    static create(config: ProviderConfigUnion): IMarketDataService {
        switch (config.provider) {
            case ProviderType.BINANCE: {
                const binanceConfig = config as BinanceConfig;
                return new BinanceMarketDataService({
                    restBaseUrl: binanceConfig.environment.restBaseUrl,
                    wsStreamUrl: binanceConfig.environment.wsBaseUrl,
                    environment: binanceConfig.environment.isTestnet
                        ? BinanceEnvironment.TESTNET
                        : BinanceEnvironment.MAINNET,
                    debug: binanceConfig.options?.debug
                });
            }

            case ProviderType.DERIBIT: {
                const deribitConfig = config as DeribitConfig;
                return new DeribitMarketDataService({
                    environment: deribitConfig.environment.isTestnet
                        ? DeribitEnvironment.TESTNET
                        : DeribitEnvironment.MAINNET,
                    debug: deribitConfig.options?.debug
                });
            }

            default:
                throw new Error(`Unknown provider: ${(config as ProviderConfig).provider}`);
        }
    }
}

/**
 * Factory for creating account services.
 */
export class AccountServiceFactory {
    /**
     * Create an account service for the specified provider.
     *
     * @param config - Provider configuration.
     * @returns Provider-specific account service implementation.
     * @throws Error if provider is not supported.
     */
    static create(config: ProviderConfigUnion): IAccountService {
        switch (config.provider) {
            case ProviderType.BINANCE: {
                const binanceConfig = config as BinanceConfig;
                return new BinanceAccountService({
                    apiKey: binanceConfig.credentials.apiKey,
                    apiSecret: binanceConfig.credentials.apiSecret,
                    environment: binanceConfig.environment.isTestnet
                        ? BinanceEnvironment.TESTNET
                        : BinanceEnvironment.MAINNET,
                    debug: binanceConfig.options?.debug
                });
            }

            case ProviderType.DERIBIT: {
                const deribitConfig = config as DeribitConfig;
                return new DeribitAccountService({
                    clientId: deribitConfig.credentials.apiKey,
                    clientSecret: deribitConfig.credentials.apiSecret,
                    environment: deribitConfig.environment.isTestnet
                        ? DeribitEnvironment.TESTNET
                        : DeribitEnvironment.MAINNET,
                    debug: deribitConfig.options?.debug,
                    scopes: deribitConfig.deribitOptions?.scopes
                });
            }

            default:
                throw new Error(`Unknown provider: ${(config as ProviderConfig).provider}`);
        }
    }
}

