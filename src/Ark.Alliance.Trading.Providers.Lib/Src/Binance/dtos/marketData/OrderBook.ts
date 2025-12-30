/**
 * @fileoverview Order Book Models
 * @module models/marketData/OrderBook
 *
 * Response models for GET /fapi/v1/depth endpoint.
 *
 * @see https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Order-Book
 */

/**
 * Order book entry [price, quantity].
 */
export type OrderBookEntry = [string, string];

/**
 * Order book response from Binance API.
 */
export interface OrderBookResponse {
    /**
     * Last update ID for order book synchronization.
     */
    lastUpdateId: number;

    /**
     * Message output time (Unix timestamp).
     */
    E: number;

    /**
     * Transaction time (Unix timestamp).
     */
    T: number;

    /**
     * Bid orders [price, quantity] sorted by price descending.
     */
    bids: OrderBookEntry[];

    /**
     * Ask orders [price, quantity] sorted by price ascending.
     */
    asks: OrderBookEntry[];
}

/**
 * Parsed order book level.
 */
export interface OrderBookLevel {
    /**
     * Price level.
     */
    price: number;

    /**
     * Quantity at this price level.
     */
    quantity: number;
}

/**
 * Parsed order book with numeric values.
 */
export interface ParsedOrderBook {
    /**
     * Last update ID.
     */
    lastUpdateId: number;

    /**
     * Message output time.
     */
    messageTime: number;

    /**
     * Transaction time.
     */
    transactionTime: number;

    /**
     * Parsed bid levels.
     */
    bids: OrderBookLevel[];

    /**
     * Parsed ask levels.
     */
    asks: OrderBookLevel[];
}

/**
 * Parses raw order book response to numeric values.
 *
 * @param response - Raw order book response.
 * @returns Parsed order book with numeric values.
 */
export function parseOrderBook(response: OrderBookResponse): ParsedOrderBook {
    return {
        lastUpdateId: response.lastUpdateId,
        messageTime: response.E,
        transactionTime: response.T,
        bids: response.bids.map(([price, qty]) => ({
            price: parseFloat(price),
            quantity: parseFloat(qty)
        })),
        asks: response.asks.map(([price, qty]) => ({
            price: parseFloat(price),
            quantity: parseFloat(qty)
        }))
    };
}

/**
 * Gets best bid from order book.
 *
 * @param orderBook - Parsed order book.
 * @returns Best bid level or undefined.
 */
export function getBestBid(orderBook: ParsedOrderBook): OrderBookLevel | undefined {
    return orderBook.bids[0];
}

/**
 * Gets best ask from order book.
 *
 * @param orderBook - Parsed order book.
 * @returns Best ask level or undefined.
 */
export function getBestAsk(orderBook: ParsedOrderBook): OrderBookLevel | undefined {
    return orderBook.asks[0];
}

/**
 * Calculates spread from order book.
 *
 * @param orderBook - Parsed order book.
 * @returns Spread or null if no bids/asks.
 */
export function calculateSpread(orderBook: ParsedOrderBook): number | null {
    const bestBid = getBestBid(orderBook);
    const bestAsk = getBestAsk(orderBook);

    if (!bestBid || !bestAsk) return null;
    return bestAsk.price - bestBid.price;
}
