/**
 * @fileoverview Live Test Execution Script
 * @module Scripts/RunLiveTests
 * 
 * Executes test scenarios against real Binance TESTNET with provided credentials.
 */

import { BinanceTestRunner, createBinanceTestRunner } from '../Binance/BinanceTestRunner';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_CATEGORIES = {
    ACCOUNT: ['account.scenarios.json'],
    ORDERS: ['orders.scenarios.json'],
    POSITIONS: ['positions.scenarios.json'],
    MARKET_DATA: ['market-data.scenarios.json'],
    ALGO_ORDERS: ['algo-orders.scenarios.json'],
    ERRORS: ['errors.scenarios.json'],
    INTEGRATION: ['integration.scenarios.json'],
    RATE_LIMIT: ['rate-limit.scenarios.json'],
    STREAMING: ['streaming.scenarios.json'],
    ALL: [] // Will use all from runner
};

// ═══════════════════════════════════════════════════════════════════════════════
// Live Test Runner
// ═══════════════════════════════════════════════════════════════════════════════

async function runLiveTests(category: keyof typeof TEST_CATEGORIES = 'ALL') {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`🚀 Binance TESTNET Live Test Execution`);
    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log(`📁 Category: ${category}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    const runner = createBinanceTestRunner();
    const config = runner.getConfig();

    console.log('📡 Configuration:');
    console.log(`   Network: ${config.network}`);
    console.log(`   API Key: ${config.apiKey.substring(0, 8)}...`);
    console.log(`   Base URL: ${config.baseUrl}\n`);

    // Pre-fetch live prices
    console.log('💹 Pre-fetching live prices...');
    await runner.prefetchPrices();
    console.log('✅ Prices cached\n');

    // Determine which scenarios to run
    const scenarioFiles = category === 'ALL'
        ? runner.getScenarioFiles()
        : TEST_CATEGORIES[category];

    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const file of scenarioFiles) {
        console.log(`\n📂 Loading: ${file}`);
        console.log('─'.repeat(60));

        try {
            const scenarios = runner.loadScenarios(file);

            for (const scenario of scenarios.scenarios) {
                const prefix = scenario.enabled === false ? '⏭️ SKIP' : '🔄 RUN ';

                if (scenario.enabled === false) {
                    console.log(`${prefix} [${scenario.id}] ${scenario.name}`);
                    totalSkipped++;
                    continue;
                }

                console.log(`${prefix} [${scenario.id}] ${scenario.name}`);

                const startTime = Date.now();
                const result = await runner.getEngine().executeScenario(scenario);
                const duration = Date.now() - startTime;

                if (result.passed) {
                    console.log(`   ✅ PASSED (${duration}ms)`);
                    if (result.rateLimit) {
                        console.log(`   📊 Rate Limit: Weight=${result.rateLimit.usedWeight}/${result.rateLimit.maxWeight}`);
                    }
                    totalPassed++;
                } else {
                    console.log(`   ❌ FAILED (${duration}ms)`);
                    console.log(`   Error: ${result.error?.message || 'Unknown'}`);
                    if (result.validationDetails) {
                        result.validationDetails.forEach(v => {
                            if (!v.passed) {
                                console.log(`   - ${v.field}: expected ${v.expected}, got ${v.actual}`);
                            }
                        });
                    }
                    totalFailed++;
                }
            }
        } catch (error) {
            console.error(`   ⚠️ Error loading ${file}:`, error);
        }
    }

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   ✅ Passed:  ${totalPassed}`);
    console.log(`   ❌ Failed:  ${totalFailed}`);
    console.log(`   ⏭️ Skipped: ${totalSkipped}`);
    console.log(`   📈 Total:   ${totalPassed + totalFailed + totalSkipped}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    return {
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        total: totalPassed + totalFailed + totalSkipped
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI Execution
// ═══════════════════════════════════════════════════════════════════════════════

const arg = process.argv[2]?.toUpperCase() as keyof typeof TEST_CATEGORIES || 'ALL';

if (arg && !TEST_CATEGORIES[arg]) {
    console.error(`Unknown category: ${arg}`);
    console.error(`Available: ${Object.keys(TEST_CATEGORIES).join(', ')}`);
    process.exit(1);
}

runLiveTests(arg)
    .then(result => {
        process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
