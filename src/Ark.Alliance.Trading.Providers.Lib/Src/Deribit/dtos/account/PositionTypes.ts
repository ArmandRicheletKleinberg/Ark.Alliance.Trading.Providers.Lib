/**
 * @fileoverview Deribit Position DTOs
 * @module Deribit/dtos/account/PositionTypes
 *
 * Data transfer objects for Deribit positions and account.
 */

import { Direction, InstrumentKind } from '../../enums';

/**
 * Position response from Deribit API.
 */
export interface DeribitPosition {
    instrument_name: string;
    direction: Direction;
    size: number;
    size_currency: number;
    average_price: number;
    mark_price: number;
    index_price: number;
    delta: number;
    initial_margin: number;
    maintenance_margin: number;
    open_orders_margin: number;
    estimated_liquidation_price: number;
    floating_profit_loss: number;
    floating_profit_loss_usd?: number;
    realized_profit_loss: number;
    realized_funding: number;
    total_profit_loss: number;
    settlement_price: number;
    leverage: number;
    kind: InstrumentKind;
    interest_value?: number;
}

/**
 * Account summary response from Deribit API.
 */
export interface DeribitAccountSummary {
    currency: string;
    balance: number;
    equity: number;
    margin_balance: number;
    available_funds: number;
    available_withdrawal_funds: number;
    initial_margin: number;
    maintenance_margin: number;
    projected_initial_margin: number;
    projected_maintenance_margin: number;
    session_upl: number;
    session_rpl: number;
    futures_pl: number;
    futures_session_upl: number;
    futures_session_rpl: number;
    options_pl: number;
    options_session_upl: number;
    options_session_rpl: number;
    options_delta: number;
    options_gamma: number;
    options_vega: number;
    options_theta: number;
    options_value: number;
    delta_total: number;
    fee_balance: number;
    total_pl: number;
    estimated_liquidation_ratio: number;
    portfolio_margining_enabled: boolean;
    cross_collateral_enabled: boolean;
    margin_model: string;
    delta_total_map?: Record<string, number>;
    spot_reserve?: number;
    additional_reserve?: number;
}

/**
 * User portfolio subscription data.
 */
export interface DeribitPortfolioUpdate extends DeribitAccountSummary {
    // Same as account summary, sent via subscription
}

/**
 * User changes subscription data.
 */
export interface DeribitUserChanges {
    instrument_name: string;
    orders: DeribitOrderUpdate[];
    positions: DeribitPositionUpdate[];
    trades: DeribitTradeUpdate[];
}

/**
 * Order update from user.changes subscription.
 */
export interface DeribitOrderUpdate {
    order_id: string;
    instrument_name: string;
    direction: Direction;
    amount: number;
    filled_amount: number;
    price: number;
    average_price: number;
    order_type: string;
    order_state: string;
    time_in_force: string;
    label: string;
    is_liquidation: boolean;
    is_rebalance: boolean;
    reduce_only: boolean;
    post_only: boolean;
    max_show: number;
    creation_timestamp: number;
    last_update_timestamp: number;
    replaced: boolean;
    web: boolean;
    api: boolean;
}

/**
 * Position update from user.changes subscription.
 */
export interface DeribitPositionUpdate {
    instrument_name: string;
    direction: Direction;
    size: number;
    size_currency: number;
    average_price: number;
    mark_price: number;
    index_price: number;
    delta: number;
    initial_margin: number;
    maintenance_margin: number;
    floating_profit_loss: number;
    realized_profit_loss: number;
    realized_funding?: number;
    settlement_price: number;
    leverage: number;
    kind: InstrumentKind;
    total_profit_loss: number;
    interest_value?: number;
}

/**
 * Trade update from user.changes subscription.
 */
export interface DeribitTradeUpdate {
    trade_id: string;
    trade_seq: number;
    instrument_name: string;
    direction: Direction;
    amount: number;
    price: number;
    mark_price: number;
    index_price: number;
    order_id: string;
    order_type: string;
    fee: number;
    fee_currency: string;
    liquidity: 'M' | 'T';
    timestamp: number;
    tick_direction: number;
    state: string;
    reduce_only: boolean;
    post_only: boolean;
    label?: string;
    profit_loss?: number;
}
