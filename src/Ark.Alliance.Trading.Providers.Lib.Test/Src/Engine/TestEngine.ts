/**
 * @fileoverview Test Engine Core
 * @module Engine/TestEngine
 * 
 * Main test scenario executor that loads JSON scenarios
 * and runs them against real library classes.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
    TestScenario,
    TestScenarioFile,
    CredentialSet,
    TestConfig,
    ExpectedResult,
    ValidationConfig
} from './TestScenario';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Engine Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test execution result.
 */
export interface TestExecutionResult {
    /** Scenario ID */
    scenarioId: string;

    /** Scenario name */
    scenarioName: string;

    /** Whether the test passed */
    passed: boolean;

    /** Actual result data */
    actualResult?: unknown;

    /** Error if test failed */
    error?: Error;

    /** Execution time in milliseconds */
    executionTimeMs: number;

    /** Validation details */
    validationDetails?: ValidationDetail[];

    /** Rate limit tracking info */
    rateLimit?: {
        usedWeight: number;
        maxWeight: number;
        orderCount?: number;
        maxOrders?: number;
    };
}

/**
 * Validation detail for single field comparison.
 */
export interface ValidationDetail {
    field: string;
    expected: unknown;
    actual: unknown;
    passed: boolean;
    message?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Engine Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test Engine - Loads and executes JSON test scenarios.
 * 
 * @example
 * ```typescript
 * const engine = new TestEngine();
 * const results = await engine.runScenarioFile('orders.scenarios.json');
 * ```
 */
export class TestEngine {
    private config: TestConfig;
    private credentials: Map<string, CredentialSet> = new Map();
    private classRegistry: Map<string, new (...args: unknown[]) => unknown> = new Map();

    /**
     * Creates a new TestEngine instance.
     * 
     * @param configPath - Path to test configuration file
     */
    constructor(configPath?: string) {
        this.config = this.loadConfig(configPath);
        this.loadCredentials();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Configuration Loading
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Loads test configuration from file.
     */
    private loadConfig(configPath?: string): TestConfig {
        const defaultConfig: TestConfig = {
            credentials: {
                'binance-testnet': {
                    apiKeyEnv: 'BINANCE_TESTNET_API_KEY',
                    apiSecretEnv: 'BINANCE_TESTNET_API_SECRET'
                },
                'binance-mainnet': {
                    apiKeyEnv: 'BINANCE_MAINNET_API_KEY',
                    apiSecretEnv: 'BINANCE_MAINNET_API_SECRET'
                },
                'deribit-testnet': {
                    apiKeyEnv: 'DERIBIT_TESTNET_API_KEY',
                    apiSecretEnv: 'DERIBIT_TESTNET_API_SECRET'
                }
            },
            defaultEnvironment: 'TESTNET',
            defaultProvider: 'binance'
        };

        if (configPath) {
            try {
                const configContent = readFileSync(configPath, 'utf-8');
                return { ...defaultConfig, ...JSON.parse(configContent) };
            } catch {
                console.warn(`Could not load config from ${configPath}, using defaults`);
            }
        }

        return defaultConfig;
    }

    /**
     * Loads credentials from environment variables.
     */
    private loadCredentials(): void {
        for (const [id, envConfig] of Object.entries(this.config.credentials)) {
            const apiKey = process.env[envConfig.apiKeyEnv];
            const apiSecret = process.env[envConfig.apiSecretEnv];

            if (apiKey && apiSecret) {
                const [provider, network] = id.split('-') as [string, string];
                this.credentials.set(id, {
                    id,
                    provider: provider as 'binance' | 'deribit',
                    network: network.toUpperCase() as 'TESTNET' | 'MAINNET',
                    apiKey,
                    apiSecret
                });
            }
        }
    }

    /**
     * Gets credential set by ID.
     */
    public getCredentials(credentialRef: string): CredentialSet | undefined {
        return this.credentials.get(credentialRef);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Class Registry
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Registers a class for testing.
     * 
     * @param className - Class name as referenced in scenarios
     * @param classConstructor - Class constructor
     */
    public registerClass(
        className: string,
        classConstructor: new (...args: unknown[]) => unknown
    ): void {
        this.classRegistry.set(className, classConstructor);
    }

    /**
     * Gets registered class by name.
     */
    public getClass(className: string): (new (...args: unknown[]) => unknown) | undefined {
        return this.classRegistry.get(className);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Scenario Loading
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Loads scenarios from a JSON file.
     * 
     * @param filePath - Path to scenario JSON file
     * @returns Loaded scenarios
     */
    public loadScenarioFile(filePath: string): TestScenarioFile {
        const content = readFileSync(filePath, 'utf-8');
        return JSON.parse(content) as TestScenarioFile;
    }

    /**
     * Filters scenarios by category or tags.
     */
    public filterScenarios(
        scenarios: TestScenario[],
        options: {
            category?: string;
            tags?: string[];
            enabledOnly?: boolean;
        }
    ): TestScenario[] {
        return scenarios.filter(scenario => {
            // Filter by enabled status
            if (options.enabledOnly && scenario.enabled === false) {
                return false;
            }

            // Filter by category
            if (options.category && scenario.category !== options.category) {
                return false;
            }

            // Filter by tags (scenario must have at least one matching tag)
            if (options.tags && options.tags.length > 0) {
                const hasMatchingTag = options.tags.some(tag =>
                    scenario.tags.includes(tag)
                );
                if (!hasMatchingTag) return false;
            }

            return true;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Scenario Execution
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Executes a single test scenario.
     * 
     * @param scenario - Test scenario to execute
     * @returns Execution result
     */
    public async executeScenario(scenario: TestScenario): Promise<TestExecutionResult> {
        const startTime = Date.now();
        const result: TestExecutionResult = {
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            passed: false,
            executionTimeMs: 0
        };

        try {
            // Check if scenario is enabled
            if (scenario.enabled === false) {
                result.passed = true;
                result.validationDetails = [{
                    field: 'enabled',
                    expected: true,
                    actual: false,
                    passed: true,
                    message: 'Scenario skipped (disabled)'
                }];
                result.executionTimeMs = Date.now() - startTime;
                return result;
            }

            // Get credentials if required
            let credentials: CredentialSet | undefined;
            if (scenario.environment.requiresAuth) {
                const credentialRef = scenario.environment.credentialRef ||
                    `${scenario.environment.provider}-${scenario.environment.network.toLowerCase()}`;
                credentials = this.getCredentials(credentialRef);

                if (!credentials) {
                    // Skip test when credentials are not available
                    result.passed = true;
                    result.validationDetails = [{
                        field: 'credentials',
                        expected: credentialRef,
                        actual: undefined,
                        passed: true,
                        message: `Scenario skipped (credentials not available: ${credentialRef})`
                    }];
                    result.executionTimeMs = Date.now() - startTime;
                    return result;
                }
            }

            // Get target class
            const TargetClass = this.getClass(scenario.targetClass);
            if (!TargetClass) {
                throw new Error(`Class not registered: ${scenario.targetClass}`);
            }

            // Create instance (implementation depends on class type)
            const instance = await this.createInstance(
                TargetClass,
                scenario,
                credentials
            );

            // Execute target method
            const method = (instance as Record<string, unknown>)[scenario.targetMethod];
            if (typeof method !== 'function') {
                throw new Error(`Method not found: ${scenario.targetMethod}`);
            }

            const actualResult = await (method as Function).call(
                instance,
                ...Object.values(scenario.input.parameters)
            );

            result.actualResult = actualResult;

            // Validate result
            const validationDetails = this.validateResult(
                actualResult,
                scenario.expected,
                scenario.validation
            );

            result.validationDetails = validationDetails;
            result.passed = validationDetails.every(v => v.passed);

        } catch (error) {
            result.error = error as Error;

            // Check if this is an expected error scenario
            if (scenario.expected.success === false && scenario.expected.errorCode) {
                result.passed = this.validateError(error as Error, scenario.expected);
            }
        }

        result.executionTimeMs = Date.now() - startTime;
        return result;
    }

    /**
     * Executes all scenarios from a file.
     */
    public async runScenarioFile(
        filePath: string,
        options?: {
            category?: string;
            tags?: string[];
            enabledOnly?: boolean;
        }
    ): Promise<TestExecutionResult[]> {
        const scenarioFile = this.loadScenarioFile(filePath);
        let scenarios = scenarioFile.scenarios;

        if (options) {
            scenarios = this.filterScenarios(scenarios, options);
        }

        const results: TestExecutionResult[] = [];
        for (const scenario of scenarios) {
            const result = await this.executeScenario(scenario);
            results.push(result);
        }

        return results;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Instance Creation
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Creates an instance of the target class.
     * Override this method to customize instance creation for specific classes.
     */
    protected async createInstance(
        TargetClass: new (...args: unknown[]) => unknown,
        scenario: TestScenario,
        credentials?: CredentialSet
    ): Promise<unknown> {
        // Default implementation - can be overridden
        if (credentials) {
            return new TargetClass(credentials.apiKey, credentials.apiSecret, {
                baseUrl: this.getBaseUrl(scenario.environment.provider, scenario.environment.network)
            });
        }
        return new TargetClass();
    }

    /**
     * Gets base URL for provider and network.
     */
    protected getBaseUrl(provider: string, network: string): string {
        const urls: Record<string, Record<string, string>> = {
            binance: {
                TESTNET: 'testnet.binancefuture.com',
                MAINNET: 'fapi.binance.com'
            },
            deribit: {
                TESTNET: 'test.deribit.com',
                MAINNET: 'www.deribit.com'
            }
        };
        return urls[provider]?.[network] || '';
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Validation
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Validates actual result against expected result.
     */
    protected validateResult(
        actual: unknown,
        expected: ExpectedResult,
        config?: ValidationConfig
    ): ValidationDetail[] {
        const details: ValidationDetail[] = [];

        // Validate success flag
        const actualSuccess = this.isSuccessResult(actual);
        details.push({
            field: 'success',
            expected: expected.success,
            actual: actualSuccess,
            passed: expected.success === actualSuccess
        });

        // Validate result data if expected
        if (expected.resultData && actualSuccess) {
            const actualData = this.extractResultData(actual);
            for (const [key, expectedValue] of Object.entries(expected.resultData)) {
                // Skip ignored fields
                if (config?.ignoreFields?.includes(key)) continue;

                const actualValue = (actualData as Record<string, unknown>)?.[key];
                const passed = this.compareValues(actualValue, expectedValue, config);

                details.push({
                    field: key,
                    expected: expectedValue,
                    actual: actualValue,
                    passed
                });
            }
        }

        return details;
    }

    /**
     * Validates an error against expected error.
     */
    protected validateError(error: Error, expected: ExpectedResult): boolean {
        if (expected.errorCode) {
            const errorCode = (error as any).code || this.extractErrorCode(error.message);
            if (errorCode !== expected.errorCode) return false;
        }

        if (expected.errorMessage) {
            const pattern = new RegExp(expected.errorMessage);
            if (!pattern.test(error.message)) return false;
        }

        return true;
    }

    /**
     * Checks if result indicates success.
     */
    protected isSuccessResult(result: unknown): boolean {
        if (result && typeof result === 'object') {
            return (result as { success?: boolean }).success === true;
        }
        return result !== null && result !== undefined;
    }

    /**
     * Extracts data from result object.
     */
    protected extractResultData(result: unknown): unknown {
        if (result && typeof result === 'object') {
            return (result as { data?: unknown }).data || result;
        }
        return result;
    }

    /**
     * Extracts error code from error message.
     */
    protected extractErrorCode(message: string): string | undefined {
        const match = message.match(/\[(-?\d+)\]/);
        return match ? match[1] : undefined;
    }

    /**
     * Compares two values with optional tolerance.
     */
    protected compareValues(
        actual: unknown,
        expected: unknown,
        config?: ValidationConfig
    ): boolean {
        if (typeof actual === 'number' && typeof expected === 'number') {
            const tolerance = config?.numericTolerance || 0.0001;
            return Math.abs(actual - expected) <= tolerance;
        }

        if (config?.strictMatch) {
            return JSON.stringify(actual) === JSON.stringify(expected);
        }

        return actual === expected;
    }
}
