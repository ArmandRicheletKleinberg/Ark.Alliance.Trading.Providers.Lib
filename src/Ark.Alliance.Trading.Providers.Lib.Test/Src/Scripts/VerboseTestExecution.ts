/**
 * @fileoverview Verbose Test Execution with Detailed Error Logging
 * @module Scripts/VerboseTestExecution
 * 
 * Runs tests with comprehensive logging to capture:
 * - Full API responses (success and error)
 * - Request parameters
 * - Error codes and messages
 * - Rate limit information
 */

import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { ReflectionTestEngine, ProviderConfig, ExecutionResult } from '../Engine/ReflectionTestEngine';
import { TestScenarioFile, TestScenario } from '../Engine/TestScenario';
import { registerBinanceClasses } from '../Binance/BinanceClassFactory';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface DetailedErrorLog {
    scenarioId: string;
    scenarioName: string;
    category: string;
    targetClass: string;
    targetMethod: string;
    inputParameters: any;
    errorType: string;
    errorMessage: string;
    apiErrorCode?: number;
    apiErrorMsg?: string;
    fullResponse?: any;
    recommendation?: string;
}

interface TestReport {
    timestamp: string;
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        passRate: string;
    };
    errors: DetailedErrorLog[];
    categorizedErrors: Record<string, DetailedErrorLog[]>;
}

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
// Error Analysis
// ═══════════════════════════════════════════════════════════════════════════════

function analyzeError(scenario: TestScenario, result: ExecutionResult): DetailedErrorLog {
    const log: DetailedErrorLog = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        category: scenario.category || 'unknown',
        targetClass: scenario.targetClass,
        targetMethod: scenario.targetMethod,
        inputParameters: scenario.input?.parameters || {},
        errorType: 'UNKNOWN',
        errorMessage: ''
    };

    // Analyze error type
    if (result.error) {
        const msg = result.error.message;
        log.errorMessage = msg;

        if (msg.includes('Method') && msg.includes('not found')) {
            log.errorType = 'MISSING_METHOD';
            log.recommendation = `Add method '${scenario.targetMethod}' to ${scenario.targetClass}`;
        } else if (msg.includes('unescaped characters')) {
            log.errorType = 'URL_ENCODING';
            log.recommendation = 'Fix parameter encoding in signed request methods';
        } else if (msg.includes('undefined')) {
            log.errorType = 'UNDEFINED_PARAMETER';
            log.recommendation = 'Check scenario input parameters or method parameter handling';
        } else if (msg.includes('Required setup step failed')) {
            log.errorType = 'SETUP_FAILURE';
            log.recommendation = 'Fix prerequisite step execution';
        } else {
            log.errorType = 'RUNTIME_ERROR';
        }
    } else if (result.actualResult && !result.passed) {
        // API returned but test failed
        log.errorType = 'API_FAILURE';

        // Check if it's a Binance API error
        if (result.actualResult.isSuccess === false || result.actualResult.success === false) {
            log.apiErrorCode = result.actualResult.code || result.actualResult.data?.code;
            log.apiErrorMsg = result.actualResult.message || result.actualResult.data?.msg;
            log.errorMessage = `API Error: ${log.apiErrorCode} - ${log.apiErrorMsg}`;

            // Common Binance error codes
            switch (log.apiErrorCode) {
                case -1021:
                    log.recommendation = 'Timestamp outside recvWindow - sync server time';
                    break;
                case -1102:
                    log.recommendation = 'Mandatory parameter missing - check input parameters';
                    break;
                case -1111:
                    log.recommendation = 'Precision over maximum - check quantity/price decimals';
                    break;
                case -1116:
                    log.recommendation = 'Invalid order type - check order type parameter';
                    break;
                case -2010:
                    log.recommendation = 'Insufficient balance - fund TESTNET account';
                    break;
                case -2015:
                    log.recommendation = 'Invalid API key - check credentials';
                    break;
                case -4001:
                    log.recommendation = 'Price changes - use current market price';
                    break;
                case -4003:
                    log.recommendation = 'Quantity less than minimum - increase order size';
                    break;
                case -4014:
                    log.recommendation = 'Price not increased by tick size';
                    break;
                case -4015:
                    log.recommendation = 'Client order id duplicate';
                    break;
                default:
                    log.recommendation = `Check Binance API docs for error code ${log.apiErrorCode}`;
            }
        } else {
            // Validation mismatch
            log.errorType = 'VALIDATION_MISMATCH';
            const failedValidations = result.validationDetails.filter(v => !v.passed);
            log.errorMessage = failedValidations.map(v =>
                `${v.field}: expected ${JSON.stringify(v.expected)}, got ${JSON.stringify(v.actual)}`
            ).join('; ');
            log.recommendation = 'Update scenario expected values or fix response parsing';
        }

        log.fullResponse = result.actualResult;
    }

    return log;
}

function categorizeErrors(errors: DetailedErrorLog[]): Record<string, DetailedErrorLog[]> {
    const categories: Record<string, DetailedErrorLog[]> = {};

    for (const error of errors) {
        if (!categories[error.errorType]) {
            categories[error.errorType] = [];
        }
        categories[error.errorType].push(error);
    }

    return categories;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Execution
// ═══════════════════════════════════════════════════════════════════════════════

async function runVerboseTests() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 VERBOSE TEST EXECUTION - Detailed Error Logging');
    console.log(`📅 ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    const config = loadConfig();
    const engine = new ReflectionTestEngine(config);
    registerBinanceClasses(engine);

    const scenariosPath = join(__dirname, '..', 'Scenarios', 'Binance');
    const scenarioFiles = [
        'account.scenarios.json',
        'market-data.scenarios.json',
        'orders.scenarios.json',
        'positions.scenarios.json'
    ];

    const errors: DetailedErrorLog[] = [];
    let passed = 0, failed = 0, skipped = 0;

    for (const file of scenarioFiles) {
        try {
            const filePath = join(scenariosPath, file);
            const content = readFileSync(filePath, 'utf-8');
            const scenarioFile: TestScenarioFile = JSON.parse(content);

            console.log(`\n📂 ${file}`);
            console.log('─'.repeat(70));

            for (const scenario of scenarioFile.scenarios) {
                if (!scenario.enabled) {
                    skipped++;
                    continue;
                }

                console.log(`\n🔄 [${scenario.id}] ${scenario.name}`);
                console.log(`   Class: ${scenario.targetClass}.${scenario.targetMethod}`);
                console.log(`   Params: ${JSON.stringify(scenario.input?.parameters || {})}`);

                try {
                    const result = await engine.executeScenario(scenario);

                    if (result.passed) {
                        console.log(`   ✅ PASSED (${result.executionTimeMs}ms)`);
                        passed++;
                    } else {
                        console.log(`   ❌ FAILED (${result.executionTimeMs}ms)`);
                        const errorLog = analyzeError(scenario, result);
                        errors.push(errorLog);
                        failed++;

                        // Log detailed error info
                        console.log(`   📛 Type: ${errorLog.errorType}`);
                        console.log(`   📛 Message: ${errorLog.errorMessage}`);
                        if (errorLog.apiErrorCode) {
                            console.log(`   📛 API Code: ${errorLog.apiErrorCode}`);
                        }
                        if (errorLog.recommendation) {
                            console.log(`   💡 Fix: ${errorLog.recommendation}`);
                        }
                        if (errorLog.fullResponse) {
                            console.log(`   📦 Response: ${JSON.stringify(errorLog.fullResponse).substring(0, 200)}...`);
                        }
                    }

                    if (result.rateLimit) {
                        console.log(`   📊 Weight: ${result.rateLimit.usedWeight}`);
                    }
                } catch (error: any) {
                    console.log(`   ❌ EXCEPTION: ${error.message}`);
                    errors.push({
                        scenarioId: scenario.id,
                        scenarioName: scenario.name,
                        category: scenario.category || 'unknown',
                        targetClass: scenario.targetClass,
                        targetMethod: scenario.targetMethod,
                        inputParameters: scenario.input?.parameters || {},
                        errorType: 'EXCEPTION',
                        errorMessage: error.message,
                        recommendation: 'Check stack trace for root cause'
                    });
                    failed++;
                }
            }
        } catch (error: any) {
            console.error(`\n❌ Failed to load ${file}: ${error.message}`);
        }
    }

    // Generate report
    const report: TestReport = {
        timestamp: new Date().toISOString(),
        summary: {
            total: passed + failed + skipped,
            passed,
            failed,
            skipped,
            passRate: `${Math.round((passed / (passed + failed)) * 100)}%`
        },
        errors,
        categorizedErrors: categorizeErrors(errors)
    };

    // Save report to file
    const reportPath = join(__dirname, '..', '..', 'error-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Print summary by error type
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 ERROR SUMMARY BY TYPE');
    console.log('═══════════════════════════════════════════════════════════════');

    for (const [type, typeErrors] of Object.entries(report.categorizedErrors)) {
        console.log(`\n📛 ${type}: ${typeErrors.length} errors`);
        for (const err of typeErrors.slice(0, 3)) {
            console.log(`   - [${err.scenarioId}] ${err.scenarioName}`);
            if (err.recommendation) {
                console.log(`     Fix: ${err.recommendation}`);
            }
        }
        if (typeErrors.length > 3) {
            console.log(`   ... and ${typeErrors.length - 3} more`);
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 FINAL SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   ✅ Passed:  ${passed}`);
    console.log(`   ❌ Failed:  ${failed}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📈 Total:   ${passed + failed + skipped}`);
    console.log(`   📊 Rate:    ${report.summary.passRate}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    return report;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Execute
// ═══════════════════════════════════════════════════════════════════════════════

runVerboseTests()
    .then(report => {
        console.log('✅ Verbose test execution complete');
        process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
