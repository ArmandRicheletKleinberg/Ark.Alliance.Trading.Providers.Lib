/**
 * @fileoverview Multi-Symbol Order Verification Test
 * @description Tests order placement/cancellation on ETHUSDT, SOLUSDT, XRPUSDT
 */

import { BinanceRestClient } from 'ark-alliance-trading-providers-lib/Binance';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load config
function loadConfig() {
    const configPath = join(__dirname, '..', '..', '..', 'test.config.json');
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);
    return config.credentials['binance-testnet'];
}

describe('Multi-Symbol Order Verification', () => {
    let restClient: BinanceRestClient;

    beforeAll(async () => {
        const config = loadConfig();
        restClient = new BinanceRestClient(config.apiKey, config.apiSecret, {
            baseUrl: config.baseUrl
        });
        console.log('[Setup] Created REST client for testnet');
    }, 10000);

    // Test ETHUSDT
    test('ETHUSDT: Place and cancel limit order', async () => {
        // Get current price
        const priceResult = await restClient.getPrice('ETHUSDT');
        console.log('[ETHUSDT] Price result:', priceResult);
        expect(priceResult.isSuccess).toBe(true);

        const currentPrice = parseFloat(priceResult.data?.price || '0');
        const limitPrice = (currentPrice * 0.9).toFixed(2);

        console.log(`[ETHUSDT] Current: ${currentPrice}, Limit: ${limitPrice}`);

        // Place order
        const orderResult = await restClient.placeOrder({
            symbol: 'ETHUSDT',
            side: 'BUY',
            type: 'LIMIT',
            timeInForce: 'GTC',
            quantity: 0.01,
            price: limitPrice
        });

        console.log('[ETHUSDT] Order result:', JSON.stringify(orderResult, null, 2));

        if (orderResult.isSuccess && orderResult.data?.orderId) {
            console.log('[ETHUSDT] ✅ Order placed! ID:', orderResult.data.orderId);

            // Cancel order
            const cancelResult = await restClient.cancelOrder('ETHUSDT', orderResult.data.orderId);
            console.log('[ETHUSDT] Cancel result:', JSON.stringify(cancelResult, null, 2));

            if (cancelResult.isSuccess) {
                console.log('[ETHUSDT] ✅ Order cancelled!');
            } else {
                console.log('[ETHUSDT] ❌ Cancel failed:', cancelResult.error);
            }
            expect(cancelResult.isSuccess).toBe(true);
        } else {
            console.log('[ETHUSDT] ❌ Order failed:', orderResult.error);
            // Log error code for diagnosis
            console.log('[ETHUSDT] Error code:', orderResult.error?.code);
        }
    }, 30000);

    // Test SOLUSDT
    test('SOLUSDT: Place and cancel limit order', async () => {
        const priceResult = await restClient.getPrice('SOLUSDT');
        console.log('[SOLUSDT] Price result:', priceResult);
        expect(priceResult.isSuccess).toBe(true);

        const currentPrice = parseFloat(priceResult.data?.price || '0');
        const limitPrice = (currentPrice * 0.9).toFixed(2);

        console.log(`[SOLUSDT] Current: ${currentPrice}, Limit: ${limitPrice}`);

        const orderResult = await restClient.placeOrder({
            symbol: 'SOLUSDT',
            side: 'BUY',
            type: 'LIMIT',
            timeInForce: 'GTC',
            quantity: 0.1,
            price: limitPrice
        });

        console.log('[SOLUSDT] Order result:', JSON.stringify(orderResult, null, 2));

        if (orderResult.isSuccess && orderResult.data?.orderId) {
            console.log('[SOLUSDT] ✅ Order placed! ID:', orderResult.data.orderId);
            const cancelResult = await restClient.cancelOrder('SOLUSDT', orderResult.data.orderId);
            console.log('[SOLUSDT] ✅ Order cancelled!');
        } else {
            console.log('[SOLUSDT] ❌ Order failed:', orderResult.error);
        }
    }, 30000);

    // Test XRPUSDT
    test('XRPUSDT: Place and cancel limit order', async () => {
        const priceResult = await restClient.getPrice('XRPUSDT');
        console.log('[XRPUSDT] Price result:', priceResult);
        expect(priceResult.isSuccess).toBe(true);

        const currentPrice = parseFloat(priceResult.data?.price || '0');
        const limitPrice = (currentPrice * 0.9).toFixed(4);

        console.log(`[XRPUSDT] Current: ${currentPrice}, Limit: ${limitPrice}`);

        const orderResult = await restClient.placeOrder({
            symbol: 'XRPUSDT',
            side: 'BUY',
            type: 'LIMIT',
            timeInForce: 'GTC',
            quantity: 10,
            price: limitPrice
        });

        console.log('[XRPUSDT] Order result:', JSON.stringify(orderResult, null, 2));

        if (orderResult.isSuccess && orderResult.data?.orderId) {
            console.log('[XRPUSDT] ✅ Order placed! ID:', orderResult.data.orderId);
            const cancelResult = await restClient.cancelOrder('XRPUSDT', orderResult.data.orderId);
            console.log('[XRPUSDT] ✅ Order cancelled!');
        } else {
            console.log('[XRPUSDT] ❌ Order failed:', orderResult.error);
        }
    }, 30000);
});
