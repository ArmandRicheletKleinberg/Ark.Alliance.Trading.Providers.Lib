/**
 * @fileoverview Mock Data Generator
 * @module Engine/MockDataGenerator
 * 
 * Generates realistic Binance API mock data for testing.
 * Creates properly structured responses matching actual API formats.
 */

import {
    MockDataConfig,
    TimeSeriesConfig
} from './TestScenario';

// ═══════════════════════════════════════════════════════════════════════════════
// Binance Response Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mock order response matching Binance API format.
 */
export interface MockOrderResponse {
    orderId: number;
    symbol: string;
    status: string;
    clientOrderId: string;
    price: string;
    avgPrice: string;
    origQty: string;
    executedQty: string;
    cumQuote: string;
    timeInForce: string;
    type: string;
    reduceOnly: boolean;
    closePosition: boolean;
    side: string;
    positionSide: string;
    stopPrice: string;
    workingType: string;
    priceProtect: boolean;
    origType: string;
    updateTime: number;
}

/**
 * Mock position response matching Binance API format.
 */
export interface MockPositionResponse {
    symbol: string;
    positionAmt: string;
    entryPrice: string;
    breakEvenPrice: string;
    markPrice: string;
    unRealizedProfit: string;
    liquidationPrice: string;
    leverage: string;
    maxNotionalValue: string;
    marginType: string;
    isolatedMargin: string;
    isAutoAddMargin: string;
    positionSide: string;
    notional: string;
    isolatedWallet: string;
    updateTime: number;
}

/**
 * Mock account balance response.
 */
export interface MockBalanceResponse {
    accountAlias: string;
    asset: string;
    balance: string;
    crossWalletBalance: string;
    crossUnPnl: string;
    availableBalance: string;
    maxWithdrawAmount: string;
    marginAvailable: boolean;
    updateTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data Generator Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates realistic mock data for Binance API responses.
 */
export class MockDataGenerator {
    private idCounter = 1000000000;
    private readonly symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];

    // ─────────────────────────────────────────────────────────────────────────
    // Order Generation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generates a mock order response.
     */
    public generateOrder(params: {
        symbol?: string;
        side?: 'BUY' | 'SELL';
        type?: string;
        quantity?: number;
        price?: number;
        status?: string;
        positionSide?: string;
        timeInForce?: string;
    }): MockOrderResponse {
        const orderId = this.nextId();
        const now = Date.now();

        return {
            orderId,
            symbol: params.symbol || 'BTCUSDT',
            status: params.status || 'NEW',
            clientOrderId: `test_${orderId}`,
            price: (params.price || 50000).toFixed(2),
            avgPrice: '0.00',
            origQty: (params.quantity || 0.001).toFixed(3),
            executedQty: '0.000',
            cumQuote: '0.00',
            timeInForce: params.timeInForce || 'GTC',
            type: params.type || 'LIMIT',
            reduceOnly: false,
            closePosition: false,
            side: params.side || 'BUY',
            positionSide: params.positionSide || 'BOTH',
            stopPrice: '0.00',
            workingType: 'CONTRACT_PRICE',
            priceProtect: false,
            origType: params.type || 'LIMIT',
            updateTime: now
        };
    }

    /**
     * Generates a filled order response.
     */
    public generateFilledOrder(params: {
        symbol?: string;
        side?: 'BUY' | 'SELL';
        type?: string;
        quantity?: number;
        price?: number;
    }): MockOrderResponse {
        const order = this.generateOrder({
            ...params,
            status: 'FILLED'
        });
        order.executedQty = order.origQty;
        order.avgPrice = order.price;
        order.cumQuote = (parseFloat(order.price) * parseFloat(order.origQty)).toFixed(2);
        return order;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Position Generation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generates a mock position response.
     */
    public generatePosition(params: {
        symbol?: string;
        side?: 'LONG' | 'SHORT';
        amount?: number;
        entryPrice?: number;
        leverage?: number;
        markPrice?: number;
    }): MockPositionResponse {
        const amount = params.amount || 0.001;
        const entryPrice = params.entryPrice || 50000;
        const markPrice = params.markPrice || entryPrice * 1.01;
        const side = params.side || 'LONG';
        const positionAmt = side === 'LONG' ? amount : -amount;
        const unrealizedPnl = (markPrice - entryPrice) * positionAmt;

        return {
            symbol: params.symbol || 'BTCUSDT',
            positionAmt: positionAmt.toFixed(3),
            entryPrice: entryPrice.toFixed(2),
            breakEvenPrice: entryPrice.toFixed(2),
            markPrice: markPrice.toFixed(2),
            unRealizedProfit: unrealizedPnl.toFixed(4),
            liquidationPrice: (entryPrice * (side === 'LONG' ? 0.9 : 1.1)).toFixed(2),
            leverage: (params.leverage || 10).toString(),
            maxNotionalValue: '1000000',
            marginType: 'isolated',
            isolatedMargin: ((entryPrice * amount) / (params.leverage || 10)).toFixed(4),
            isAutoAddMargin: 'false',
            positionSide: side,
            notional: (markPrice * Math.abs(positionAmt)).toFixed(4),
            isolatedWallet: ((entryPrice * amount) / (params.leverage || 10)).toFixed(4),
            updateTime: Date.now()
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Account Generation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generates a mock balance response.
     */
    public generateBalance(params: {
        asset?: string;
        balance?: number;
        availableBalance?: number;
    }): MockBalanceResponse {
        const balance = params.balance || 10000;
        const available = params.availableBalance || balance * 0.8;

        return {
            accountAlias: 'TsSgBfTiCsSwRq',
            asset: params.asset || 'USDT',
            balance: balance.toFixed(8),
            crossWalletBalance: balance.toFixed(8),
            crossUnPnl: '0.00000000',
            availableBalance: available.toFixed(8),
            maxWithdrawAmount: available.toFixed(8),
            marginAvailable: true,
            updateTime: Date.now()
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Time Series Generation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generates price time series data.
     */
    public generateTimeSeries(config: TimeSeriesConfig): number[] {
        const prices: number[] = [];
        let currentPrice = config.startPrice;

        for (let i = 0; i < config.ticks; i++) {
            prices.push(currentPrice);

            let change = 0;
            switch (config.pattern) {
                case 'linear':
                    change = config.trend * config.volatility;
                    break;
                case 'sinusoidal':
                    change = Math.sin(i / 10) * config.volatility;
                    break;
                case 'random':
                    change = (Math.random() - 0.5) * 2 * config.volatility +
                        config.trend * config.volatility * 0.1;
                    break;
                case 'step':
                    if (i % 5 === 0) {
                        change = config.trend * config.volatility;
                    }
                    break;
            }

            currentPrice += change;
            currentPrice = Math.max(currentPrice, 0.01); // Prevent negative prices
        }

        return prices;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Error Response Generation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generates a Binance API error response.
     */
    public generateError(code: number, message: string): {
        code: number;
        msg: string;
    } {
        return { code, msg: message };
    }

    /**
     * Common Binance error codes.
     */
    public static readonly ErrorCodes = {
        UNKNOWN: -1000,
        DISCONNECTED: -1001,
        UNAUTHORIZED: -1002,
        TOO_MANY_REQUESTS: -1003,
        UNEXPECTED_RESP: -1006,
        TIMEOUT: -1007,
        SERVER_BUSY: -1008,
        INVALID_MESSAGE: -1013,
        UNKNOWN_ORDER_COMPOSITION: -1014,
        TOO_MANY_ORDERS: -1015,
        INVALID_TIMESTAMP: -1021,
        INVALID_SIGNATURE: -1022,
        MANDATORY_PARAM_MISSING: -1102,
        PRECISION_OVER_MAX: -1111,
        INVALID_SIDE: -1117,
        INVALID_SYMBOL: -1121,
        INVALID_API_KEY: -2015,
        INSUFFICIENT_BALANCE: -2018,
        INSUFFICIENT_MARGIN: -2019,
        QTY_TOO_SMALL: -4003,
        PRICE_EXCEEDS_LIMIT: -4014,
        REDUCE_ONLY_REJECT: -4061,
        GTX_WOULD_TAKE: -5022
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Utilities
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Gets next unique ID.
     */
    private nextId(): number {
        return this.idCounter++;
    }

    /**
     * Gets a random symbol.
     */
    public getRandomSymbol(): string {
        return this.symbols[Math.floor(Math.random() * this.symbols.length)];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Live Market Data Integration
    // ─────────────────────────────────────────────────────────────────────────

    /** Cached live prices from market data */
    private livePriceCache: Map<string, { price: number; timestamp: number }> = new Map();

    /** Cache TTL in milliseconds (5 seconds) */
    private readonly priceCacheTTL = 5000;

    /**
     * Fetches live price from market data client and caches it.
     * Falls back to realistic mock price if fetch fails.
     * 
     * @param symbol - Trading symbol (e.g., 'BTCUSDT')
     * @param marketDataClient - Optional market data client instance
     * @returns Current price for the symbol
     */
    public async getLivePrice(
        symbol: string,
        marketDataClient?: { getPrice: (symbol: string) => Promise<{ price: string }> }
    ): Promise<number> {
        // Check cache first
        const cached = this.livePriceCache.get(symbol);
        if (cached && Date.now() - cached.timestamp < this.priceCacheTTL) {
            return cached.price;
        }

        // Try to fetch live price
        if (marketDataClient) {
            try {
                const result = await marketDataClient.getPrice(symbol);
                const price = parseFloat(result.price);
                if (!isNaN(price)) {
                    this.livePriceCache.set(symbol, { price, timestamp: Date.now() });
                    return price;
                }
            } catch (error) {
                console.warn(`Failed to fetch live price for ${symbol}, using fallback`);
            }
        }

        // Fallback to realistic mock price
        return this.getRealisticPrice(symbol);
    }

    /**
     * Pre-fetches and caches prices for multiple symbols.
     * 
     * @param symbols - Array of symbols to fetch
     * @param marketDataClient - Market data client instance
     */
    public async prefetchPrices(
        symbols: string[],
        marketDataClient?: { getAllPrices: () => Promise<Array<{ symbol: string; price: string }>> }
    ): Promise<void> {
        if (!marketDataClient) return;

        try {
            const prices = await marketDataClient.getAllPrices();
            const now = Date.now();

            for (const { symbol, price } of prices) {
                if (symbols.includes(symbol)) {
                    const numPrice = parseFloat(price);
                    if (!isNaN(numPrice)) {
                        this.livePriceCache.set(symbol, { price: numPrice, timestamp: now });
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to prefetch prices, will use fallback values');
        }
    }

    /**
     * Gets cached price or falls back to realistic mock.
     * Synchronous version for use in scenarios.
     */
    public getCachedOrMockPrice(symbol: string): number {
        const cached = this.livePriceCache.get(symbol);
        if (cached && Date.now() - cached.timestamp < this.priceCacheTTL) {
            return cached.price;
        }
        return this.getRealisticPrice(symbol);
    }

    /**
     * Generates realistic fallback price for a symbol.
     * Uses approximate December 2025 prices with random variance.
     * NOTE: These are fallback values - live prices are preferred via getLivePrice()
     */
    public getRealisticPrice(symbol: string): number {
        // December 2025 approximate prices (as of Dec 29, 2025)
        const basePrices: Record<string, { base: number; variance: number }> = {
            'BTCUSDT': { base: 88000, variance: 2000 },
            'ETHUSDT': { base: 2980, variance: 100 },
            'BNBUSDT': { base: 695, variance: 25 },
            'SOLUSDT': { base: 125, variance: 8 },
            'XRPUSDT': { base: 1.88, variance: 0.10 },
            'ADAUSDT': { base: 0.85, variance: 0.05 },
            'DOGEUSDT': { base: 0.31, variance: 0.02 },
            'MATICUSDT': { base: 0.45, variance: 0.03 },
            'DOTUSDT': { base: 6.80, variance: 0.40 },
            'LINKUSDT': { base: 22, variance: 1.5 },
            'AVAXUSDT': { base: 38, variance: 3 },
            'ATOMUSDT': { base: 6.50, variance: 0.40 },
            'LTCUSDT': { base: 102, variance: 6 },
            'UNIUSDT': { base: 13.50, variance: 0.80 },
            'APTUSDT': { base: 9.80, variance: 0.60 },
            'AAVEUSDT': { base: 340, variance: 20 },
            'NEARUSDT': { base: 5.00, variance: 0.30 },
            'ARBUSDT': { base: 0.75, variance: 0.05 },
            'OPUSDT': { base: 1.80, variance: 0.10 },
            'SUIUSDT': { base: 4.00, variance: 0.25 }
        };



        const priceInfo = basePrices[symbol];
        if (priceInfo) {
            return priceInfo.base + (Math.random() - 0.5) * 2 * priceInfo.variance;
        }

        // Default for unknown symbols
        return 100 + Math.random() * 10;
    }

    /**
     * Clears the price cache.
     */
    public clearPriceCache(): void {
        this.livePriceCache.clear();
    }
}

