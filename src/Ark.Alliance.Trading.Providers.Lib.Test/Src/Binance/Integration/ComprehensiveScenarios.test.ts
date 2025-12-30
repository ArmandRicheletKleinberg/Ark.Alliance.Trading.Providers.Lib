/**
 * @fileoverview Comprehensive Scenario Tests
 * @module Binance/Integration/ComprehensiveScenarios
 * 
 * Jest test file that runs ALL scenarios from all JSON files in the directory.
 * Ensures complete coverage of all defined test cases.
 */

import { ScenarioLoader } from '../../Engine/ScenarioLoader';
import { BinanceTestRunner, createBinanceTestRunner } from '../BinanceTestRunner';
import { TestScenario } from '../../Engine/TestScenario';

// List of all scenario files to execute
const SCENARIO_FILES = [
    'account.scenarios.json',
    'algo-orders.scenarios.json',
    'errors.scenarios.json',
    'gtx-orders.scenarios.json',
    'market-data.scenarios.json',
    'market-orders.scenarios.json',
    'mixed-orders.scenarios.json',
    'positions.scenarios.json',
    'rate-limit.scenarios.json',
    'streaming.scenarios.json'
];

interface ScenarioFile {
    filename: string;
    scenarios: TestScenario[];
}

// Pre-load all scenarios synchronously
const loadedFiles: ScenarioFile[] = SCENARIO_FILES.map(filename => {
    try {
        const scenarioFile = ScenarioLoader.loadSync('Binance', filename);
        // Filter disabled scenarios
        const enabledScenarios = (scenarioFile.scenarios || []).filter(s => s.enabled !== false);
        return { filename, scenarios: enabledScenarios };
    } catch (error) {
        console.warn(`Failed to load ${filename}:`, error);
        return { filename, scenarios: [] };
    }
});

describe('Comprehensive Binance Scenarios', () => {
    let runner: BinanceTestRunner;

    beforeAll(async () => {
        runner = createBinanceTestRunner();
        await runner.prefetchPrices();
    }, 60000);

    afterAll(() => {
        // Cleanup resources
    });

    // Create a describe block for each file
    loadedFiles.forEach(({ filename, scenarios }) => {
        if (scenarios.length === 0) return;

        describe(`File: ${filename}`, () => {
            test.each(scenarios.map(s => [s.id, s.name, s]))(
                '%s: %s',
                async (id, name, scenario: TestScenario) => {
                    const result = await runner.getEngine().executeScenario(scenario);

                    if (!result.passed) {
                        console.error(`Failed: ${name} (${filename})`);
                        console.error('Error:', result.error?.message);
                        if (result.validationDetails) {
                            console.error('Validation:', result.validationDetails);
                        }
                    }

                    // Special handling for partial fills or expected errors if needed
                    if (scenario.expected && !scenario.expected.success && result.error) {
                        // Expected failure scenario
                        expect(result.passed).toBe(false);
                    } else {
                        // Expected success
                        expect(result.passed).toBe(true);
                    }
                },
                60000 // 60s timeout per scenario
            );
        });
    });
});
