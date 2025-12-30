/**
 * @fileoverview Reflection Test Engine
 * @module Engine/ReflectionTestEngine
 * 
 * Enhanced test engine that uses reflection to instantiate real provider classes
 * based on JSON test configuration. Handles methods, properties, and events.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';
import {
    TestScenario,
    TestScenarioFile,
    SetupStep,
    CleanupStep,
    ExpectedEvent,
    ExpectedResult,
    EventSourceConfig
} from './TestScenario';
import { EventListenerService } from './Services/EventListenerService';
import { resolveDynamicParams } from '../Helpers/DynamicOrderParams';
import { BinanceRestClient } from 'ark-alliance-trading-providers-lib/Binance';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProviderConfig {
    apiKey: string;
    apiSecret: string;
    baseUrl: string;
    wsUrl: string;
    network: 'TESTNET' | 'MAINNET';
}

export interface ClassFactory {
    className: string;
    factory: (config: ProviderConfig, dependencies?: Map<string, any>) => any;
    dependencies?: string[];
}

export interface ExecutionResult {
    scenarioId: string;
    scenarioName: string;
    passed: boolean;
    actualResult?: any;
    error?: Error;
    executionTimeMs: number;
    validationDetails: ValidationDetail[];
    setupResults?: StepResult[];
    cleanupResults?: StepResult[];
    eventResults?: EventResult[];
    rateLimit?: RateLimitInfo;
}

export interface ValidationDetail {
    field: string;
    expected: any;
    actual: any;
    passed: boolean;
    message?: string;
}

export interface StepResult {
    stepId: string;
    success: boolean;
    result?: any;
    error?: string;
}

export interface EventResult {
    eventName: string;
    received: boolean;
    data?: any;
    timeoutMs: number;
}

export interface RateLimitInfo {
    usedWeight: number;
    maxWeight: number;
    orderCount?: number;
    maxOrders?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Reflection Test Engine
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Service factory for event listener services.
 */
export interface ServiceFactory {
    className: string;
    factory: (config: ProviderConfig) => EventListenerService;
}

export class ReflectionTestEngine {
    private config: ProviderConfig;
    private classFactories: Map<string, ClassFactory> = new Map();
    private serviceFactories: Map<string, ServiceFactory> = new Map();
    private instances: Map<string, any> = new Map();
    private context: Map<string, any> = new Map();
    private eventListeners: Map<string, EventEmitter> = new Map();
    private activeEventService: EventListenerService | null = null;

    constructor(config: ProviderConfig) {
        this.config = config;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Class Registration
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Registers a class factory for dynamic instantiation.
     */
    public registerClass(factory: ClassFactory): void {
        this.classFactories.set(factory.className, factory);
    }

    /**
     * Registers a service factory for event listener services.
     */
    public registerService(factory: ServiceFactory): void {
        this.serviceFactories.set(factory.className, factory);
    }

    /**
     * Gets or creates an event listener service instance.
     */
    public getEventService(className: string): EventListenerService {
        const factory = this.serviceFactories.get(className);
        if (!factory) {
            throw new Error(`Service not registered: ${className}`);
        }
        return factory.factory(this.config);
    }

    /**
     * Gets or creates an instance of a registered class.
     */
    public getInstance<T>(className: string): T {
        if (this.instances.has(className)) {
            return this.instances.get(className) as T;
        }

        const factory = this.classFactories.get(className);
        if (!factory) {
            throw new Error(`Class not registered: ${className}`);
        }

        // Resolve dependencies first
        const deps = new Map<string, any>();
        if (factory.dependencies) {
            for (const dep of factory.dependencies) {
                deps.set(dep, this.getInstance(dep));
            }
        }

        const instance = factory.factory(this.config, deps);
        this.instances.set(className, instance);

        // Track EventEmitter instances for event listening
        if (instance instanceof EventEmitter) {
            this.eventListeners.set(className, instance);
        }

        return instance as T;
    }

    /**
     * Gets class metadata (methods, properties) via reflection.
     */
    public getClassMetadata(className: string): { methods: string[]; properties: string[] } {
        const instance = this.getInstance<any>(className);
        const prototype = Object.getPrototypeOf(instance);

        const methods = Object.getOwnPropertyNames(prototype)
            .filter(name => name !== 'constructor' && typeof instance[name] === 'function');

        const properties = Object.keys(instance as object);

        return { methods, properties };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario Execution
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Executes a complete test scenario including setup, main test, and cleanup.
     */
    public async executeScenario(scenario: TestScenario): Promise<ExecutionResult> {
        const startTime = Date.now();
        const result: ExecutionResult = {
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            passed: false,
            executionTimeMs: 0,
            validationDetails: []
        };

        // Clear context for new scenario
        this.context.clear();

        try {
            // Check if disabled
            if (scenario.enabled === false) {
                result.passed = true;
                result.validationDetails = [{
                    field: 'enabled',
                    expected: true,
                    actual: false,
                    passed: true,
                    message: 'Skipped (disabled)'
                }];
                result.executionTimeMs = Date.now() - startTime;
                return result;
            }

            // Check if requires live connection but no valid credentials
            if (scenario.environment?.requiresLiveConnection) {
                const hasCredentials = this.hasValidCredentials();
                if (!hasCredentials) {
                    result.passed = true;
                    result.validationDetails = [{
                        field: 'requiresLiveConnection',
                        expected: 'valid credentials',
                        actual: 'no credentials available',
                        passed: true,
                        message: 'Skipped (requires live connection, no credentials in CI)'
                    }];
                    result.executionTimeMs = Date.now() - startTime;
                    console.log(`[TestEngine] Skipping ${scenario.name} - requires live connection`);
                    return result;
                }
            }

            // Execute setup steps
            if (scenario.setup && scenario.setup.length > 0) {
                result.setupResults = await this.executeSetupSteps(scenario.setup);
                const setupFailed = result.setupResults.some(r => !r.success &&
                    scenario.setup?.find(s => s.id === r.stepId)?.required);
                if (setupFailed) {
                    result.error = new Error('Required setup step failed');
                    result.executionTimeMs = Date.now() - startTime;
                    return result;
                }
            }

            // Connect event source service if specified
            if (scenario.eventSource) {
                try {
                    this.activeEventService = this.getEventService(scenario.eventSource.serviceClass);
                    if (scenario.eventSource.config?.connectOnStart !== false) {
                        await this.activeEventService.start();
                        console.log(`[TestEngine] Connected to ${scenario.eventSource.serviceClass}`);
                    }
                } catch (err) {
                    console.warn(`[TestEngine] Failed to connect event service:`, err);
                    // Continue without event service
                }
            }

            // Setup event listeners if expected
            const eventPromises: Promise<EventResult>[] = [];
            if (scenario.expected.events) {
                // Use eventSource service if available, otherwise fall back to targetClass
                const eventSourceName = this.activeEventService
                    ? scenario.eventSource!.serviceClass
                    : scenario.targetClass;

                for (const expectedEvent of scenario.expected.events) {
                    eventPromises.push(this.waitForEvent(eventSourceName, expectedEvent));
                }
            }

            // Execute main test
            const mainResult = await this.invokeMethod(
                scenario.targetClass,
                scenario.targetMethod,
                await this.resolveDynamicParametersForClient(
                    scenario.targetClass,
                    this.resolveParameters(scenario.input.parameters)
                )
            );

            result.actualResult = mainResult;

            // Validate main result
            result.validationDetails = this.validateResult(mainResult, scenario.expected);

            // Wait for events if any
            if (eventPromises.length > 0) {
                result.eventResults = await Promise.all(eventPromises);
                const eventsFailed = result.eventResults.some(
                    e => !e.received && scenario.expected.events?.find(
                        ev => ev.eventName === e.eventName
                    )?.required
                );
                if (eventsFailed) {
                    result.validationDetails.push({
                        field: 'events',
                        expected: 'all required events received',
                        actual: 'some events missing',
                        passed: false,
                        message: 'Required event not received'
                    });
                }
            }

            // Extract rate limit info if available
            if (mainResult && typeof mainResult === 'object') {
                const rateLimit = (mainResult as any).rateLimit;
                if (rateLimit) {
                    result.rateLimit = rateLimit;
                }
            }

            result.passed = result.validationDetails.every(v => v.passed);

        } catch (error) {
            result.error = error as Error;

            // Check if this is expected error
            if (scenario.expected.success === false && scenario.expected.errorCode) {
                result.passed = this.validateErrorResult(error as Error, scenario.expected);
                if (result.passed) {
                    result.validationDetails.push({
                        field: 'error',
                        expected: scenario.expected.errorCode,
                        actual: (error as any).code || 'matched',
                        passed: true,
                        message: 'Expected error received'
                    });
                }
            }
        } finally {
            // Execute cleanup steps
            if (scenario.cleanup && scenario.cleanup.length > 0) {
                result.cleanupResults = await this.executeCleanupSteps(scenario.cleanup);
            }

            // Disconnect event source service if connected
            if (this.activeEventService && scenario.eventSource?.config?.disconnectOnEnd !== false) {
                try {
                    await this.activeEventService.stop();
                    console.log(`[TestEngine] Disconnected from ${scenario.eventSource?.serviceClass}`);
                } catch (err) {
                    console.warn(`[TestEngine] Failed to disconnect event service:`, err);
                }
                this.activeEventService = null;
            }
        }

        result.executionTimeMs = Date.now() - startTime;
        return result;
    }

    /**
     * Invokes a method on a class instance.
     * 
     * @remarks
     * Parameter passing logic:
     * - If method takes 0 params: call with no args
     * - If method takes 1 param and input is object with multiple keys: pass as single object
     * - If method takes multiple params: spread object values
     */
    public async invokeMethod(
        className: string,
        methodName: string,
        params: Record<string, any>
    ): Promise<any> {
        const instance = this.getInstance<any>(className);
        const method = instance[methodName];

        if (typeof method !== 'function') {
            throw new Error(`Method '${methodName}' not found on ${className}`);
        }

        const paramKeys = Object.keys(params);
        const paramCount = method.length; // Number of formal parameters

        if (paramKeys.length === 0) {
            // No params provided
            return await method.call(instance);
        } else if (paramCount === 1) {
            // Method expects single param - pass entire object OR single value
            if (paramKeys.length === 1) {
                // Single key - pass the value directly
                return await method.call(instance, params[paramKeys[0]]);
            } else {
                // Multiple keys - pass as object (method expects object param)
                return await method.call(instance, params);
            }
        } else if (paramCount > 1 && paramKeys.length >= paramCount) {
            // Method expects multiple positional params - spread values in order
            const args = paramKeys.map(k => params[k]);
            return await method.call(instance, ...args);
        } else {
            // Default: pass as object for flexibility
            return await method.call(instance, params);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Setup & Cleanup
    // ─────────────────────────────────────────────────────────────────────────

    private async executeSetupSteps(steps: SetupStep[]): Promise<StepResult[]> {
        const results: StepResult[] = [];

        for (const step of steps) {
            try {
                const params = this.resolveParameters(step.parameters);
                const result = await this.invokeMethod(step.targetClass, step.targetMethod, params);

                // Store result for later reference
                if (step.storeResultAs) {
                    this.context.set(step.storeResultAs, result?.data || result);
                }

                results.push({
                    stepId: step.id,
                    success: true,
                    result
                });
            } catch (error) {
                results.push({
                    stepId: step.id,
                    success: false,
                    error: (error as Error).message
                });

                if (step.required) {
                    break; // Stop if required step fails
                }
            }
        }

        return results;
    }

    private async executeCleanupSteps(steps: CleanupStep[]): Promise<StepResult[]> {
        const results: StepResult[] = [];

        for (const step of steps) {
            try {
                const params = this.resolveParameters(step.parameters);
                const result = await this.invokeMethod(step.targetClass, step.targetMethod, params);

                results.push({
                    stepId: step.id,
                    success: true,
                    result
                });
            } catch (error) {
                results.push({
                    stepId: step.id,
                    success: !step.continueOnError ? false : true,
                    error: (error as Error).message
                });

                if (!step.continueOnError) {
                    break;
                }
            }
        }

        return results;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Event Handling
    // ─────────────────────────────────────────────────────────────────────────

    private waitForEvent(className: string, expected: ExpectedEvent): Promise<EventResult> {
        // Use activeEventService if available, otherwise try eventListeners map
        const emitter = this.activeEventService || this.eventListeners.get(className);

        if (!emitter) {
            return Promise.resolve({
                eventName: expected.eventName,
                received: false,
                timeoutMs: expected.timeoutMs || 5000
            });
        }

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve({
                    eventName: expected.eventName,
                    received: false,
                    timeoutMs: expected.timeoutMs || 5000
                });
            }, expected.timeoutMs || 5000);

            emitter.once(expected.eventName, (data: any) => {
                clearTimeout(timeout);
                resolve({
                    eventName: expected.eventName,
                    received: true,
                    data,
                    timeoutMs: expected.timeoutMs || 5000
                });
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Parameter Resolution
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Resolves parameter values, replacing context references ($var.field).
     */
    private resolveParameters(params: Record<string, any>): Record<string, any> {
        const resolved: Record<string, any> = {};

        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'string' && value.startsWith('$')) {
                resolved[key] = this.resolveContextValue(value);
            } else if (typeof value === 'string' && value.includes('$')) {
                // Expression like "$price.price * 0.85"
                resolved[key] = this.evaluateExpression(value);
            } else {
                resolved[key] = value;
            }
        }

        return resolved;
    }

    /**
     * Resolves dynamic parameters using provider-specific helpers if applicable
     */
    private async resolveDynamicParametersForClient(
        className: string,
        params: Record<string, any>
    ): Promise<Record<string, any>> {
        const instance = this.getInstance(className);

        // Check if className matches BinanceRestClient (use registered className, not constructor.name)
        if (instance && className === 'BinanceRestClient') {
            try {
                console.log('[DynamicParams] Resolving for BinanceRestClient:', Object.keys(params));
                const resolved = await resolveDynamicParams(instance as BinanceRestClient, params);
                console.log('[DynamicParams] Resolved params:', resolved);
                return resolved;
            } catch (error) {
                console.warn(`Failed to resolve dynamic params for ${className}:`, error);
                return params; // Fallback to original
            }
        }

        return params;
    }

    private resolveContextValue(ref: string): any {
        const parts = ref.substring(1).split('.');
        let value = this.context.get(parts[0]);

        for (let i = 1; i < parts.length && value !== undefined; i++) {
            value = value[parts[i]];
        }

        return value;
    }

    private evaluateExpression(expr: string): any {
        // Replace $var.field with actual values
        const resolved = expr.replace(/\$(\w+)\.(\w+)/g, (_, varName, field) => {
            const value = this.context.get(varName)?.[field];
            return value !== undefined ? String(value) : '0';
        });

        try {
            // Safe evaluation of simple math expressions
            return Function(`"use strict"; return (${resolved})`)();
        } catch {
            return resolved;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────────────────────────────────

    private validateResult(actual: any, expected: ExpectedResult): ValidationDetail[] {
        const details: ValidationDetail[] = [];

        // Check for allowed error codes (idempotent APIs like setMarginType)
        const allowedErrorCodes = (expected as any).allowErrorCodes || [];
        const actualErrorCode = actual?.error?.details?.binanceCode;
        const isAllowedError = allowedErrorCodes.includes(actualErrorCode);

        // Check success status
        const isSuccess = actual && (actual.success === true || actual.isSuccess === true || !actual.error);
        const passed = expected.success === isSuccess || isAllowedError;

        details.push({
            field: 'success',
            expected: expected.success,
            actual: isSuccess || isAllowedError,
            passed,
            message: isAllowedError ? `Allowed error code ${actualErrorCode}` : undefined
        });

        // Validate result data fields
        if (expected.resultData && isSuccess) {
            const data = actual?.data || actual;
            for (const [key, expectedValue] of Object.entries(expected.resultData)) {
                const actualValue = data?.[key];
                details.push({
                    field: key,
                    expected: expectedValue,
                    actual: actualValue,
                    passed: this.compareValues(actualValue, expectedValue)
                });
            }
        }

        return details;
    }

    private validateErrorResult(error: Error, expected: ExpectedResult): boolean {
        if (expected.errorCode) {
            const code = (error as any).code?.toString() || '';
            const message = error.message || '';
            if (!code.includes(expected.errorCode) && !message.includes(expected.errorCode)) {
                return false;
            }
        }

        if (expected.errorMessage) {
            if (!error.message.toLowerCase().includes(expected.errorMessage.toLowerCase())) {
                return false;
            }
        }

        return true;
    }

    private compareValues(actual: any, expected: any): boolean {
        if (actual === expected) return true;
        if (typeof actual === 'number' && typeof expected === 'number') {
            return Math.abs(actual - expected) < 0.0001;
        }
        return JSON.stringify(actual) === JSON.stringify(expected);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Utilities
    // ─────────────────────────────────────────────────────────────────────────

    public clearInstances(): void {
        this.instances.clear();
        this.context.clear();
    }

    public getContext(): Map<string, any> {
        return this.context;
    }

    /**
     * Checks if valid API credentials are available.
     * Used to skip live connection tests in CI environments.
     */
    private hasValidCredentials(): boolean {
        // Check config has non-placeholder credentials
        const hasConfigCreds = this.config.apiKey
            && this.config.apiKey.length > 10
            && !this.config.apiKey.includes('YOUR_')
            && !this.config.apiKey.includes('placeholder');

        // Also check environment variables
        const hasEnvCreds = !!(
            process.env.BINANCE_TESTNET_API_KEY
            && process.env.BINANCE_TESTNET_API_SECRET
        );

        return hasConfigCreds || hasEnvCreds;
    }
}
