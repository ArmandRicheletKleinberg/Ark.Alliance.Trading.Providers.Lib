/**
 * @fileoverview Kraken Market Data Service Tests
 * @module Tests/Kraken/MarketData
 *
 * Tests for KrakenMarketDataService with real Kraken Futures API connection.
 * Uses scenario-driven approach with JSON test cases.
 *
 * @author Ark Alliance
 * @version 1.0.0
 * @since 2026-01-06
 */

import { ScenarioLoader } from '../../Engine/ScenarioLoader';
import { KrakenMarketDataService, KrakenEnvironment } from 'ark-alliance-trading-providers-lib/Kraken';

// ═══════════════════════════════════════════════════════════════════════════════
// Load Scenarios at Module Level
// ═══════════════════════════════════════════════════════════════════════════════

const scenarioFile = ScenarioLoader.loadSync('Kraken', 'market-data.scenarios.json');
const allTests = ScenarioLoader.getAllEnabledTestCases(scenarioFile);

// ═══════════════════════════════════════════════════════════════════════════════
// Test Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_CONFIG = {
    environment: KrakenEnvironment.TESTNET,
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

/**
 * Helper to create service instance.
 * @returns A new KrakenMarketDataService instance configured for testing.
 */
function createService(): KrakenMarketDataService {
    return new KrakenMarketDataService({
        environment: TEST_CONFIG.environment,
        debug: process.env.DEBUG === 'true'
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Unit Tests (No live connection required)
// ═══════════════════════════════════════════════════════════════════════════════

describe('KrakenMarketDataService - Unit Tests', () => {
    let service: KrakenMarketDataService;

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

        it('should have KRAKEN as provider', () => {
            expect(service.provider).toBe('KRAKEN');
        });
    });

    describe('Connection State Errors', () => {
        it('should return NOT_CONNECTED when calling getTicker before connect', async () => {
            const result = await service.getTicker('PI_XBTUSD');
            expect(result.isSuccess).toBe(false);
            expect(result.error?.code).toBe('NOT_CONNECTED');
        });

        it('should return NOT_CONNECTED when calling getOrderBook before connect', async () => {
            const result = await service.getOrderBook('PI_XBTUSD', 10);
            expect(result.isSuccess).toBe(false);
            expect(result.error?.code).toBe('NOT_CONNECTED');
        });

        it('should return NOT_CONNECTED when calling subscribeQuote before connect', async () => {
            const result = await service.subscribeQuote('PI_XBTUSD', () => { });
            expect(result.isSuccess).toBe(false);
            expect(result.error?.code).toBe('NOT_CONNECTED');
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Live Integration Tests (Real Kraken Futures API)
// ═══════════════════════════════════════════════════════════════════════════════

describe('KrakenMarketDataService - Live API Tests', () => {
    let service: KrakenMarketDataService;

    beforeAll(() => {
        if (!shouldRunLiveTests()) {
            console.log('[SKIP] Live tests disabled - set RUN_LIVE_TESTS=true to enable');
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
        it('should connect to Kraken Futures testnet', async () => {
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

        it('should get ticker for PI_XBTUSD', async () => {
            if (!shouldRunLiveTests()) return;

            const result = await service.getTicker('PI_XBTUSD');

            expect(result.isSuccess).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.instrument).toBe('PI_XBTUSD');
            expect(result.data?.lastPrice).toBeDefined();
        }, TEST_CONFIG.testTimeoutMs);

        it('should get ticker for PI_ETHUSD', async () => {
            if (!shouldRunLiveTests()) return;

            const result = await service.getTicker('PI_ETHUSD');

            expect(result.isSuccess).toBe(true);
            expect(result.data?.instrument).toBe('PI_ETHUSD');
        }, TEST_CONFIG.testTimeoutMs);
    });

    describe('Order Book Operations', () => {
        beforeEach(async () => {
            if (shouldRunLiveTests()) {
                await service.connect();
            }
        });

        it('should get order book for PI_XBTUSD', async () => {
            if (!shouldRunLiveTests()) return;

            const result = await service.getOrderBook('PI_XBTUSD', 10);

            expect(result.isSuccess).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.instrument).toBe('PI_XBTUSD');
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

        it('should get instrument info for PI_XBTUSD', async () => {
            if (!shouldRunLiveTests()) return;

            const result = await service.getInstrument('PI_XBTUSD');

            expect(result.isSuccess).toBe(true);
            expect(result.data?.symbol).toBe('PI_XBTUSD');
        }, TEST_CONFIG.testTimeoutMs);

        it('should get list of perpetual instruments', async () => {
            if (!shouldRunLiveTests()) return;

            const result = await service.getInstruments({ type: 'perpetual' });

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
            const result = await service.subscribeQuote('PI_XBTUSD', (quote) => {
                receivedQuote = true;
            });

            expect(result.isSuccess).toBe(true);
            expect(result.data?.id).toContain('ticker:PI_XBTUSD');
            expect(result.data?.type).toBe('quote');

            // Unsubscribe
            await result.data?.unsubscribe();
        }, TEST_CONFIG.testTimeoutMs);
    });
});
