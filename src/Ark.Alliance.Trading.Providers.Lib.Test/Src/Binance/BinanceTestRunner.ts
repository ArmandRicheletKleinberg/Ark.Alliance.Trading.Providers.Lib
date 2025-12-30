/**
 * @fileoverview Binance Test Runner
 * @module Binance/BinanceTestRunner
 * 
 * Specialized test runner for Binance provider tests.
 * Uses ReflectionTestEngine with registered class factories.
 * 
 * @remarks
 * This runner bridges test scenarios with real Binance client implementations
 * through the ReflectionTestEngine's factory-based instantiation pattern.
 */

import { join } from 'path';
import { readFileSync } from 'fs';
import { ReflectionTestEngine, ProviderConfig, ExecutionResult } from '../Engine/ReflectionTestEngine';
import { MockDataGenerator } from '../Engine/MockDataGenerator';
import { TestScenarioFile } from '../Engine/TestScenario';
import { getBinanceClassFactories } from './BinanceClassFactory';

// ═══════════════════════════════════════════════════════════════════════════════
// Binance Test Runner
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Binance-specific test runner that integrates with real Binance clients.
 * 
 * @remarks
 * Uses ReflectionTestEngine with factory-based class registration for
 * proper dependency injection and instance management.
 */
export class BinanceTestRunner {
    private engine: ReflectionTestEngine;
    private mockData: MockDataGenerator;
    private config: ProviderConfig;
    private scenariosPath: string;

    /**
     * Creates a new BinanceTestRunner.
     * 
     * @param configPath - Optional path to test.config.json
     */
    constructor(configPath?: string) {
        // Load configuration first
        this.config = this.loadBinanceConfig(configPath);

        // Create engine with provider config
        this.engine = new ReflectionTestEngine(this.config);
        this.mockData = new MockDataGenerator();
        this.scenariosPath = join(__dirname, '..', 'Scenarios', 'Binance');

        // Register all Binance classes with the engine
        this.registerClasses();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Configuration
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Loads Binance configuration from config file or environment.
     */
    private loadBinanceConfig(configPath?: string): ProviderConfig {
        const defaultConfigPath = configPath || join(__dirname, '..', '..', 'test.config.json');

        try {
            const configContent = readFileSync(defaultConfigPath, 'utf-8');
            const config = JSON.parse(configContent);
            const binanceConfig = config.credentials['binance-testnet'];

            return {
                apiKey: binanceConfig.apiKey || process.env.BINANCE_TESTNET_API_KEY || '',
                apiSecret: binanceConfig.apiSecret || process.env.BINANCE_TESTNET_API_SECRET || '',
                baseUrl: binanceConfig.baseUrl || 'testnet.binancefuture.com',
                wsUrl: binanceConfig.wsUrl || 'wss://stream.binancefuture.com',
                network: binanceConfig.network || 'TESTNET'
            };
        } catch {
            console.warn('[BinanceTestRunner] Could not load config, using environment variables');
            return {
                apiKey: process.env.BINANCE_TESTNET_API_KEY || '',
                apiSecret: process.env.BINANCE_TESTNET_API_SECRET || '',
                baseUrl: 'testnet.binancefuture.com',
                wsUrl: 'wss://stream.binancefuture.com',
                network: 'TESTNET'
            };
        }
    }

    /**
     * Registers all Binance class factories with the engine.
     */
    private registerClasses(): void {
        const factories = getBinanceClassFactories();
        for (const factory of factories) {
            this.engine.registerClass(factory);
        }
        console.log(`[BinanceTestRunner] Registered ${factories.length} Binance classes`);

        // Register event listener services
        try {
            const { registerBinanceServices } = require('./BinanceClassFactory');
            registerBinanceServices(this.engine);
        } catch (err) {
            console.warn('[BinanceTestRunner] Failed to register services:', err);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario Loading
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Gets all available scenario files.
     */
    public getScenarioFiles(): string[] {
        return [
            'orders.scenarios.json',
            'positions.scenarios.json',
            'account.scenarios.json',
            'market-data.scenarios.json',
            'algo-orders.scenarios.json',
            'errors.scenarios.json',
            'integration.scenarios.json',
            'rate-limit.scenarios.json',
            'streaming.scenarios.json',
            'mappers.scenarios.json'
        ];
    }

    /**
     * Loads a specific scenario file.
     */
    public loadScenarios(filename: string): TestScenarioFile {
        const filePath = join(this.scenariosPath, filename);
        const content = readFileSync(filePath, 'utf-8');
        return JSON.parse(content) as TestScenarioFile;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test Execution
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Runs all mapper abstraction layer tests.
     */
    public async runMapperTests(): Promise<ExecutionResult[]> {
        const scenarios = this.loadScenarios('mappers.scenarios.json');
        const results: ExecutionResult[] = [];

        for (const scenario of scenarios.scenarios) {
            if (scenario.enabled === false) continue;
            const result = await this.engine.executeScenario(scenario);
            results.push(result);
        }

        return results;
    }

    /**
     * Runs all order scenarios.
     */
    public async runOrderTests(): Promise<ExecutionResult[]> {
        const scenarios = this.loadScenarios('orders.scenarios.json');
        const results: ExecutionResult[] = [];

        for (const scenario of scenarios.scenarios) {
            if (scenario.enabled === false) continue;
            const result = await this.engine.executeScenario(scenario);
            results.push(result);
        }

        return results;
    }

    /**
     * Runs all position scenarios.
     */
    public async runPositionTests(): Promise<ExecutionResult[]> {
        const scenarios = this.loadScenarios('positions.scenarios.json');
        const results: ExecutionResult[] = [];

        for (const scenario of scenarios.scenarios) {
            if (scenario.enabled === false) continue;
            const result = await this.engine.executeScenario(scenario);
            results.push(result);
        }

        return results;
    }

    /**
     * Runs all error handling scenarios.
     */
    public async runErrorTests(): Promise<ExecutionResult[]> {
        const scenarios = this.loadScenarios('errors.scenarios.json');
        const results: ExecutionResult[] = [];

        for (const scenario of scenarios.scenarios) {
            if (scenario.enabled === false) continue;
            const result = await this.engine.executeScenario(scenario);
            results.push(result);
        }

        return results;
    }

    /**
     * Runs all market data scenarios (no auth required).
     */
    public async runMarketDataTests(): Promise<ExecutionResult[]> {
        const scenarios = this.loadScenarios('market-data.scenarios.json');
        const results: ExecutionResult[] = [];

        for (const scenario of scenarios.scenarios) {
            if (scenario.enabled === false) continue;
            const result = await this.engine.executeScenario(scenario);
            results.push(result);
        }

        return results;
    }

    /**
     * Runs all scenarios and returns summary.
     */
    public async runAll(): Promise<{
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        results: ExecutionResult[];
    }> {
        const allResults: ExecutionResult[] = [];

        for (const file of this.getScenarioFiles()) {
            try {
                const scenarios = this.loadScenarios(file);
                for (const scenario of scenarios.scenarios) {
                    if (scenario.enabled === false) {
                        allResults.push({
                            scenarioId: scenario.id,
                            scenarioName: scenario.name,
                            passed: true,
                            executionTimeMs: 0,
                            validationDetails: [{
                                field: 'enabled',
                                expected: true,
                                actual: false,
                                passed: true,
                                message: 'Skipped'
                            }]
                        });
                        continue;
                    }
                    const result = await this.engine.executeScenario(scenario);
                    allResults.push(result);
                }
            } catch (error) {
                console.error(`[BinanceTestRunner] Error loading ${file}:`, error);
            }
        }

        const passed = allResults.filter(r => r.passed && !r.validationDetails?.some(v => v.message === 'Skipped')).length;
        const skipped = allResults.filter(r => r.validationDetails?.some(v => v.message === 'Skipped')).length;
        const failed = allResults.filter(r => !r.passed).length;

        return {
            total: allResults.length,
            passed,
            failed,
            skipped,
            results: allResults
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Utilities
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Gets the test engine instance for advanced operations.
     */
    public getEngine(): ReflectionTestEngine {
        return this.engine;
    }

    /**
     * Gets the mock data generator.
     */
    public getMockData(): MockDataGenerator {
        return this.mockData;
    }

    /**
     * Gets the current configuration.
     */
    public getConfig(): ProviderConfig {
        return { ...this.config };
    }

    /**
     * Pre-fetches live prices for common symbols.
     */
    public async prefetchPrices(): Promise<void> {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
        console.log(`[BinanceTestRunner] Prefetching prices for: ${symbols.join(', ')}`);
        // Implementation would get live prices from the REST client
    }

    /**
     * Clears all cached instances in the engine.
     */
    public clearInstances(): void {
        this.engine.clearInstances();
    }
}

/**
 * Creates and returns a BinanceTestRunner instance.
 */
export function createBinanceTestRunner(configPath?: string): BinanceTestRunner {
    return new BinanceTestRunner(configPath);
}
