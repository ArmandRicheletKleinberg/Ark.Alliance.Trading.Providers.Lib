/**
 * @fileoverview Universal Transfer Type Enumeration
 * @module enums/UniversalTransferType
 *
 * Defines transfer types for Universal Transfer API.
 *
 * @remarks
 * Universal Transfer allows moving assets between different Binance accounts.
 * Only available on MAINNET.
 *
 * @see https://developers.binance.com/docs/wallet/asset/user-universal-transfer
 */

/**
 * Universal transfer type enumeration.
 *
 * @enum {string}
 */
export enum UniversalTransferType {
    /**
     * Spot to USDⓈ-M Futures.
     */
    MAIN_UMFUTURE = 'MAIN_UMFUTURE',

    /**
     * USDⓈ-M Futures to Spot.
     */
    UMFUTURE_MAIN = 'UMFUTURE_MAIN',

    /**
     * Spot to COIN-M Futures.
     */
    MAIN_CMFUTURE = 'MAIN_CMFUTURE',

    /**
     * COIN-M Futures to Spot.
     */
    CMFUTURE_MAIN = 'CMFUTURE_MAIN',

    /**
     * Spot to Margin (cross).
     */
    MAIN_MARGIN = 'MAIN_MARGIN',

    /**
     * Margin (cross) to Spot.
     */
    MARGIN_MAIN = 'MARGIN_MAIN',

    /**
     * Spot to Funding.
     */
    MAIN_FUNDING = 'MAIN_FUNDING',

    /**
     * Funding to Spot.
     */
    FUNDING_MAIN = 'FUNDING_MAIN',

    /**
     * Funding to USDⓈ-M Futures.
     */
    FUNDING_UMFUTURE = 'FUNDING_UMFUTURE',

    /**
     * USDⓈ-M Futures to Funding.
     */
    UMFUTURE_FUNDING = 'UMFUTURE_FUNDING',

    /**
     * Margin to USDⓈ-M Futures.
     */
    MARGIN_UMFUTURE = 'MARGIN_UMFUTURE',

    /**
     * USDⓈ-M Futures to Margin.
     */
    UMFUTURE_MARGIN = 'UMFUTURE_MARGIN',

    /**
     * Spot to Option.
     */
    MAIN_OPTION = 'MAIN_OPTION',

    /**
     * Option to Spot.
     */
    OPTION_MAIN = 'OPTION_MAIN'
}

/**
 * Type alias for universal transfer type string literals.
 * @deprecated Use UniversalTransferType enum instead.
 */
export type UniversalTransferTypeType =
    | 'MAIN_UMFUTURE'
    | 'UMFUTURE_MAIN'
    | 'MAIN_CMFUTURE'
    | 'CMFUTURE_MAIN'
    | 'MAIN_MARGIN'
    | 'MARGIN_MAIN'
    | 'MAIN_FUNDING'
    | 'FUNDING_MAIN'
    | 'FUNDING_UMFUTURE'
    | 'UMFUTURE_FUNDING'
    | 'MARGIN_UMFUTURE'
    | 'UMFUTURE_MARGIN'
    | 'MAIN_OPTION'
    | 'OPTION_MAIN';

/**
 * Gets the source account type from transfer type.
 *
 * @param type - Transfer type.
 * @returns Source account name.
 */
export function getTransferSource(type: UniversalTransferType): string {
    return type.split('_')[0];
}

/**
 * Gets the destination account type from transfer type.
 *
 * @param type - Transfer type.
 * @returns Destination account name.
 */
export function getTransferDestination(type: UniversalTransferType): string {
    return type.split('_')[1];
}

/**
 * Checks if transfer involves USDⓈ-M Futures.
 *
 * @param type - Transfer type.
 * @returns True if UMFUTURE is involved.
 */
export function involvesUsdmFutures(type: UniversalTransferType): boolean {
    return type.includes('UMFUTURE');
}
