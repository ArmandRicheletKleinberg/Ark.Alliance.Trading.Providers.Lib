/**
 * @fileoverview Deribit Order DTOs
 * @module Deribit/dtos/trading/OrderTypes
 *
 * Data transfer objects for Deribit orders.
 */

import { DeribitOrderType, DeribitTimeInForce, Direction, OrderState } from '../../enums';

/**
 * Order placement request parameters (for buy/sell methods).
 */
export interface OrderRequest {
    instrument_name: string;
    amount: number;
    type?: DeribitOrderType;
    price?: number;
    trigger_price?: number;
    time_in_force?: DeribitTimeInForce;
    reduce_only?: boolean;
    post_only?: boolean;
    reject_post_only?: boolean;
    label?: string;
    max_show?: number;
    trigger?: 'index_price' | 'mark_price' | 'last_price';
    advanced?: 'usd' | 'implv';
    valid_until?: number;
}

/**
 * Order response from Deribit API.
 */
export interface DeribitOrder {
    order_id: string;
    instrument_name: string;
    direction: Direction;
    amount: number;
    filled_amount: number;
    price: number | 'market_price';
    average_price: number;
    order_type: DeribitOrderType;
    order_state: OrderState;
    time_in_force: DeribitTimeInForce;
    label: string;
    is_liquidation: boolean;
    is_rebalance: boolean;
    reduce_only: boolean;
    post_only: boolean;
    replaced: boolean;
    web: boolean;
    api: boolean;
    max_show: number;
    creation_timestamp: number;
    last_update_timestamp: number;
    trigger_price?: number;
    trigger?: string;
    triggered?: boolean;
}

/**
 * Trade fill from buy/sell response.
 */
export interface DeribitTrade {
    trade_id: string;
    trade_seq: number;
    instrument_name: string;
    direction: Direction;
    amount: number;
    price: number;
    mark_price: number;
    index_price: number;
    order_id: string;
    order_type: DeribitOrderType;
    fee: number;
    fee_currency: string;
    liquidity: 'M' | 'T';
    timestamp: number;
    tick_direction: number;
    state: string;
    reduce_only: boolean;
    post_only: boolean;
    label?: string;
    matching_id?: string;
}

/**
 * Buy/Sell response structure.
 */
export interface OrderPlacementResponse {
    order: DeribitOrder;
    trades: DeribitTrade[];
}

/**
 * Cancel order request.
 */
export interface CancelRequest {
    order_id: string;
}

/**
 * Cancel all request.
 */
export interface CancelAllRequest {
    instrument_name?: string;
    currency?: string;
    type?: 'all' | 'limit' | 'trigger';
    detailed?: boolean;
}

/**
 * Edit order request.
 */
export interface EditOrderRequest {
    order_id: string;
    amount?: number;
    price?: number;
    stop_price?: number;
    post_only?: boolean;
    reduce_only?: boolean;
    reject_post_only?: boolean;
    advanced?: 'usd' | 'implv';
    valid_until?: number;
}

/**
 * Close position request.
 */
export interface ClosePositionRequest {
    instrument_name: string;
    type: 'limit' | 'market';
    price?: number;
}
