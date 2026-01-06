/**
 * @fileoverview Kraken Futures Account DTOs
 * @module Kraken/dtos/account/AccountTypes
 *
 * Type definitions for Kraken Futures account-related API responses.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Account Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Accounts response from /accounts endpoint.
 */
export interface AccountsResponse {
    /** Result status */
    result: 'success' | string;

    /** Server timestamp */
    serverTime: string;

    /** Account information */
    accounts: AccountInfo;
}

/**
 * Account information structure.
 */
export interface AccountInfo {
    /** Cash accounts */
    cash?: CashAccount;

    /** Flex futures accounts */
    flex?: FlexAccount;

    /** Multi-collateral accounts */
    multiCollateral?: MultiCollateralAccount;
}

/**
 * Cash account details.
 */
export interface CashAccount {
    /** Account type */
    type: 'cashAccount';

    /** Balances by currency */
    balances: Record<string, CashBalance>;
}

/**
 * Cash balance for a currency.
 */
export interface CashBalance {
    /** Quantity available */
    quantity: number;

    /** Value in USD */
    value: number;
}

/**
 * Flex futures account.
 */
export interface FlexAccount {
    /** Account type */
    type: 'flexFutures';

    /** Currencies with balances */
    currencies: Record<string, FlexCurrencyBalance>;
}

/**
 * Flex account currency balance.
 */
export interface FlexCurrencyBalance {
    /** Quantity held */
    quantity: number;

    /** Value in USD */
    value: number;

    /** Available for trading */
    available: number;

    /** Collateral value */
    collateral: number;
}

/**
 * Multi-collateral account.
 */
export interface MultiCollateralAccount {
    /** Account type */
    type: 'multiCollateralMarginAccount';

    /** Currencies with balances */
    currencies: Record<string, MultiCollateralBalance>;

    /** Margin requirements */
    marginRequirements: MarginRequirements;

    /** Trigger estimates */
    triggerEstimates: TriggerEstimates;

    /** Available margin */
    availableMargin: number;

    /** Portfolio value */
    pv: number;

    /** Unrealized funding PnL */
    unrealizedFunding: number;

    /** Total unrealized PnL */
    totalUnrealized: number;

    /** Total PnL */
    totalPnl: number;

    /** Balance value */
    balance: number;
}

/**
 * Multi-collateral balance for a currency.
 */
export interface MultiCollateralBalance {
    /** Quantity held */
    quantity: number;

    /** Value in USD */
    value: number;

    /** Conversion rate to USD */
    conversionRate: number;

    /** Available for withdrawal */
    available: number;

    /** Haircut applied */
    haircut: number;
}

/**
 * Margin requirements.
 */
export interface MarginRequirements {
    /** Initial margin requirement */
    im: number;

    /** Maintenance margin requirement */
    mm: number;

    /** Liquidation threshold */
    lt: number;

    /** Termination threshold */
    tt: number;
}

/**
 * Margin trigger estimates.
 */
export interface TriggerEstimates {
    /** Initial margin trigger estimate */
    im: number;

    /** Maintenance margin trigger estimate */
    mm: number;

    /** Liquidation trigger estimate */
    lt: number;

    /** Termination trigger estimate */
    tt: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Position Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Open positions response.
 */
export interface OpenPositionsResponse {
    /** Result status */
    result: 'success' | string;

    /** Server timestamp */
    serverTime: string;

    /** List of open positions */
    openPositions: KrakenPosition[];
}

/**
 * Kraken position structure.
 */
export interface KrakenPosition {
    /** Position side: 'long' or 'short' */
    side: 'long' | 'short';

    /** Product symbol */
    symbol: string;

    /** Position price (average entry) */
    price: number;

    /** Position size */
    size: number;

    /** Fill time */
    fillTime: string;

    /** Unrealized PnL */
    unrealizedPnl?: number;

    /** Realized PnL */
    realizedPnl?: number;

    /** Position value */
    positionValue?: number;
}
