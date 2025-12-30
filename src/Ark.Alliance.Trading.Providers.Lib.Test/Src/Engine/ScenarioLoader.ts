/**
 * @fileoverview Scenario Loader Utility
 * @module Engine/ScenarioLoader
 *
 * Provides synchronous scenario loading for Jest test.each patterns.
 * Scenarios load at module level to avoid beforeAll timing issues.
 *
 * @remarks
 * This is an EXTENSION to existing test infrastructure - not a modification.
 * Follows Open/Closed principle.
 */

import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { TestScenarioFile, TestScenario } from './TestScenario';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test case tuple for test.each: [id, name, scenario]
 */
export type TestCaseTuple = [string, string, TestScenario];

// ═══════════════════════════════════════════════════════════════════════════════
// ScenarioLoader
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Synchronous scenario loader for Jest tests.
 *
 * @remarks
 * Solves the problem where test.each() evaluates at module load time,
 * before beforeAll() can assign scenario data.
 *
 * @example
 * ```typescript
 * // At module level (not in beforeAll):
 * const scenarios = ScenarioLoader.loadSync('Binance', 'orders.scenarios.json');
 * const orderTests = ScenarioLoader.getTestCases(scenarios, ['limit', 'market']);
 *
 * describe('Orders', () => {
 *     test.each(orderTests)('%s: %s', async (id, name, scenario) => {
 *         // ...
 *     });
 * });
 * ```
 */
export class ScenarioLoader {
    private static readonly basePath = join(__dirname, '..', 'Scenarios');

    /**
     * Loads a scenario file synchronously.
     *
     * @param provider - Provider name (e.g., 'Binance', 'Deribit')
     * @param filename - Scenario filename (e.g., 'orders.scenarios.json')
     * @returns Parsed scenario file
     * @throws Error if file doesn't exist or is invalid JSON
     */
    static loadSync(provider: string, filename: string): TestScenarioFile {
        const filePath = join(this.basePath, provider, filename);

        if (!existsSync(filePath)) {
            console.error(`[ScenarioLoader] File not found: ${filePath}`);
            return { version: '1.0', description: `Empty - ${filename} not found`, scenarios: [] };
        }

        try {
            const content = readFileSync(filePath, 'utf-8');
            return JSON.parse(content) as TestScenarioFile;
        } catch (error) {
            console.error(`[ScenarioLoader] Failed to parse ${filename}:`, error);
            return { version: '1.0', description: `Empty - ${filename} parse error`, scenarios: [] };
        }
    }

    /**
     * Gets test case tuples for test.each from scenarios.
     *
     * @param file - Loaded scenario file
     * @param tags - Tags to filter scenarios
     * @param includeDisabled - Whether to include disabled scenarios
     * @returns Array of [id, name, scenario] tuples for test.each
     */
    static getTestCases(
        file: TestScenarioFile,
        tags: string[],
        includeDisabled: boolean = false
    ): TestCaseTuple[] {
        if (!file.scenarios || file.scenarios.length === 0) {
            return [];
        }

        return file.scenarios
            .filter(s => {
                // Skip disabled unless explicitly included
                if (!includeDisabled && s.enabled === false) return false;
                // Must have at least one matching tag
                return s.tags?.some(t => tags.includes(t)) ?? false;
            })
            .map(s => [s.id, s.name, s] as TestCaseTuple);
    }

    /**
     * Gets all enabled scenarios regardless of tags.
     *
     * @param file - Loaded scenario file
     * @returns Array of test case tuples
     */
    static getAllEnabledTestCases(file: TestScenarioFile): TestCaseTuple[] {
        if (!file.scenarios) return [];

        return file.scenarios
            .filter(s => s.enabled !== false)
            .map(s => [s.id, s.name, s] as TestCaseTuple);
    }

    /**
     * Checks if a scenario file exists.
     *
     * @param provider - Provider name
     * @param filename - Scenario filename
     * @returns True if file exists
     */
    static exists(provider: string, filename: string): boolean {
        const filePath = join(this.basePath, provider, filename);
        return existsSync(filePath);
    }

    /**
     * Gets list of available scenario files for a provider.
     *
     * @param provider - Provider name
     * @returns Array of scenario filenames
     */
    static getAvailableFiles(provider: string): string[] {
        // Static list for now - could be made dynamic with fs.readdirSync
        const commonFiles = [
            'orders.scenarios.json',
            'positions.scenarios.json',
            'account.scenarios.json',
            'market-data.scenarios.json',
            'errors.scenarios.json',
            'integration.scenarios.json'
        ];

        return commonFiles.filter(f => this.exists(provider, f));
    }
}
