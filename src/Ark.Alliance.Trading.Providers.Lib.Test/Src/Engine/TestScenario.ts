/**
 * @fileoverview Test Scenario Interfaces
 * @module Engine/TestScenario
 * 
 * Defines the JSON schema for test scenarios.
 * These interfaces enable JSON-driven testing with environment-aware execution.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Environment Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Supported provider types.
 */
export type ProviderType = 'binance' | 'deribit';

/**
 * Network environment types.
 */
export type NetworkType = 'TESTNET' | 'MAINNET';

/**
 * Test scenario categories.
 */
export type ScenarioCategory =
    | 'clients'
    | 'market-data'
    | 'symbol-info'
    | 'orders'
    | 'positions'
    | 'account'
    | 'algo-orders'
    | 'events'
    | 'errors';

// ═══════════════════════════════════════════════════════════════════════════════
// Environment Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Environment configuration for a test scenario.
 */
export interface EnvironmentConfig {
    /** Provider type (binance, deribit) */
    provider: ProviderType;

    /** Network environment (TESTNET, MAINNET) */
    network: NetworkType;

    /** Whether this test requires authentication */
    requiresAuth: boolean;

    /** Reference to credential set ID (e.g., 'binance-testnet-1') */
    credentialRef?: string;

    /**
     * Whether this test requires live connection (WebSocket, API).
     * If true and no valid credentials, test will be skipped in CI.
     */
    requiresLiveConnection?: boolean;
}

/**
 * Credential configuration loaded from environment variables.
 */
export interface CredentialSet {
    /** Unique identifier for this credential set */
    id: string;

    /** Provider type */
    provider: ProviderType;

    /** Network environment */
    network: NetworkType;

    /** API key (loaded from environment variable) */
    apiKey: string;

    /** API secret (loaded from environment variable) */
    apiSecret: string;
}

/**
 * Test configuration file structure.
 */
export interface TestConfig {
    /** Credential environment variable mappings */
    credentials: {
        [id: string]: {
            apiKeyEnv: string;
            apiSecretEnv: string;
        };
    };

    /** Default network environment */
    defaultEnvironment: NetworkType;

    /** Default provider */
    defaultProvider: ProviderType;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mock data configuration for simulating API responses.
 */
export interface MockDataConfig {
    /** Symbol to use for mock data */
    symbol?: string;

    /** Price range for mock data */
    price?: {
        min: number;
        max: number;
        current: number;
    };

    /** Quantity range for mock orders */
    quantity?: {
        min: number;
        max: number;
    };

    /** Account balance for mock account data */
    accountBalance?: number;

    /** Position mock data */
    position?: {
        symbol: string;
        side: 'LONG' | 'SHORT';
        amount: number;
        entryPrice: number;
        leverage: number;
    };
}

/**
 * Time series configuration for price evolution simulation.
 */
export interface TimeSeriesConfig {
    /** Starting price */
    startPrice: number;

    /** Price change pattern */
    pattern: 'linear' | 'sinusoidal' | 'random' | 'step';

    /** Price change range per tick */
    volatility: number;

    /** Number of ticks to simulate */
    ticks: number;

    /** Milliseconds between ticks */
    intervalMs: number;

    /** Direction trend: 1 = up, -1 = down, 0 = neutral */
    trend: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Expected Results
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Expected event emission.
 */
export interface ExpectedEvent {
    /** Event name */
    eventName: string;

    /** Expected data fields (partial match) */
    data?: Record<string, unknown>;

    /** Whether this event is required */
    required: boolean;

    /** Maximum time to wait for event (ms) */
    timeoutMs?: number;
}

/**
 * Expected test results.
 */
export interface ExpectedResult {
    /** Whether the operation should succeed */
    success: boolean;

    /** Expected result data type */
    resultType?: string;

    /** Expected result data fields (partial match) */
    resultData?: Record<string, unknown>;

    /** Expected error code (for error scenarios) */
    errorCode?: string;

    /** Expected error message pattern (regex or substring) */
    errorMessage?: string;

    /** Expected events to be emitted */
    events?: ExpectedEvent[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Validation Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validation configuration for test assertions.
 */
export interface ValidationConfig {
    /** Whether to require exact match of all fields */
    strictMatch?: boolean;

    /** Fields to ignore during comparison */
    ignoreFields?: string[];

    /** Custom validator function names */
    customValidators?: string[];

    /** Numeric tolerance for floating point comparisons */
    numericTolerance?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Scenario
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete test scenario definition.
 */
export interface TestScenario {
    // ─────────────────────────────────────────────────────────────────────────
    // Metadata
    // ─────────────────────────────────────────────────────────────────────────

    /** Unique scenario identifier */
    id: string;

    /** Human-readable scenario name */
    name: string;

    /** Detailed scenario description */
    description: string;

    /** Scenario category */
    category: ScenarioCategory;

    /** Tags for filtering and grouping */
    tags: string[];

    /** Whether this scenario is enabled */
    enabled?: boolean;

    // ─────────────────────────────────────────────────────────────────────────
    // Environment
    // ─────────────────────────────────────────────────────────────────────────

    /** Environment configuration */
    environment: EnvironmentConfig;

    // ─────────────────────────────────────────────────────────────────────────
    // Target
    // ─────────────────────────────────────────────────────────────────────────

    /** Target class name to test */
    targetClass: string;

    /** Target method name to invoke */
    targetMethod: string;

    // ─────────────────────────────────────────────────────────────────────────
    // Input
    // ─────────────────────────────────────────────────────────────────────────

    /** Input configuration */
    input: {
        /** Method parameters */
        parameters: Record<string, unknown>;

        /** Mock data configuration */
        mockData?: MockDataConfig;

        /** Time series simulation config */
        timeSeries?: TimeSeriesConfig;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Expected
    // ─────────────────────────────────────────────────────────────────────────

    /** Expected results */
    expected: ExpectedResult;

    // ─────────────────────────────────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────────────────────────────────

    /** Validation configuration */
    validation?: ValidationConfig;

    // ─────────────────────────────────────────────────────────────────────────
    // Setup & Cleanup
    // ─────────────────────────────────────────────────────────────────────────

    /** 
     * Setup steps to execute before the main test.
     * Used for creating prerequisite state (e.g., opening a position before testing close).
     */
    setup?: SetupStep[];

    /**
     * Cleanup steps to execute after the test.
     * Used for restoring state (e.g., closing positions, canceling orders).
     */
    cleanup?: CleanupStep[];

    // ─────────────────────────────────────────────────────────────────────────
    // Event Source (Optional)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Configuration for event listener service.
     * When specified, the test engine will instantiate the service
     * to capture WebSocket events during test execution.
     */
    eventSource?: EventSourceConfig;
}

/**
 * Event source service configuration for WebSocket event listening.
 */
export interface EventSourceConfig {
    /** Service class name to instantiate (e.g., 'BinanceEventListenerService') */
    serviceClass: string;

    /** Service configuration */
    config?: {
        /** Connect to WebSocket on scenario start */
        connectOnStart?: boolean;

        /** Disconnect from WebSocket on scenario end */
        disconnectOnEnd?: boolean;

        /** Symbols to subscribe to (if applicable) */
        symbols?: string[];

        /** Additional provider-specific config */
        [key: string]: unknown;
    };
}

/**
 * Setup step configuration - executed before main test.
 */
export interface SetupStep {
    /** Step identifier for logging */
    id: string;

    /** Description of what this step does */
    description: string;

    /** Target class for setup operation */
    targetClass: string;

    /** Target method to invoke */
    targetMethod: string;

    /** Parameters for the method */
    parameters: Record<string, unknown>;

    /** Whether this step must succeed for test to proceed */
    required?: boolean;

    /** Store result in context with this key */
    storeResultAs?: string;
}

/**
 * Cleanup step configuration - executed after main test.
 */
export interface CleanupStep {
    /** Step identifier for logging */
    id: string;

    /** Description of what this step does */
    description: string;

    /** Target class for cleanup operation */
    targetClass: string;

    /** Target method to invoke */
    targetMethod: string;

    /** Parameters for the method (can reference stored results with $key) */
    parameters: Record<string, unknown>;

    /** Continue cleanup even if this step fails */
    continueOnError?: boolean;
}

/**
 * Collection of test scenarios.
 */
export interface TestScenarioFile {
    /** Schema version */
    version: string;

    /** File description */
    description: string;

    /** Test scenarios */
    scenarios: TestScenario[];
}
