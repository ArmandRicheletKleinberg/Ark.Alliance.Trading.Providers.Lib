/**
 * @fileoverview Deribit User Data Client Tests
 * @module Tests/Deribit/UserData
 *
 * Tests for DeribitUserDataClient with real Deribit API connection.
 * Uses scenario-driven approach with JSON test cases.
 *
 * @remarks
 * These tests require Deribit API credentials for live tests.
 * Set DERIBIT_CLIENT_ID and DERIBIT_CLIENT_SECRET environment variables.
 */

import { ScenarioLoader } from '../../Engine/ScenarioLoader';
import { TestScenario } from '../../Engine/TestScenario';
import {
    DeribitUserDataClient,
    DeribitEnvironment,
    DeribitClientConfig
} from 'ark-alliance-trading-providers-lib/Deribit';

// ═══════════════════════════════════════════════════════════════════════════════
// Load Scenarios at Module Level
// ═══════════════════════════════════════════════════════════════════════════════

const scenarioFile = ScenarioLoader.loadSync('Deribit', 'user-data.scenarios.json');
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
 * Create client configuration.
 */
function createConfig(): DeribitClientConfig {
    return {
        clientId: process.env.DERIBIT_CLIENT_ID || '',
        clientSecret: process.env.DERIBIT_CLIENT_SECRET || '',
        environment: TEST_CONFIG.environment,
        debug: process.env.DEBUG === 'true'
    };
}

// Helper to create client instance
function createClient(): DeribitUserDataClient {
    return new DeribitUserDataClient(createConfig());
}

// ═══════════════════════════════════════════════════════════════════════════════
// Unit Tests (No live connection required)
// ═══════════════════════════════════════════════════════════════════════════════

describe('DeribitUserDataClient - Unit Tests', () => {
    let client: DeribitUserDataClient;

    beforeEach(() => {
        client = createClient();
    });

    afterEach(async () => {
        if (client.isConnected()) {
            await client.disconnect();
        }
    });

    describe('Initial State', () => {
        it('should be disconnected initially', () => {
            expect(client.isConnected()).toBe(false);
        });
    });

    describe('Connection State Errors', () => {
        it('should fail when calling getAccountSummary before connect', async () => {
            const result = await client.getAccountSummary('BTC');
            expect(result.isSuccess).toBe(false);
        });

        it('should fail when calling getPositions before connect', async () => {
            const result = await client.getPositions('BTC');
            expect(result.isSuccess).toBe(false);
        });

        it('should fail when calling getOpenOrders before connect', async () => {
            const result = await client.getOpenOrders();
            expect(result.isSuccess).toBe(false);
        });

        it('should fail when calling getPosition before connect', async () => {
            const result = await client.getPosition('BTC-PERPETUAL');
            expect(result.isSuccess).toBe(false);
        });

        it('should fail when calling subscribeUserChanges before connect', async () => {
            const result = await client.subscribeUserChanges('BTC-PERPETUAL');
            expect(result.isSuccess).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Live Integration Tests (Real Deribit API - Requires Credentials)
// ═══════════════════════════════════════════════════════════════════════════════

describe('DeribitUserDataClient - Live API Tests', () => {
    let client: DeribitUserDataClient;

    beforeAll(() => {
        if (!shouldRunLiveTests()) {
            console.log('[SKIP] Live tests disabled - set RUN_LIVE_TESTS=true to enable');
        } else if (!hasCredentials()) {
            console.log('[SKIP] Live tests require DERIBIT_CLIENT_ID and DERIBIT_CLIENT_SECRET');
        }
    });

    beforeEach(async () => {
        if (!shouldRunLiveTests() || !hasCredentials()) return;
        client = createClient();
    });

    afterEach(async () => {
        if (client?.isConnected()) {
            await client.disconnect();
        }
    });

    describe('Connection Lifecycle', () => {
        it('should connect and authenticate', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            const result = await client.connect();

            expect(result.isSuccess).toBe(true);
            expect(client.isConnected()).toBe(true);
        }, TEST_CONFIG.connectionTimeoutMs);

        it('should disconnect gracefully', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            await client.connect();
            const result = await client.disconnect();

            expect(result.isSuccess).toBe(true);
            expect(client.isConnected()).toBe(false);
        }, TEST_CONFIG.connectionTimeoutMs);
    });

    describe('Account Operations', () => {
        beforeEach(async () => {
            if (shouldRunLiveTests() && hasCredentials()) {
                await client.connect();
            }
        });

        it('should get account summary for BTC', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            const result = await client.getAccountSummary('BTC');

            expect(result.isSuccess).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.currency).toBe('BTC');
        }, TEST_CONFIG.testTimeoutMs);

        it('should get account summary for ETH', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            const result = await client.getAccountSummary('ETH');

            expect(result.isSuccess).toBe(true);
            expect(result.data?.currency).toBe('ETH');
        }, TEST_CONFIG.testTimeoutMs);
    });

    describe('Position Operations', () => {
        beforeEach(async () => {
            if (shouldRunLiveTests() && hasCredentials()) {
                await client.connect();
            }
        });

        it('should get positions for BTC', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            const result = await client.getPositions('BTC');

            expect(result.isSuccess).toBe(true);
            expect(result.data).toBeInstanceOf(Array);
        }, TEST_CONFIG.testTimeoutMs);

        it('should get position for BTC-PERPETUAL', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            const result = await client.getPosition('BTC-PERPETUAL');

            expect(result.isSuccess).toBe(true);
            // Position may or may not exist depending on account state
            if (result.data) {
                expect(result.data.symbol).toBe('BTC-PERPETUAL');
            }
        }, TEST_CONFIG.testTimeoutMs);
    });

    describe('Order Operations', () => {
        beforeEach(async () => {
            if (shouldRunLiveTests() && hasCredentials()) {
                await client.connect();
            }
        });

        it('should get open orders', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            const result = await client.getOpenOrders();

            expect(result.isSuccess).toBe(true);
            expect(result.data).toBeInstanceOf(Array);
        }, TEST_CONFIG.testTimeoutMs);

        it('should get open orders by instrument', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            const result = await client.getOpenOrders('BTC-PERPETUAL');

            expect(result.isSuccess).toBe(true);
            expect(result.data).toBeInstanceOf(Array);
        }, TEST_CONFIG.testTimeoutMs);
    });

    describe('Subscription Operations', () => {
        beforeEach(async () => {
            if (shouldRunLiveTests() && hasCredentials()) {
                await client.connect();
            }
        });

        it('should subscribe to user changes', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            const result = await client.subscribeUserChanges(
                'BTC-PERPETUAL',
                (order) => { /* order update callback */ },
                (position) => { /* position update callback */ }
            );

            expect(result.isSuccess).toBe(true);

            // Cleanup
            await client.unsubscribeUserChanges('BTC-PERPETUAL');
        }, TEST_CONFIG.testTimeoutMs);

        it('should subscribe to portfolio updates', async () => {
            if (!shouldRunLiveTests() || !hasCredentials()) return;

            const result = await client.subscribePortfolio('BTC', (account) => {
                /* account update callback */
            });

            expect(result.isSuccess).toBe(true);
        }, TEST_CONFIG.testTimeoutMs);
    });
});
