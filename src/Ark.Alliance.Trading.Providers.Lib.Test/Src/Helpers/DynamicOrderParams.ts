/**
 * @fileoverview Dynamic Order Parameter Builder
 * @module Helpers/DynamicOrderParams
 * 
 * Creates valid order parameters dynamically based on current market state.
 * Fetches orderbook and price data to calculate valid prices for limit/stop orders.
 */

import { BinanceRestClient } from 'ark-alliance-trading-providers-lib/Binance';

/**
 * Calculates dynamic order parameters based on current market state
 */
export class DynamicOrderParamBuilder {
    private client: BinanceRestClient;

    constructor(client: BinanceRestClient) {
        this.client = client;
    }

    /**
     * Get current market price for a symbol
     */
    async getCurrentPrice(symbol: string): Promise<number> {
        const result = await this.client.getPrice(symbol);
        if (result.success && result.data) {
            return parseFloat(result.data.price);
        }
        throw new Error(`Failed to get price for ${symbol}`);
    }

    /**
     * Get book ticker (best bid/ask) for a symbol
     */
    async getBookTicker(symbol: string): Promise<{ bidPrice: number; askPrice: number }> {
        const result = await this.client.getBookTicker(symbol);
        if (result.success && result.data) {
            return {
                bidPrice: parseFloat(result.data.bidPrice),
                askPrice: parseFloat(result.data.askPrice)
            };
        }
        throw new Error(`Failed to get book ticker for ${symbol}`);
    }

    /**
     * Build valid LIMIT BUY order parameters
     * Price should be below current ask to avoid immediate fill
     */
    async buildLimitBuyParams(symbol: string, quantity: number, pricePercent: number = 0.95): Promise<any> {
        const { bidPrice, askPrice } = await this.getBookTicker(symbol);
        // Use 95% of ask price (below market) for limit buy
        const price = (askPrice * pricePercent).toFixed(this.getPricePrecision(symbol));

        return {
            symbol,
            side: 'BUY',
            type: 'LIMIT',
            quantity: quantity.toString(),
            price,
            timeInForce: 'GTC'
        };
    }

    /**
     * Build valid LIMIT SELL order parameters
     * Price should be above current bid to avoid immediate fill
     */
    async buildLimitSellParams(symbol: string, quantity: number, pricePercent: number = 1.05): Promise<any> {
        const { bidPrice, askPrice } = await this.getBookTicker(symbol);
        // Use 105% of bid price (above market) for limit sell
        const price = (bidPrice * pricePercent).toFixed(this.getPricePrecision(symbol));

        return {
            symbol,
            side: 'SELL',
            type: 'LIMIT',
            quantity: quantity.toString(),
            price,
            timeInForce: 'GTC'
        };
    }

    /**
     * Build valid STOP_MARKET BUY order parameters
     * Stop price should be above current price to trigger on upward movement
     */
    async buildStopMarketBuyParams(symbol: string, quantity: number, stopPercent: number = 1.05): Promise<any> {
        const currentPrice = await this.getCurrentPrice(symbol);
        const stopPrice = (currentPrice * stopPercent).toFixed(this.getPricePrecision(symbol));

        return {
            symbol,
            side: 'BUY',
            type: 'STOP_MARKET',
            quantity: quantity.toString(),
            stopPrice
        };
    }

    /**
     * Build valid STOP_MARKET SELL order parameters
     * Stop price should be below current price to trigger on downward movement
     */
    async buildStopMarketSellParams(symbol: string, quantity: number, stopPercent: number = 0.95): Promise<any> {
        const currentPrice = await this.getCurrentPrice(symbol);
        const stopPrice = (currentPrice * stopPercent).toFixed(this.getPricePrecision(symbol));

        return {
            symbol,
            side: 'SELL',
            type: 'STOP_MARKET',
            quantity: quantity.toString(),
            stopPrice
        };
    }

    /**
     * Build valid GTX (Post-Only) order parameters
     * Price must be away from market to ensure it rests on the book
     */
    async buildGtxBuyParams(symbol: string, quantity: number): Promise<any> {
        const { bidPrice } = await this.getBookTicker(symbol);
        // Use current bid price (guaranteed to be away from ask)
        const price = bidPrice.toFixed(this.getPricePrecision(symbol));

        return {
            symbol,
            side: 'BUY',
            type: 'LIMIT',
            quantity: quantity.toString(),
            price,
            timeInForce: 'GTX'
        };
    }

    /**
     * Build trailing stop order parameters
     */
    async buildTrailingStopParams(symbol: string, quantity: number, callbackRate: number = 1.0): Promise<any> {
        return {
            symbol,
            side: 'SELL',
            type: 'TRAILING_STOP_MARKET',
            quantity: quantity.toString(),
            callbackRate
        };
    }

    /**
     * Get price precision for a symbol
     */
    private getPricePrecision(symbol: string): number {
        // Common precision for major symbols
        if (symbol.includes('BTC')) return 2;
        if (symbol.includes('ETH')) return 2;
        return 2; // Default
    }

    /**
     * Get quantity precision for a symbol  
     */
    private getQuantityPrecision(symbol: string): number {
        if (symbol.includes('BTC')) return 3;
        if (symbol.includes('ETH')) return 3;
        return 3; // Default
    }

    /**
     * Calculate minimum quantity for $100 notional
     */
    async getMinQuantityForNotional(symbol: string, targetNotional: number = 105): Promise<number> {
        const currentPrice = await this.getCurrentPrice(symbol);
        const minQty = targetNotional / currentPrice;
        const precision = this.getQuantityPrecision(symbol);
        return parseFloat(minQty.toFixed(precision));
    }
}

/**
 * Parameter resolver that uses dynamic pricing
 */
export async function resolveDynamicParams(
    client: BinanceRestClient,
    params: Record<string, any>
): Promise<Record<string, any>> {
    const builder = new DynamicOrderParamBuilder(client);
    const resolved = { ...params };

    console.log('[resolveDynamicParams] Input params:', JSON.stringify(params));

    // If price is a special marker, calculate dynamically
    try {
        if (params.price === '$DYNAMIC_LIMIT_BUY') {
            const book = await builder.getBookTicker(params.symbol);
            resolved.price = (book.askPrice * 0.95).toFixed(2);
            console.log(`[resolveDynamicParams] Resolved LIMIT_BUY price: ${resolved.price}`);
        } else if (params.price === '$DYNAMIC_LIMIT_SELL') {
            const book = await builder.getBookTicker(params.symbol);
            resolved.price = (book.bidPrice * 1.05).toFixed(2);
            console.log(`[resolveDynamicParams] Resolved LIMIT_SELL price: ${resolved.price}`);
        } else if (params.price === '$DYNAMIC_MARKETABLE_BUY') {
            const book = await builder.getBookTicker(params.symbol);
            // 2% above ask = clear fill
            resolved.price = (book.askPrice * 1.02).toFixed(2);
            console.log(`[resolveDynamicParams] Resolved MARKETABLE_BUY price: ${resolved.price} (ask: ${book.askPrice})`);
        } else if (params.price === '$DYNAMIC_MARKETABLE_SELL') {
            const book = await builder.getBookTicker(params.symbol);
            // 2% below bid = clear fill
            resolved.price = (book.bidPrice * 0.98).toFixed(2);
            console.log(`[resolveDynamicParams] Resolved MARKETABLE_SELL price: ${resolved.price}`);
        } else if (params.price === '$DYNAMIC_GTX_BUY') {
            const book = await builder.getBookTicker(params.symbol);
            resolved.price = (book.bidPrice * 0.999).toFixed(2);
            console.log(`[resolveDynamicParams] Resolved GTX_BUY price: ${resolved.price}`);
        } else if (params.price === '$DYNAMIC_GTX_SELL') {
            const book = await builder.getBookTicker(params.symbol);
            resolved.price = (book.askPrice * 1.001).toFixed(2);
            console.log(`[resolveDynamicParams] Resolved GTX_SELL price: ${resolved.price}`);
        }
    } catch (priceError: any) {
        console.error(`[resolveDynamicParams] FAILED to resolve price for ${params.symbol}:`, priceError.message);
        // Don't fallback - throw so test fails with clear error
        throw new Error(`Dynamic price resolution failed: ${priceError.message}`);
    }

    // If stopPrice is dynamic
    try {
        if (params.stopPrice === '$DYNAMIC_STOP_BUY') {
            const price = await builder.getCurrentPrice(params.symbol);
            resolved.stopPrice = (price * 1.05).toFixed(2);
        } else if (params.stopPrice === '$DYNAMIC_STOP_SELL') {
            const price = await builder.getCurrentPrice(params.symbol);
            resolved.stopPrice = (price * 0.95).toFixed(2);
        }
    } catch (stopError: any) {
        console.error(`[resolveDynamicParams] FAILED to resolve stopPrice:`, stopError.message);
        throw new Error(`Dynamic stopPrice resolution failed: ${stopError.message}`);
    }

    // If quantity is dynamic
    try {
        if (params.quantity === '$DYNAMIC_MIN_NOTIONAL') {
            resolved.quantity = await builder.getMinQuantityForNotional(params.symbol);
        }
    } catch (qtyError: any) {
        console.error(`[resolveDynamicParams] FAILED to resolve quantity:`, qtyError.message);
        throw new Error(`Dynamic quantity resolution failed: ${qtyError.message}`);
    }

    // Dynamic timestamp for GTD
    if (params.goodTillDate === '$FUTURE_TIMESTAMP') {
        // 24 hours from now in milliseconds
        resolved.goodTillDate = Date.now() + 24 * 60 * 60 * 1000;
        console.log(`[resolveDynamicParams] Resolved FUTURE_TIMESTAMP: ${resolved.goodTillDate}`);
    }

    console.log('[resolveDynamicParams] Final resolved params:', JSON.stringify(resolved));
    return resolved;
}

/**
 * GTX Order Retry Helper
 * Implements adaptive retry logic for Post-Only (GTX) orders
 * Adjusts price based on market movement between attempts
 */
export async function executeGtxOrderWithRetry(
    client: BinanceRestClient,
    params: {
        symbol: string;
        side: 'BUY' | 'SELL';
        quantity: number;
        maxRetries?: number;
        timeoutMs?: number;
        priceOffsetPercent?: number;
    }
): Promise<{
    success: boolean;
    attempts: number;
    finalPrice?: string;
    orderId?: string;
    error?: string;
}> {
    const builder = new DynamicOrderParamBuilder(client);
    const maxRetries = params.maxRetries || 3;
    const timeoutMs = params.timeoutMs || 5000;
    const priceOffset = params.priceOffsetPercent || 0.1; // 0.1% offset

    let attempts = 0;
    let lastError = '';

    while (attempts < maxRetries) {
        attempts++;

        try {
            // Fetch fresh book data for each attempt
            const book = await builder.getBookTicker(params.symbol);

            let price: string;
            if (params.side === 'BUY') {
                // BUY GTX: Price must be at or below bid to avoid crossing
                price = (book.bidPrice * (1 - priceOffset / 100)).toFixed(2);
            } else {
                // SELL GTX: Price must be at or above ask to avoid crossing  
                price = (book.askPrice * (1 + priceOffset / 100)).toFixed(2);
            }

            console.log(`[GTX Retry] Attempt ${attempts}/${maxRetries}: ${params.side} @ ${price}`);

            const orderResult = await client.placeOrder({
                symbol: params.symbol,
                side: params.side,
                type: 'LIMIT',
                quantity: params.quantity,
                price: price,
                timeInForce: 'GTX'
            });

            if (orderResult.success && orderResult.data) {
                // Order placed successfully, now wait for potential fill
                await new Promise(resolve => setTimeout(resolve, timeoutMs));

                // Check order status
                const orderStatus = await client.getOrder(
                    params.symbol,
                    orderResult.data.orderId
                );

                if (orderStatus.success && orderStatus.data) {
                    const status = orderStatus.data.status;

                    if (status === 'FILLED' || status === 'PARTIALLY_FILLED') {
                        return {
                            success: true,
                            attempts,
                            finalPrice: price,
                            orderId: String(orderResult.data.orderId)
                        };
                    } else if (status === 'NEW') {
                        // Order still resting, cancel and retry with adjusted price
                        await client.cancelOrder(
                            params.symbol,
                            orderResult.data.orderId
                        );
                        lastError = 'Order not filled within timeout, retrying with adjusted price';
                        continue;
                    }
                }
            } else {
                // Check if it's a "would immediately trade" rejection
                const errorCode = orderResult.error?.details?.binanceCode;
                if (errorCode === -5022) {
                    lastError = 'GTX order would immediately trade, adjusting price';
                    continue;
                }
                lastError = orderResult.error?.message || 'Unknown error';
            }
        } catch (error: any) {
            lastError = error.message || String(error);
        }
    }

    return {
        success: false,
        attempts,
        error: `Max retries (${maxRetries}) exceeded. Last error: ${lastError}`
    };
}

