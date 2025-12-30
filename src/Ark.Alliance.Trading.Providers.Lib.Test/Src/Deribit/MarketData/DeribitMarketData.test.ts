/**
 * @fileoverview Deribit Market Data Service Tests
 * @module Tests/Deribit/MarketData
 *
 * Tests for DeribitMarketDataService with real Deribit API connection.
 * Uses scenario-driven approach with JSON test cases.
 */

import { ScenarioLoader } from '../../Engine/ScenarioLoader';
import { TestScenario } from '../../Engine/TestScenario';
import { DeribitMarketDataService, DeribitEnvironment } from 'ark-alliance-trading-providers-lib/Deribit';
import { IQuote } from 'ark-alliance-trading-providers-lib';

// ═══════════════════════════════════════════════════════════════════════════════
// Load Scenarios at Module Level
// ═══════════════════════════════════════════════════════════════════════════════

const scenarioFile = ScenarioLoader.loadSync('Deribit', 'market-data.scenarios.json');
const allTests = ScenarioLoader.getAllEnabledTestCases(scenarioFile);

// ═══════════════════════════════════════════════════════════════════════════════
// Test Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_CONFIG = {
    environment: DeribitEnvironment.TESTNET,
    connectionTimeoutMs: 15000,
    testTimeoutMs: 30000
};

/**
 * Check if live tests should run.
 * Default: SKIP live tests (set RUN_LIVE_TESTS=true to enable)
 * This allows unit tests to pass in CI without network access.
 */
function shouldRunLiveTests(): boolean {
    return process.env.RUN_LIVE_TESTS === 'true';
}

// Helper to create service instance
function createService(): DeribitMarketDataService {
    return new DeribitMarketDataService({
        environment: TEST_CONFIG.environment,
        defaultCurrency: 'BTC',
        debug: process.env.DEBUG === 'true'
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Unit Tests (No live connection required)
// ═══════════════════════════════════════════════════════════════════════════════

describe('DeribitMarketDataService - Unit Tests', () => {
    let service: DeribitMarketDataService;

    beforeEach(() => {
        service = createService();
    });

    afterEach(async () => {
        if (service.isConnected) {
            await service.disconnect();
        }
    });

    describe('Initial State', () => {
        it('should be disconnected initially', () => {
            expect(service.isConnected).toBe(false);
        });

        it('should have DERIBIT as provider', () => {
            expect(service.provider).toBe('DERIBIT');
        });
    });

    describe('Connection State Errors', () => {
        it('should return NOT_CONNECTED when calling getTicker before connect', async () => {
            const result = await service.getTicker('BTC-PERPETUAL');
            expect(result.isSuccess).toBe(false);
            expect(result.error?.code).toBe('NOT_CONNECTED');
        });

        it('should return NOT_CONNECTED when calling getOrderBook before connect', async () => {
            const result = await service.getOrderBook('BTC-PERPETUAL', 10);
            expect(result.isSuccess).toBe(false);
            expect(result.error?.code).toBe('NOT_CONNECTED');
        });

        it('should return NOT_CONNECTED when calling subscribeQuote before connect', async () => {
            const result = await service.subscribeQuote('BTC-PERPETUAL', () => { });
            expect(result.isSuccess).toBe(false);
            expect(result.error?.code).toBe('NOT_CONNECTED');
        });
    });

    describe('Cache Methods', () => {
        it('should return undefined for uncached quotes', () => {
            const quote = service.getCachedQuote('BTC-PERPETUAL');
            expect(quote).toBeUndefined();
        });

        it('should return empty map for cached quotes when not connected', () => {
            const quotes = service.getCachedQuotes();
            expect(quotes.size).toBe(0);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Live Integration Tests (Real Deribit API)
// ═══════════════════════════════════════════════════════════════════════════════

describe('DeribitMarketDataService - Live API Tests', () => {
    let service: DeribitMarketDataService;

    beforeAll(() => {
        if (!shouldRunLiveTests()) {
            console.log('[SKIP] Live tests disabled - set SKIP_LIVE_TESTS=false to enable');
        }
    });

    beforeEach(async () => {
        if (!shouldRunLiveTests()) return;

        service = createService();
    });

    afterEach(async () => {
        if (service?.isConnected) {
            await service.disconnect();
        }
    });

    describe('Connection Lifecycle', () => {
        it('should connect to Deribit testnet', async () => {
            if (!shouldRunLiveTests()) return;

            const result = await service.connect();

            expect(result.isSuccess).toBe(true);
            expect(service.isConnected).toBe(true);
        }, TEST_CONFIG.connectionTimeoutMs);

        it('should disconnect gracefully', async () => {
            if (!shouldRunLiveTests()) return;

            await service.connect();
            const result = await service.disconnect();

            expect(result.isSuccess).toBe(true);
            expect(service.isConnected).toBe(false);
        }, TEST_CONFIG.connectionTimeoutMs);
    });

    describe('Ticker Operations', () => {
        beforeEach(async () => {
            if (shouldRunLiveTests()) {
                await service.connect();
            }
        });

        it('should get ticker for BTC-PERPETUAL', async () => {
            if (!shouldRunLiveTests()) return;

            const result = await service.getTicker('BTC-PERPETUAL');

            expect(result.isSuccess).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.instrument).toBe('BTC-PERPETUAL');
            expect(result.data?.lastPrice).toBeDefined();
        }, TEST_CONFIG.testTimeoutMs);

        it('should get ticker for ETH-PERPETUAL', async () => {
            if (!shouldRunLiveTests()) return;

            const result = await service.getTicker('ETH-PERPETUAL');

            expect(result.isSuccess).toBe(true);
            expect(result.data?.instrument).toBe('ETH-PERPETUAL');
        }, TEST_CONFIG.testTimeoutMs);
    });

    describe('Order Book Operations', () => {
        beforeEach(async () => {
            if (shouldRunLiveTests()) {
                await service.connect();
            }
        });

        it('should get order book for BTC-PERPETUAL', async () => {
            if (!shouldRunLiveTests()) return;

            const result = await service.getOrderBook('BTC-PERPETUAL', 10);

            expect(result.isSuccess).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.instrument).toBe('BTC-PERPETUAL');
            expect(result.data?.bids).toBeInstanceOf(Array);
            expect(result.data?.asks).toBeInstanceOf(Array);
        }, TEST_CONFIG.testTimeoutMs);
    });

    describe('Instrument Operations', () => {
        beforeEach(async () => {
            if (shouldRunLiveTests()) {
                await service.connect();
            }
        });

        it('should get instrument info for BTC-PERPETUAL', async () => {
            if (!shouldRunLiveTests()) return;

            const result = await service.getInstrument('BTC-PERPETUAL');

            expect(result.isSuccess).toBe(true);
            expect(result.data?.symbol).toBe('BTC-PERPETUAL');
        }, TEST_CONFIG.testTimeoutMs);

        it('should get list of BTC instruments', async () => {
            if (!shouldRunLiveTests()) return;

            const result = await service.getInstruments({ baseCurrency: 'BTC' });

            expect(result.isSuccess).toBe(true);
            expect(result.data).toBeInstanceOf(Array);
            expect((result.data ?? []).length).toBeGreaterThan(0);
        }, TEST_CONFIG.testTimeoutMs);
    });

    describe('Subscription Operations', () => {
        beforeEach(async () => {
            if (shouldRunLiveTests()) {
                await service.connect();
            }
        });

        it('should subscribe to quote updates', async () => {
            if (!shouldRunLiveTests()) return;

            let receivedQuote = false;
            const result = await service.subscribeQuote('BTC-PERPETUAL', (quote) => {
                receivedQuote = true;
            });

            expect(result.isSuccess).toBe(true);
            expect(result.data?.id).toContain('quote_BTC-PERPETUAL');
            expect(result.data?.type).toBe('quote');

            // Unsubscribe
            await result.data?.unsubscribe();
        }, TEST_CONFIG.testTimeoutMs);
    });
});
