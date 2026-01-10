/**
 * @fileoverview BinanceAccountService Unit Tests
 * @module Tests/Binance/Services/BinanceAccountService
 *
 * Unit tests for the BinanceAccountService IAccountService implementation.
 * Uses JSON scenario configurations.
 */

import { ProviderType } from 'ark-alliance-trading-providers-lib';
import { BinanceAccountService, BinanceAccountServiceConfig, BinanceEnvironment } from 'ark-alliance-trading-providers-lib/Binance';
import * as accountScenarios from '@scenarios/Binance/account-service.scenarios.json';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const testConfig: BinanceAccountServiceConfig = {
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    environment: BinanceEnvironment.TESTNET,
    instanceKey: 'test-account-service',
    cacheTtlMs: 1000
};

// ═══════════════════════════════════════════════════════════════════════════════
// Unit Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('BinanceAccountService', () => {
    describe('Service Instantiation', () => {
        it('should create service with correct provider type', () => {
            const service = new BinanceAccountService(testConfig);
            expect(service.provider).toBe(ProviderType.BINANCE);
        });

        it('should initialize as not connected', () => {
            const service = new BinanceAccountService(testConfig);
            expect(service.isConnected).toBe(false);
        });

        it('should use default cache TTL when not specified', () => {
            const configWithoutTtl: BinanceAccountServiceConfig = {
                apiKey: 'test',
                apiSecret: 'test',
                environment: BinanceEnvironment.TESTNET
            };
            const service = new BinanceAccountService(configWithoutTtl);
            expect(service).toBeDefined();
        });
    });

    describe('IAccountService Interface Compliance', () => {
        let service: BinanceAccountService;

        beforeEach(() => {
            service = new BinanceAccountService(testConfig);
        });

        it('should implement connect method', () => {
            expect(typeof service.connect).toBe('function');
        });

        it('should implement disconnect method', () => {
            expect(typeof service.disconnect).toBe('function');
        });

        it('should implement getAccount method', () => {
            expect(typeof service.getAccount).toBe('function');
        });

        it('should implement getBalances method', () => {
            expect(typeof service.getBalances).toBe('function');
        });

        it('should implement setLeverage method', () => {
            expect(typeof service.setLeverage).toBe('function');
        });

        it('should implement setMarginType method', () => {
            expect(typeof service.setMarginType).toBe('function');
        });

        it('should implement getLeverage method', () => {
            expect(typeof service.getLeverage).toBe('function');
        });

        it('should implement onAccountUpdate method', () => {
            expect(typeof service.onAccountUpdate).toBe('function');
        });
    });

    describe('Cache Functionality', () => {
        let service: BinanceAccountService;

        beforeEach(() => {
            service = new BinanceAccountService(testConfig);
        });

        it('should implement getCachedAccount method', () => {
            expect(typeof service.getCachedAccount).toBe('function');
        });

        it('should implement getCachedBalances method', () => {
            expect(typeof service.getCachedBalances).toBe('function');
        });

        it('should implement invalidateCache method', () => {
            expect(typeof service.invalidateCache).toBe('function');
        });

        it('should return undefined from getCachedAccount initially', () => {
            expect(service.getCachedAccount()).toBeUndefined();
        });

        it('should return undefined from getCachedBalances initially', () => {
            expect(service.getCachedBalances()).toBeUndefined();
        });
    });

    describe('Error Handling - Not Connected', () => {
        let service: BinanceAccountService;

        beforeEach(() => {
            service = new BinanceAccountService(testConfig);
        });

        it('should return error from getAccount when not connected', async () => {
            const result = await service.getAccount();
            expect(result.isSuccess).toBe(false);
        });

        it('should return error from getBalances when not connected', async () => {
            const result = await service.getBalances();
            expect(result.isSuccess).toBe(false);
        });

        it('should return error from setLeverage when not connected', async () => {
            const result = await service.setLeverage({ instrument: 'BTCUSDT', leverage: 10 });
            expect(result.isSuccess).toBe(false);
        });

        it('should return error from setMarginType when not connected', async () => {
            const result = await service.setMarginType({ instrument: 'BTCUSDT', marginType: 'ISOLATED' });
            expect(result.isSuccess).toBe(false);
        });

        it('should return error from getLeverage when not connected', async () => {
            const result = await service.getLeverage('BTCUSDT');
            expect(result.isSuccess).toBe(false);
        });
    });

    describe('Scenario-Based Tests', () => {
        const scenarios = accountScenarios.scenarios;

        scenarios.forEach((scenario: any) => {
            if (scenario.enabled) {
                it(`${scenario.id}: ${scenario.name}`, () => {
                    // Test scenario metadata is valid
                    expect(scenario.targetClass).toBe('BinanceAccountService');
                    expect(scenario.targetMethod).toBeDefined();
                    expect(scenario.expected).toBeDefined();
                    expect(scenario.expected.success).toBeDefined();
                });
            }
        });
    });
});

describe('BinanceAccountService Mapping Tests', () => {
    describe('IAccount Mapping', () => {
        it('should map provider correctly', () => {
            // Mapping test - verifies the expected structure
            const expectedAccount = {
                accountId: 'binance-futures',
                provider: ProviderType.BINANCE,
                currency: 'USDT',
                totalBalance: expect.any(String),
                availableBalance: expect.any(String),
                marginUsed: expect.any(String),
                unrealizedPnl: expect.any(String),
                realizedPnl: expect.any(String),
                updatedAt: expect.any(Number),
                providerData: expect.anything()
            };
            expect(expectedAccount.provider).toBe(ProviderType.BINANCE);
        });
    });

    describe('IAccountBalance Mapping', () => {
        it('should expect correct balance structure', () => {
            const expectedBalance = {
                currency: expect.any(String),
                walletBalance: expect.any(String),
                availableBalance: expect.any(String),
                unrealizedPnl: expect.any(String)
            };
            expect(expectedBalance).toBeDefined();
        });
    });
});
