/**
 * @fileoverview Execute Live Tests
 * @module Scripts/ExecuteLiveTests
 * 
 * Runs live tests against Binance TESTNET using real provider classes.
 */

import { join } from 'path';
import { readFileSync } from 'fs';
import { ReflectionTestEngine, ProviderConfig } from '../Engine/ReflectionTestEngine';
import { TestScenarioFile } from '../Engine/TestScenario';
import { registerBinanceClasses } from '../Binance/BinanceClassFactory';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

function loadConfig(): ProviderConfig {
    const configPath = join(__dirname, '..', '..', 'test.config.json');
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);
    const binance = config.credentials['binance-testnet'];

    return {
        apiKey: binance.apiKey,
        apiSecret: binance.apiSecret,
        baseUrl: binance.baseUrl || 'testnet.binancefuture.com',
        wsUrl: binance.wsUrl || 'wss://stream.binancefuture.com',
        network: binance.network || 'TESTNET'
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Execution
// ═══════════════════════════════════════════════════════════════════════════════

async function runLiveTests() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🚀 BINANCE TESTNET - Live Tests with Real Provider Classes');
    console.log(`📅 ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    const config = loadConfig();
    console.log(`📡 Base URL: ${config.baseUrl}`);
    console.log(`🔑 API Key: ${config.apiKey.substring(0, 8)}...`);
    console.log(`🌐 Network: ${config.network}`);
    console.log('');

    // Create test engine with configuration
    const engine = new ReflectionTestEngine(config);

    // Register real Binance classes
    registerBinanceClasses(engine);

    // Get category filter from args
    const category = process.argv[2]?.toUpperCase();
    console.log(`📂 Category Filter: ${category || 'ALL'}\n`);

    // Load scenarios
    const scenariosPath = join(__dirname, '..', 'Scenarios', 'Binance');
    const scenarioFiles = [
        'account.scenarios.json',
        'market-data.scenarios.json',
        'orders.scenarios.json',
        'positions.scenarios.json'
    ];

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const file of scenarioFiles) {
        try {
            const filePath = join(scenariosPath, file);
            const content = readFileSync(filePath, 'utf-8');
            const scenarioFile: TestScenarioFile = JSON.parse(content);

            console.log(`\n📂 Loading: ${file}`);
            console.log('─'.repeat(60));

            for (const scenario of scenarioFile.scenarios) {
                // Apply category filter
                if (category && scenario.category?.toUpperCase() !== category) {
                    continue;
                }

                // Skip disabled scenarios
                if (!scenario.enabled) {
                    console.log(`⏭️  SKIP [${scenario.id}] ${scenario.name} (disabled)`);
                    skipped++;
                    continue;
                }

                // Execute scenario
                console.log(`🔄 RUN  [${scenario.id}] ${scenario.name}`);

                try {
                    const result = await engine.executeScenario(scenario);

                    if (result.passed) {
                        console.log(`   ✅ PASSED (${result.executionTimeMs}ms)`);
                        passed++;
                    } else {
                        console.log(`   ❌ FAILED (${result.executionTimeMs}ms)`);
                        if (result.error) {
                            console.log(`      Error: ${result.error.message}`);
                        }
                        result.validationDetails
                            .filter(v => !v.passed)
                            .forEach(v => {
                                console.log(`      ${v.field}: expected ${v.expected}, got ${v.actual}`);
                            });
                        failed++;
                    }

                    // Show rate limit if available
                    if (result.rateLimit) {
                        console.log(`   📊 Weight: ${result.rateLimit.usedWeight}/${result.rateLimit.maxWeight}`);
                    }
                } catch (error: any) {
                    console.log(`   ❌ ERROR: ${error.message}`);
                    failed++;
                }
            }
        } catch (error: any) {
            console.error(`\n❌ Failed to load ${file}: ${error.message}`);
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   ✅ Passed:  ${passed}`);
    console.log(`   ❌ Failed:  ${failed}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📈 Total:   ${passed + failed + skipped}`);
    if (passed + failed > 0) {
        console.log(`   📊 Rate:    ${Math.round((passed / (passed + failed)) * 100)}%`);
    }
    console.log('═══════════════════════════════════════════════════════════════\n');

    return { passed, failed, skipped };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Execute
// ═══════════════════════════════════════════════════════════════════════════════

runLiveTests()
    .then(result => {
        process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
