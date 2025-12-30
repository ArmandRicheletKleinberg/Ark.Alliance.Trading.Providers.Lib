/**
 * @fileoverview Jest Setup File
 * @module setupTests
 * 
 * Global test configuration and utilities loaded before each test file.
 */

// Set test timeout
jest.setTimeout(30000);

// Global test environment setup
beforeAll(() => {
    // Load environment variables for credentials
    process.env.BINANCE_TESTNET_API_KEY = process.env.BINANCE_TESTNET_API_KEY || '';
    process.env.BINANCE_TESTNET_API_SECRET = process.env.BINANCE_TESTNET_API_SECRET || '';
    process.env.DERIBIT_TESTNET_API_KEY = process.env.DERIBIT_TESTNET_API_KEY || '';
    process.env.DERIBIT_TESTNET_API_SECRET = process.env.DERIBIT_TESTNET_API_SECRET || '';
});

// Global test cleanup
afterAll(() => {
    // Cleanup resources
});
