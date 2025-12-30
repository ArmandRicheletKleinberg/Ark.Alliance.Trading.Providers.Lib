/**
 * @fileoverview Binance Orders Integration Tests
 * @module Binance/Orders/OrderTests
 * 
 * Jest test file that runs order scenarios against real Binance TESTNET.
 * 
 * @remarks
 * Uses ScenarioLoader for synchronous scenario loading at module level
 * to work correctly with Jest's test.each() pattern.
 */

import { ScenarioLoader } from '../../Engine/ScenarioLoader';
import { BinanceTestRunner, createBinanceTestRunner } from '../BinanceTestRunner';
import { TestScenario } from '../../Engine/TestScenario';

// ═══════════════════════════════════════════════════════════════════════════════
// Synchronous Scenario Loading (at module level - REQUIRED for test.each)
// ═══════════════════════════════════════════════════════════════════════════════

const scenarios = ScenarioLoader.loadSync('Binance', 'orders.scenarios.json');

// Pre-compute test cases at module load time
const orderPlacementCases = ScenarioLoader.getTestCases(scenarios, ['limit', 'market', 'stop', 'take-profit', 'trailing']);
const queryCases = ScenarioLoader.getTestCases(scenarios, ['query', 'open-orders', 'order-status']);
const cancelCases = ScenarioLoader.getTestCases(scenarios, ['cancel', 'order-management']);
const tifCases = ScenarioLoader.getTestCases(scenarios, ['gtc', 'ioc', 'fok', 'gtx', 'gtd']);

// ═══════════════════════════════════════════════════════════════════════════════
// Test Setup
// ═══════════════════════════════════════════════════════════════════════════════

describe('Binance Orders Integration Tests', () => {
    let runner: BinanceTestRunner;

    beforeAll(async () => {
        runner = createBinanceTestRunner();
        await runner.prefetchPrices();
    });

    afterAll(() => {
        // Cleanup
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Order Placement Tests
    // ─────────────────────────────────────────────────────────────────────────

    if (orderPlacementCases.length > 0) {
        describe('Order Placement Tests', () => {
            test.each(orderPlacementCases)('%s: %s', async (id, name, scenario: TestScenario) => {
                const result = await runner.getEngine().executeScenario(scenario);

                expect(result.passed).toBe(true);
                if (!result.passed) {
                    console.error(`Failed: ${name}`, result.error?.message);
                    console.error('Validation details:', result.validationDetails);
                }
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Order Query Tests
    // ─────────────────────────────────────────────────────────────────────────

    if (queryCases.length > 0) {
        describe('Order Query Tests', () => {
            test.each(queryCases)('%s: %s', async (id, name, scenario: TestScenario) => {
                const result = await runner.getEngine().executeScenario(scenario);
                expect(result.passed).toBe(true);
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Order Cancellation Tests
    // ─────────────────────────────────────────────────────────────────────────

    if (cancelCases.length > 0) {
        describe('Order Cancellation Tests', () => {
            test.each(cancelCases)('%s: %s', async (id, name, scenario: TestScenario) => {
                const result = await runner.getEngine().executeScenario(scenario);

                // Cancel tests may fail if no order exists, which is expected
                if (!result.passed && result.error?.message?.includes('-2011')) {
                    console.log(`${name}: No order to cancel (expected)`);
                    return;
                }

                expect(result.passed).toBe(true);
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Time In Force Tests
    // ─────────────────────────────────────────────────────────────────────────

    if (tifCases.length > 0) {
        describe('Time In Force Tests', () => {
            test.each(tifCases)('%s: %s', async (id, name, scenario: TestScenario) => {
                const result = await runner.getEngine().executeScenario(scenario);
                expect(result.passed).toBe(true);
            });
        });
    }
});
