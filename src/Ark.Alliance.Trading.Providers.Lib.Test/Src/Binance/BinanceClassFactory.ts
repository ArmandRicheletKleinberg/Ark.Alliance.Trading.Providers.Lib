/**
 * @fileoverview Binance Class Factory
 * @module Binance/BinanceClassFactory
 * 
 * Provides factory functions to register all Binance classes
 * with the ClassRegistry for test execution.
 */

import { ClassFactory, ProviderConfig } from '../Engine/ReflectionTestEngine';
import { join } from 'path';

// Use dynamic require with absolute path to provider library
const providerLibPath = join(__dirname, '..', '..', '..', 'Ark.Alliance.Trading.Providers.Lib', 'Src', 'Binance');

// Try to load mapper test classes (may fail if mappers not yet compiled)
let mapperTestFactories: ClassFactory[] = [];
try {
    const { getMapperTestClassFactories } = require('../Mappers/MapperTestClasses');
    mapperTestFactories = getMapperTestClassFactories();
} catch (error) {
    console.log('[BinanceClassFactory] Mapper test classes not available (this is normal if mappers are not compiled)');
}

/**
 * Returns all Binance class factories for registration.
 */
export function getBinanceClassFactories(): ClassFactory[] {
    // Dynamically load provider library
    const {
        BinanceRestClient,
        BinanceMarketDataRest,
        BinanceMarketDataWs,
        BinanceUserDataStream,
        BinanceEnvironment
    } = require(providerLibPath);

    return [
        // REST Client (Authenticated)
        {
            className: 'BinanceRestClient',
            factory: (config: ProviderConfig) => {
                const clientConfig = {
                    baseUrl: config.baseUrl,
                    timeoutMs: 30000,
                    onRateLimitUpdate: (limits: any[]) => {
                        console.log(`[RateLimit] Weight: ${limits?.[0]?.count || 'N/A'}`);
                    }
                };
                return new BinanceRestClient(config.apiKey, config.apiSecret, clientConfig);
            }
        },

        // Market Data REST (Public)
        {
            className: 'BinanceMarketDataRest',
            factory: (config: ProviderConfig) => {
                const env = config.network === 'TESTNET'
                    ? BinanceEnvironment?.TESTNET || 'TESTNET'
                    : BinanceEnvironment?.MAINNET || 'MAINNET';
                return new BinanceMarketDataRest(env, {
                    baseUrl: config.baseUrl,
                    timeoutMs: 30000
                });
            }
        },

        // Market Data WebSocket (Public)
        {
            className: 'BinanceMarketDataWs',
            factory: (config: ProviderConfig) => {
                return new BinanceMarketDataWs({
                    wsStreamUrl: config.wsUrl,
                    maxReconnectAttempts: 10,
                    reconnectDelayMs: 1000
                });
            }
        },

        // User Data Stream (Authenticated WebSocket)
        {
            className: 'BinanceUserDataStream',
            dependencies: ['BinanceRestClient'],
            factory: (config: ProviderConfig, deps?: Map<string, any>) => {
                const restClient = deps?.get('BinanceRestClient');
                if (!restClient) {
                    throw new Error('BinanceRestClient dependency required');
                }
                return new BinanceUserDataStream(restClient, {
                    wsStreamUrl: config.wsUrl,
                    restBaseUrl: config.baseUrl,
                    keepaliveIntervalMs: 30 * 60 * 1000,
                    maxReconnectAttempts: 100
                });
            }
        },

        // Mapper Test Classes (for unit testing mappers)
        ...mapperTestFactories
    ];
}

/**
 * Returns all Binance service factories for event listening.
 */
export function getBinanceServiceFactories(): any[] {
    // Import event listener service
    const { BinanceEventListenerService } = require('./Services/BinanceEventListenerService');

    return [
        {
            className: 'BinanceEventListenerService',
            factory: (config: any) => new BinanceEventListenerService({
                apiKey: config.apiKey,
                apiSecret: config.apiSecret,
                baseUrl: config.baseUrl,
                wsUrl: config.wsUrl,
                network: config.network,
                connectOnStart: true,
                disconnectOnEnd: true
            })
        }
    ];
}

/**
 * Registers all Binance classes with a ReflectionTestEngine.
 */
export function registerBinanceClasses(engine: any): void {
    const factories = getBinanceClassFactories();
    for (const factory of factories) {
        engine.registerClass(factory);
    }
    console.log(`[BinanceClassFactory] Registered ${factories.length} Binance classes`);
}

/**
 * Registers all Binance services with a ReflectionTestEngine.
 */
export function registerBinanceServices(engine: any): void {
    try {
        const serviceFactories = getBinanceServiceFactories();
        for (const factory of serviceFactories) {
            engine.registerService(factory);
        }
        console.log(`[BinanceClassFactory] Registered ${serviceFactories.length} Binance services`);
    } catch (err) {
        console.warn('[BinanceClassFactory] Failed to register services:', err);
    }
}
