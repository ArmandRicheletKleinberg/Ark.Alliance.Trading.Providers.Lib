/**
 * @fileoverview OrderBook Helper
 * @module helpers/calculation/OrderBookHelper
 */

import { OrderBook } from '../../../Binance/dtos/binance/BinanceTypes';

/**
 * Order book analysis utilities
 */
export class OrderBookHelper {
    /**
     * Get bid price at specified level from order book
     * @param orderBook - Order book data
     * @param level - Book level (1 = best, 2 = second best, etc.)
     * @returns Bid price at level or null if not available
     */
    static getBidAtLevel(orderBook: OrderBook, level: number = 2): number | null {
        const index = level - 1; // Convert to 0-based index
        if (!orderBook.bids || orderBook.bids.length < level) {
            return null;
        }
        return parseFloat(orderBook.bids[index][0]);
    }

    /**
     * Get ask price at specified level from order book
     * @param orderBook - Order book data
     * @param level - Book level (1 = best, 2 = second best, etc.)
     * @returns Ask price at level or null if not available
     */
    static getAskAtLevel(orderBook: OrderBook, level: number = 2): number | null {
        const index = level - 1; // Convert to 0-based index
        if (!orderBook.asks || orderBook.asks.length < level) {
            return null;
        }
        return parseFloat(orderBook.asks[index][0]);
    }

    /**
     * Get second best bid price from order book
     * @param orderBook - Order book data
     * @returns Second best bid price or null if not available
     */
    static getSecondBestBid(orderBook: OrderBook): number | null {
        return this.getBidAtLevel(orderBook, 2);
    }

    /**
     * Get second best ask price from order book
     * @param orderBook - Order book data
     * @returns Second best ask price or null if not available
     */
    static getSecondBestAsk(orderBook: OrderBook): number | null {
        return this.getAskAtLevel(orderBook, 2);
    }

    /**
     * Get best bid price from order book
     * @param orderBook - Order book data
     * @returns Best bid price or null if not available
     */
    static getBestBid(orderBook: OrderBook): number | null {
        return this.getBidAtLevel(orderBook, 1);
    }

    /**
     * Get best ask price from order book
     * @param orderBook - Order book data
     * @returns Best ask price or null if not available
     */
    static getBestAsk(orderBook: OrderBook): number | null {
        return this.getAskAtLevel(orderBook, 1);
    }

    /**
     * Get GFX order price based on side and book level
     * For BUY: use bid at specified level (to be maker)
     * For SELL: use ask at specified level (to be maker)
     * @param orderBook - Order book data
     * @param side - Order side (BUY or SELL)
     * @param level - Book level (default: 2 for second best)
     * @returns Price for GFX order
     */
    static getGfxPrice(orderBook: OrderBook, side: 'BUY' | 'SELL', level: number = 2): number | null {
        if (side === 'BUY') {
            return this.getBidAtLevel(orderBook, level);
        } else {
            return this.getAskAtLevel(orderBook, level);
        }
    }

    /**
     * Calculate spread percentage
     * @param orderBook - Order book data
     * @returns Spread as percentage
     */
    static calculateSpread(orderBook: OrderBook): number | null {
        const bestBid = this.getBestBid(orderBook);
        const bestAsk = this.getBestAsk(orderBook);

        if (bestBid === null || bestAsk === null) {
            return null;
        }

        return ((bestAsk - bestBid) / bestBid) * 100;
    }

    /**
     * Get GFX order price from bookTicker streaming data
     * For BUY: use bid side slightly LOWER to ensure maker (avoid -5022)
     * For SELL: use ask side slightly HIGHER to ensure maker (avoid -5022)
     * 
     * The level parameter controls how far from best bid/ask to price:
     * - Level 1: Use best bid/ask directly (risky for GTX)
     * - Level 2+: Offset by (level-1) * estimated tick size
     * 
     * For GTX (Post-Only) orders, we need to ensure the price doesn't cross the spread
     */
    static getGfxPriceFromBookTicker(
        bestBid: number,
        bestAsk: number,
        side: 'BUY' | 'SELL',
        level: number = 2,
        tickSize: number = 0.01  // Default tick size, should be passed from symbol info
    ): number {
        // Calculate offset: each level moves price away from market
        // Level 1 = 0 offset (risky), Level 2 = 1 tick offset, etc.
        const offsetTicks = Math.max(0, level - 1);
        const offset = offsetTicks * tickSize;

        if (side === 'BUY') {
            // BUY: Price BELOW best bid to be maker
            return bestBid - offset;
        } else {
            // SELL: Price ABOVE best ask to be maker
            return bestAsk + offset;
        }
    }
}
