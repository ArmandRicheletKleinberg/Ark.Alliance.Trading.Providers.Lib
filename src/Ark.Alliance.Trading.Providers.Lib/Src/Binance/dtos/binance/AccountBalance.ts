/**
 * @fileoverview Account Balance Models from Binance v2/account.status
 * @module models/binance/AccountBalance
 */

export interface AssetBalance {
    asset: string;
    walletBalance: number;
    unrealizedProfit: number;
    marginBalance: number;
    maintMargin: number;
    initialMargin: number;
    positionInitialMargin: number;
    openOrderInitialMargin: number;
    crossWalletBalance: number;
    crossUnPnl: number;
    availableBalance: number;
    maxWithdrawAmount: number;
    marginAvailable?: boolean;  // Multi-asset mode only
    updateTime: number;
}

export interface AccountPosition {
    symbol: string;
    positionSide: 'BOTH' | 'LONG' | 'SHORT';
    positionAmt: number;
    unrealizedProfit: number;
    isolatedMargin: number;
    notional: number;
    isolatedWallet: number;
    initialMargin: number;
    maintMargin: number;
    updateTime: number;
}

export interface AccountBalance {
    // Summary values (USD)
    totalInitialMargin: number;
    totalMaintMargin: number;
    totalWalletBalance: number;
    totalUnrealizedProfit: number;
    totalMarginBalance: number;
    totalPositionInitialMargin: number;
    totalOpenOrderInitialMargin: number;
    totalCrossWalletBalance: number;
    totalCrossUnPnl: number;
    availableBalance: number;
    maxWithdrawAmount: number;

    // Detailed breakdowns
    assets: AssetBalance[];
    positions: AccountPosition[];

    // Metadata
    lastUpdate: number;
    isMultiAssetMode: boolean;
}

/**
 * Raw response from v2/account.status
 */
export interface AccountStatusRawResponse {
    totalInitialMargin: string;
    totalMaintMargin: string;
    totalWalletBalance: string;
    totalUnrealizedProfit: string;
    totalMarginBalance: string;
    totalPositionInitialMargin: string;
    totalOpenOrderInitialMargin: string;
    totalCrossWalletBalance: string;
    totalCrossUnPnl: string;
    availableBalance: string;
    maxWithdrawAmount: string;
    assets: Array<{
        asset: string;
        walletBalance: string;
        unrealizedProfit: string;
        marginBalance: string;
        maintMargin: string;
        initialMargin: string;
        positionInitialMargin: string;
        openOrderInitialMargin: string;
        crossWalletBalance: string;
        crossUnPnl: string;
        availableBalance: string;
        maxWithdrawAmount: string;
        marginAvailable?: boolean;
        updateTime: number;
    }>;
    positions: Array<{
        symbol: string;
        positionSide: string;
        positionAmt: string;
        unrealizedProfit: string;
        isolatedMargin: string;
        notional: string;
        isolatedWallet: string;
        initialMargin: string;
        maintMargin: string;
        updateTime: number;
    }>;
}

/**
 * Parse raw account status to clean AccountBalance
 */
export function parseAccountStatus(raw: AccountStatusRawResponse): AccountBalance {
    const hasMarginAvailable = raw.assets.some(a => a.marginAvailable !== undefined);

    return {
        totalInitialMargin: parseFloat(raw.totalInitialMargin),
        totalMaintMargin: parseFloat(raw.totalMaintMargin),
        totalWalletBalance: parseFloat(raw.totalWalletBalance),
        totalUnrealizedProfit: parseFloat(raw.totalUnrealizedProfit),
        totalMarginBalance: parseFloat(raw.totalMarginBalance),
        totalPositionInitialMargin: parseFloat(raw.totalPositionInitialMargin),
        totalOpenOrderInitialMargin: parseFloat(raw.totalOpenOrderInitialMargin),
        totalCrossWalletBalance: parseFloat(raw.totalCrossWalletBalance),
        totalCrossUnPnl: parseFloat(raw.totalCrossUnPnl),
        availableBalance: parseFloat(raw.availableBalance),
        maxWithdrawAmount: parseFloat(raw.maxWithdrawAmount),

        assets: raw.assets.map(a => ({
            asset: a.asset,
            walletBalance: parseFloat(a.walletBalance),
            unrealizedProfit: parseFloat(a.unrealizedProfit),
            marginBalance: parseFloat(a.marginBalance),
            maintMargin: parseFloat(a.maintMargin),
            initialMargin: parseFloat(a.initialMargin),
            positionInitialMargin: parseFloat(a.positionInitialMargin),
            openOrderInitialMargin: parseFloat(a.openOrderInitialMargin),
            crossWalletBalance: parseFloat(a.crossWalletBalance),
            crossUnPnl: parseFloat(a.crossUnPnl),
            availableBalance: parseFloat(a.availableBalance),
            maxWithdrawAmount: parseFloat(a.maxWithdrawAmount),
            marginAvailable: a.marginAvailable,
            updateTime: a.updateTime
        })),

        positions: raw.positions.map(p => ({
            symbol: p.symbol,
            positionSide: p.positionSide as 'BOTH' | 'LONG' | 'SHORT',
            positionAmt: parseFloat(p.positionAmt),
            unrealizedProfit: parseFloat(p.unrealizedProfit),
            isolatedMargin: parseFloat(p.isolatedMargin),
            notional: parseFloat(p.notional),
            isolatedWallet: parseFloat(p.isolatedWallet),
            initialMargin: parseFloat(p.initialMargin),
            maintMargin: parseFloat(p.maintMargin),
            updateTime: p.updateTime
        })),

        lastUpdate: Date.now(),
        isMultiAssetMode: hasMarginAvailable
    };
}
