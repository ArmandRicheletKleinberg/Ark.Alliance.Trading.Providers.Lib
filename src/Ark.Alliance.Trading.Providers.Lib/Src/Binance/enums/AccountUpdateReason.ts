/**
 * @fileoverview Account Update Reason Enumeration
 * @module enums/AccountUpdateReason
 *
 * Defines reasons for account updates from User Data Stream.
 *
 * @remarks
 * These reasons are provided in ACCOUNT_UPDATE events.
 *
 * @see https://developers.binance.com/docs/derivatives/usds-margined-futures/user-data-stream/Event-Balance-and-Position-Update
 */

/**
 * Account update reason enumeration.
 *
 * @enum {string}
 */
export enum AccountUpdateReason {
    /**
     * Deposit to account.
     */
    DEPOSIT = 'DEPOSIT',

    /**
     * Withdrawal from account.
     */
    WITHDRAW = 'WITHDRAW',

    /**
     * Order placed or executed.
     */
    ORDER = 'ORDER',

    /**
     * Funding fee applied.
     */
    FUNDING_FEE = 'FUNDING_FEE',

    /**
     * Withdrawal rejected.
     */
    WITHDRAW_REJECT = 'WITHDRAW_REJECT',

    /**
     * Adjustment made to account.
     */
    ADJUSTMENT = 'ADJUSTMENT',

    /**
     * Insurance fund clearance.
     */
    INSURANCE_CLEAR = 'INSURANCE_CLEAR',

    /**
     * ADL (Auto-Deleveraging) event.
     */
    ADMIN_DEPOSIT = 'ADMIN_DEPOSIT',

    /**
     * Administrative withdrawal.
     */
    ADMIN_WITHDRAW = 'ADMIN_WITHDRAW',

    /**
     * Margin transfer between accounts.
     */
    MARGIN_TRANSFER = 'MARGIN_TRANSFER',

    /**
     * Margin type change (cross/isolated).
     */
    MARGIN_TYPE_CHANGE = 'MARGIN_TYPE_CHANGE',

    /**
     * Asset transfer between accounts.
     */
    ASSET_TRANSFER = 'ASSET_TRANSFER',

    /**
     * Options premium fee.
     */
    OPTIONS_PREMIUM_FEE = 'OPTIONS_PREMIUM_FEE',

    /**
     * Options settle profit.
     */
    OPTIONS_SETTLE_PROFIT = 'OPTIONS_SETTLE_PROFIT',

    /**
     * Auto exchange during liquidation.
     */
    AUTO_EXCHANGE = 'AUTO_EXCHANGE',

    /**
     * Coin swap between assets.
     */
    COIN_SWAP_DEPOSIT = 'COIN_SWAP_DEPOSIT',

    /**
     * Coin swap withdrawal.
     */
    COIN_SWAP_WITHDRAW = 'COIN_SWAP_WITHDRAW'
}

/**
 * Type alias for account update reason string literals.
 * @deprecated Use AccountUpdateReason enum instead.
 */
export type AccountUpdateReasonType =
    | 'DEPOSIT'
    | 'WITHDRAW'
    | 'ORDER'
    | 'FUNDING_FEE'
    | 'WITHDRAW_REJECT'
    | 'ADJUSTMENT'
    | 'INSURANCE_CLEAR'
    | 'ADMIN_DEPOSIT'
    | 'ADMIN_WITHDRAW'
    | 'MARGIN_TRANSFER'
    | 'MARGIN_TYPE_CHANGE'
    | 'ASSET_TRANSFER'
    | 'OPTIONS_PREMIUM_FEE'
    | 'OPTIONS_SETTLE_PROFIT'
    | 'AUTO_EXCHANGE'
    | 'COIN_SWAP_DEPOSIT'
    | 'COIN_SWAP_WITHDRAW';

/**
 * Checks if the account update is related to trading.
 *
 * @param reason - Account update reason.
 * @returns True if related to trading activity.
 */
export function isTradingRelated(reason: AccountUpdateReason): boolean {
    return reason === AccountUpdateReason.ORDER ||
        reason === AccountUpdateReason.FUNDING_FEE;
}
