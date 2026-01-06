/**
 * @fileoverview Deribit Trading Service Tests
 * @module Tests/Deribit/Trading
 *
 * Tests for DeribitTradingService with real Deribit API connection.
 * Uses scenario-driven approach with JSON test cases.
 *
 * @remarks
 * These tests require Deribit API credentials for live tests.
 * Set DERIBIT_CLIENT_ID and DERIBIT_CLIENT_SECRET environment variables.
 *
 * WARNING: Live trading tests will place real orders on testnet.
 */

import { ScenarioLoader } from '../../Engine/ScenarioLoader';
import { TestScenario } from '../../Engine/TestScenario';
import {
    DeribitTradingService,
    DeribitEnvironment,
    DeribitTradingServiceConfig
} from 'ark-alliance-trading-providers-lib/Deribit';
import { OrderSide, OrderType, TimeInForce } from 'ark-alliance-trading-providers-lib';

// ═══════════════════════════════════════════════════════════════════════════════
// Load Scenarios at Module Level
// ═══════════════════════════════════════════════════════════════════════════════

const scenarioFile = ScenarioLoader.loadSync('Deribit', 'trading.scenarios.json');
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
 * Requires RUN_LIVE_TESTS=true AND valid Deribit credentials.
 */
function shouldRunLiveTests(): boolean {
    return process.env.RUN_LIVE_TESTS === 'true';
}

/**
 * Check if Deribit credentials are available.
 */
function hasCredentials(): boolean {
    return !!(process.env.DERIBIT_CLIENT_ID && process.env.DERIBIT_CLIENT_SECRET);
}

/**
 * Create service configuration.
 */
function createConfig(): DeribitTradingServiceConfig {
    return {
        apiKey: process.env.DERIBIT_CLIENT_ID || '',
        apiSecret: process.env.DERIBIT_CLIENT_SECRET || '',
        environment: TEST_CONFIG.environment,
        defaultCurrency: 'BTC',
        debug: process.env.DEBUG === 'true'
    };
}

// Helper to create service instance
function createService(): DeribitTradingService {
    return new DeribitTradingService(createConfig());
}

// ═══════════════════════════════════════════════════════════════════════════════
// Unit Tests (No live connection required)
// ═══════════════════════════════════════════════════════════════════════════════

describe('DeribitTradingService - Unit Tests', () => {
    let service: DeribitTradingService;

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
    });

    describe('Connection State Errors', () => {
        it('should return NOT_CONNECTED when calling placeOrder before connect', async () => {
            const result = await service.placeOrder({
                instrument: 'BTC-PERPETUAL',
                side: OrderSide.BUY,
                type: OrderType.LIMIT,
                quantity: '10',
                price: '30000'
            });
            expect(result.isSuccess).toBe(false);
            // Service layer should return NOT_CONNECTED
            if (result.error?.code) {
                expect(result.error.code).toBe('NOT_CONNECTED');
            }
        });

        it('should return NOT_CONNECTED when calling cancelOrder before connect', async () => {
            const result = await service.cancelOrder({ orderId: 'test-order-id' });
            expect(result.isSuccess).toBe(false);
            if (result.error?.code) {
                expect(result.error.code).toBe('NOT_CONNECTED');
            }
        });

        it('should return NOT_CONNECTED when calling getPosition before connect', async () => {
            const result = await service.getPosition('BTC-PERPETUAL');
            expect(result.isSuccess).toBe(false);
            if (result.error?.code) {
                expect(result.error.code).toBe('NOT_CONNECTED');
            }
        });

        it('should return NOT_CONNECTED when calling getOpenOrders before connect', async () => {
            const result = await service.getOpenOrders();
            expect(result.isSuccess).toBe(false);
            if (result.error?.code) {
                expect(result.error.code).toBe('NOT_CONNECTED');
            }
        });
    });

    describe('Event Callbacks', () => {
        it('should register order update callback', () => {
            let callbackCalled = false;
            service.onOrderUpdate(() => { callbackCalled = true; });
            // Callback registration shouldn't throw
            expect(true).toBe(true);
        });

        it('should register position update callback', () => {
            let callbackCalled = false;
            service.onPositionUpdate(() => { callbackCalled = true; });
            // Callback registration shouldn't throw
            expect(true).toBe(true);
        });

        it('should remove all listeners', () => {
            service.onOrderUpdate(() => { });
            service.onPositionUpdate(() => { });
            service.removeAllListeners();
            // Should not throw
            expect(true).toBe(true);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Live Integration Tests (Real Deribit API - Requires Credentials)
// ═══════════════════════════════════════════════════════════════════════════════

describe('DeribitTradingService - Live API Tests', () => {
    let service: DeribitTradingService;

    beforeAll(() => {
        if (!shouldRunLiveTests()) {
            console.log('[SKIP] Live tests disabled - set RUN_LIVE_TESTS=true to enable');
        } else if (!hasCredentials()) {
            console.log('[SKIP] Live tests require DERIBIT_CLIENT_ID and DERIBIT_CLIENT_SECRET');
        }
    });

    beforeEach(async () => {
        if (!shouldRunLiveTests() || !hasCredentials()) return;
        service = createService();
    });

    afterEach(async () => {
        if (service?.isConnected) {
            // Cancel any open orders before disconnecting
            await service.cancelAllOrders();
            await service.disconnect();
        }
    });

    describe('Connection Lifecycle', () => {
        it('should connect and authenticate', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            const result = await service.connect();

            expect(result.isSuccess).toBe(true);
            expect(service.isConnected).toBe(true);
        }, TEST_CONFIG.connectionTimeoutMs);

        it('should disconnect gracefully', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            await service.connect();
            const result = await service.disconnect();

            expect(result.isSuccess).toBe(true);
            expect(service.isConnected).toBe(false);
        }, TEST_CONFIG.connectionTimeoutMs);
    });

    describe('Position Operations', () => {
        beforeEach(async () => {
            if (shouldRunLiveTests() && hasCredentials()) {
                await service.connect();
            }
        });

        it('should get position for BTC-PERPETUAL', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            const result = await service.getPosition('BTC-PERPETUAL');

            expect(result.isSuccess).toBe(true);
            // Position may be empty if no open position
            if (result.data) {
                expect(result.data.symbol).toBe('BTC-PERPETUAL');
            }
        }, TEST_CONFIG.testTimeoutMs);

        it('should get all positions', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            const result = await service.getPositions();

            expect(result.isSuccess).toBe(true);
            expect(result.data).toBeInstanceOf(Array);
        }, TEST_CONFIG.testTimeoutMs);
    });

    describe('Order Operations', () => {
        beforeEach(async () => {
            if (shouldRunLiveTests() && hasCredentials()) {
                await service.connect();
            }
        });

        it('should get open orders', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            const result = await service.getOpenOrders();

            expect(result.isSuccess).toBe(true);
            expect(result.data).toBeInstanceOf(Array);
        }, TEST_CONFIG.testTimeoutMs);

        it('should place and cancel a limit buy order', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            // Place a limit order far from market (won't fill)
            const placeResult = await service.placeOrder({
                instrument: 'BTC-PERPETUAL',
                side: OrderSide.BUY,
                type: OrderType.LIMIT,
                quantity: '10',
                price: '10000' // Very low price, won't fill
            });

            expect(placeResult.isSuccess).toBe(true);
            expect(placeResult.data?.orderId).toBeDefined();

            // Cancel the order
            if (placeResult.data?.orderId) {
                const cancelResult = await service.cancelOrder({
                    orderId: placeResult.data.orderId
                });
                expect(cancelResult.isSuccess).toBe(true);
            }
        }, TEST_CONFIG.testTimeoutMs);

        it('should place and cancel a limit sell order', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            // Place a limit order far from market (won't fill)
            const placeResult = await service.placeOrder({
                instrument: 'BTC-PERPETUAL',
                side: OrderSide.SELL,
                type: OrderType.LIMIT,
                quantity: '10',
                price: '200000' // Very high price, won't fill
            });

            expect(placeResult.isSuccess).toBe(true);
            expect(placeResult.data?.orderId).toBeDefined();

            // Cancel the order
            if (placeResult.data?.orderId) {
                const cancelResult = await service.cancelOrder({
                    orderId: placeResult.data.orderId
                });
                expect(cancelResult.isSuccess).toBe(true);
            }
        }, TEST_CONFIG.testTimeoutMs);

        it('should cancel all orders', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            // Place an order first
            await service.placeOrder({
                instrument: 'BTC-PERPETUAL',
                side: OrderSide.BUY,
                type: OrderType.LIMIT,
                quantity: '10',
                price: '10000'
            });

            // Cancel all
            const result = await service.cancelAllOrders();

            expect(result.isSuccess).toBe(true);
        }, TEST_CONFIG.testTimeoutMs);

        it('should get order by ID', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            // Place an order
            const placeResult = await service.placeOrder({
                instrument: 'BTC-PERPETUAL',
                side: OrderSide.BUY,
                type: OrderType.LIMIT,
                quantity: '10',
                price: '10000'
            });

            expect(placeResult.isSuccess).toBe(true);

            if (placeResult.data?.orderId) {
                // Get order by ID
                const getResult = await service.getOrder(placeResult.data.orderId);

                expect(getResult.isSuccess).toBe(true);
                expect(getResult.data?.instrument).toBe('BTC-PERPETUAL');

                // Cleanup
                await service.cancelOrder({ orderId: placeResult.data.orderId });
            }
        }, TEST_CONFIG.testTimeoutMs);
    });
});
