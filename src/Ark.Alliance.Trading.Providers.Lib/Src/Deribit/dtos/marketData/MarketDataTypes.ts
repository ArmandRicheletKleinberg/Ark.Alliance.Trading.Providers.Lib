/**
 * @fileoverview Deribit Market Data DTOs
 * @module Deribit/dtos/marketData/MarketDataTypes
 *
 * Data transfer objects for Deribit market data.
 */

import { InstrumentKind } from '../../enums';

/**
 * Ticker response from Deribit API.
 */
export interface DeribitTicker {
    instrument_name: string;
    best_bid_price: number;
    best_bid_amount: number;
    best_ask_price: number;
    best_ask_amount: number;
    last_price: number;
    mark_price: number;
    index_price: number;
    settlement_price: number;
    open_interest: number;
    min_price: number;
    max_price: number;
    funding_8h: number;
    current_funding: number;
    state: 'open' | 'closed';
    timestamp: number;
    stats: {
        volume: number;
        volume_usd?: number;
        price_change: number;
        low: number;
        high: number;
    };
    // Options specific
    greeks?: {
        delta: number;
        gamma: number;
        vega: number;
        theta: number;
        rho: number;
    };
    underlying_price?: number;
    underlying_index?: string;
}

/**
 * Order book response from Deribit API.
 */
export interface DeribitOrderBook {
    instrument_name: string;
    bids: [number, number][];  // [price, amount][]
    asks: [number, number][];  // [price, amount][]
    best_bid_price: number;
    best_bid_amount: number;
    best_ask_price: number;
    best_ask_amount: number;
    last_price: number;
    mark_price: number;
    index_price: number;
    settlement_price: number;
    open_interest: number;
    min_price: number;
    max_price: number;
    state: string;
    change_id: number;
    timestamp: number;
    stats: {
        volume: number;
        price_change: number;
        low: number;
        high: number;
    };
    funding_8h?: number;
    current_funding?: number;
}

/**
 * Instrument response from Deribit API.
 */
export interface DeribitInstrument {
    instrument_name: string;
    kind: InstrumentKind;
    base_currency: string;
    quote_currency: string;
    counter_currency: string;
    settlement_currency: string;
    settlement_period: string;
    is_active: boolean;
    creation_timestamp: number;
    expiration_timestamp: number;
    contract_size: number;
    tick_size: number;
    min_trade_amount: number;
    max_leverage?: number;
    max_liquidation_commission?: number;
    maker_commission: number;
    taker_commission: number;
    block_trade_commission?: number;
    // Options specific
    strike?: number;
    option_type?: 'call' | 'put';
    // Futures specific
    future_type?: 'perpetual' | 'reversed';
    rfq?: boolean;
}

/**
 * Quote subscription data.
 */
export interface DeribitQuote {
    instrument_name: string;
    best_bid_price: number;
    best_bid_amount: number;
    best_ask_price: number;
    best_ask_amount: number;
    timestamp: number;
}

/**
 * Trade subscription data.
 */
export interface DeribitPublicTrade {
    trade_id: string;
    trade_seq: number;
    instrument_name: string;
    direction: 'buy' | 'sell';
    amount: number;
    price: number;
    mark_price: number;
    index_price: number;
    tick_direction: number;
    timestamp: number;
    liquidation?: 'M' | 'T' | 'MT';
    combo_trade_id?: number;
    combo_id?: string;
    block_trade_id?: string;
}

/**
 * Currency info from Deribit API.
 */
export interface DeribitCurrency {
    currency: string;
    currency_long: string;
    coin_type: string;
    min_confirmations: number;
    min_withdrawal_fee: number;
    disabled_deposit_address_creation: boolean;
    fee_precision: number;
    withdrawal_priorities: {
        name: string;
        value: number;
    }[];
}
