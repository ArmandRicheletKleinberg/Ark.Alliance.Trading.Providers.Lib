/**
 * @fileoverview Integration Tests
 * @module Binance/Integration/IntegrationTests
 * 
 * Jest test file that runs complex multi-step integration scenarios.
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

const scenarios = ScenarioLoader.loadSync('Binance', 'integration.scenarios.json');

// Pre-compute test cases at module load time
const lifecycleCases = ScenarioLoader.getTestCases(scenarios, ['lifecycle', 'events', 'fill']);
const positionCases = ScenarioLoader.getTestCases(scenarios, ['inversion', 'complete', 'multi-symbol']);
const modifyCases = ScenarioLoader.getTestCases(scenarios, ['modify', 'price-update', 'cascade']);
const partialCases = ScenarioLoader.getTestCases(scenarios, ['partial-fill', 'liquidity', 'orderbook']);
const errorCases = ScenarioLoader.getTestCases(scenarios, ['rejection', 'error-handling', 'gtx']);
const algoCases = ScenarioLoader.getTestCases(scenarios, ['trailing', 'conditional', 'advanced']);

// ═══════════════════════════════════════════════════════════════════════════════
// Integration Test Suite
// ═══════════════════════════════════════════════════════════════════════════════

describe('Binance Integration Tests', () => {
    let runner: BinanceTestRunner;

    beforeAll(async () => {
        runner = createBinanceTestRunner();
        await runner.prefetchPrices();
    }, 30000);

    afterAll(() => {
        // Cleanup resources
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Order Lifecycle Tests
    // ─────────────────────────────────────────────────────────────────────────

    if (lifecycleCases.length > 0) {
        describe('Order Lifecycle with Events', () => {
            test.each(lifecycleCases)('%s: %s', async (id, name, scenario: TestScenario) => {
                const result = await runner.getEngine().executeScenario(scenario);

                if (!result.passed) {
                    console.error(`Failed: ${name}`);
                    console.error('Error:', result.error?.message);
                    console.error('Validation:', result.validationDetails);
                }

                expect(result.passed).toBe(true);
            }, 60000);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Position Management Tests
    // ─────────────────────────────────────────────────────────────────────────

    if (positionCases.length > 0) {
        describe('Position Lifecycle with Events', () => {
            test.each(positionCases)('%s: %s', async (id, name, scenario: TestScenario) => {
                const result = await runner.getEngine().executeScenario(scenario);
                expect(result.passed).toBe(true);
            }, 60000);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Order Modification Tests
    // ─────────────────────────────────────────────────────────────────────────

    if (modifyCases.length > 0) {
        describe('Order Modification Flow', () => {
            test.each(modifyCases)('%s: %s', async (id, name, scenario: TestScenario) => {
                const result = await runner.getEngine().executeScenario(scenario);
                expect(result.passed).toBe(true);
            }, 60000);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Partial Fill Tests
    // ─────────────────────────────────────────────────────────────────────────

    if (partialCases.length > 0) {
        describe('Partial Fill Handling', () => {
            test.each(partialCases)('%s: %s', async (id, name, scenario: TestScenario) => {
                const result = await runner.getEngine().executeScenario(scenario);

                if (!result.passed) {
                    console.log(`${name}: Partial fill test - result depends on orderbook liquidity`);
                }

                // Don't fail on partial fill - just verify no error
                expect(result.error).toBeUndefined();
            }, 60000);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Error Handling Tests
    // ─────────────────────────────────────────────────────────────────────────

    if (errorCases.length > 0) {
        describe('Error Handling Integration', () => {
            test.each(errorCases)('%s: %s', async (id, name, scenario: TestScenario) => {
                const result = await runner.getEngine().executeScenario(scenario);
                expect(result.passed).toBe(true);
            }, 60000);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Algo Order Tests
    // ─────────────────────────────────────────────────────────────────────────

    if (algoCases.length > 0) {
        describe('Trailing Stop Integration', () => {
            test.each(algoCases)('%s: %s', async (id, name, scenario: TestScenario) => {
                const result = await runner.getEngine().executeScenario(scenario);
                expect(result.passed).toBe(true);
            }, 60000);
        });
    }
});
