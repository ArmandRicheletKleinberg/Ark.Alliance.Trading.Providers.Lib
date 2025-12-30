/**
 * @fileoverview Deribit Account Mapper
 * @module Deribit/mappers/DeribitAccountMapper
 *
 * Pure functions for mapping Deribit account summary DTOs.
 * Pattern aligned with Binance's AccountMapper implementation (if exists).
 */

import { DeribitAccountSummary } from '../dtos';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Common account summary interface.
 */
export interface IAccountSummary {
    readonly currency: string;
    readonly balance: string;
    readonly equity: string;
    readonly availableFunds: string;
    readonly availableWithdrawalFunds: string;
    readonly initialMargin: string;
    readonly maintenanceMargin: string;
    readonly unrealizedPnl: string;
    readonly realizedPnl: string;
    readonly marginRatio: number;
    readonly isMarginWarning: boolean;
    readonly isMarginCritical: boolean;
    readonly providerData: unknown;
}

/**
 * Margin thresholds for warnings.
 */
export const MARGIN_THRESHOLDS = {
    WARNING: 0.7,
    CRITICAL: 0.9
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate margin utilization ratio.
 *
 * @param summary - Account summary
 * @returns Margin ratio (0-1+, where 1 = 100% margin used)
 */
export function calculateMarginRatio(summary: DeribitAccountSummary): number {
    if (summary.equity <= 0) return 1;
    return summary.initial_margin / summary.equity;
}

/**
 * Check if account is in margin warning state.
 *
 * @param summary - Account summary
 * @returns true if margin ratio exceeds warning threshold
 */
export function isMarginWarning(summary: DeribitAccountSummary): boolean {
    return calculateMarginRatio(summary) >= MARGIN_THRESHOLDS.WARNING;
}

/**
 * Check if account is in margin critical state.
 *
 * @param summary - Account summary
 * @returns true if margin ratio exceeds critical threshold
 */
export function isMarginCritical(summary: DeribitAccountSummary): boolean {
    return calculateMarginRatio(summary) >= MARGIN_THRESHOLDS.CRITICAL;
}

/**
 * Calculate available margin percentage.
 *
 * @param summary - Account summary
 * @returns Available margin as percentage (0-100)
 */
export function getAvailableMarginPercent(summary: DeribitAccountSummary): number {
    if (summary.equity <= 0) return 0;
    return (summary.available_funds / summary.equity) * 100;
}

/**
 * Get total session PnL (unrealized + realized).
 *
 * @param summary - Account summary
 * @returns Total session PnL
 */
export function getTotalSessionPnl(summary: DeribitAccountSummary): number {
    return summary.session_upl + summary.session_rpl;
}

/**
 * Get futures session PnL.
 *
 * @param summary - Account summary
 * @returns Futures session PnL
 */
export function getFuturesSessionPnl(summary: DeribitAccountSummary): number {
    return summary.futures_session_upl + summary.futures_session_rpl;
}

/**
 * Get options session PnL.
 *
 * @param summary - Account summary
 * @returns Options session PnL
 */
export function getOptionsSessionPnl(summary: DeribitAccountSummary): number {
    return summary.options_session_upl + summary.options_session_rpl;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Mappers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map DeribitAccountSummary to common IAccountSummary interface.
 *
 * @param summary - Deribit account summary DTO
 * @returns Common IAccountSummary
 */
export function mapAccountSummaryToCommon(summary: DeribitAccountSummary): IAccountSummary {
    const marginRatio = calculateMarginRatio(summary);

    return {
        currency: summary.currency.toUpperCase(),
        balance: String(summary.balance),
        equity: String(summary.equity),
        availableFunds: String(summary.available_funds),
        availableWithdrawalFunds: String(summary.available_withdrawal_funds),
        initialMargin: String(summary.initial_margin),
        maintenanceMargin: String(summary.maintenance_margin),
        unrealizedPnl: String(summary.session_upl),
        realizedPnl: String(summary.session_rpl),
        marginRatio,
        isMarginWarning: marginRatio >= MARGIN_THRESHOLDS.WARNING,
        isMarginCritical: marginRatio >= MARGIN_THRESHOLDS.CRITICAL,
        providerData: summary
    };
}

/**
 * Map array of Deribit account summaries to common format.
 *
 * @param summaries - Array of Deribit account summaries
 * @returns Array of common IAccountSummary
 */
export function mapAccountSummariesToCommon(summaries: DeribitAccountSummary[]): IAccountSummary[] {
    return summaries.map(mapAccountSummaryToCommon);
}

/**
 * Get summary for display (formatted strings).
 *
 * @param summary - Account summary
 * @returns Display-friendly object
 */
export function getAccountDisplaySummary(summary: DeribitAccountSummary): {
    currency: string;
    equity: string;
    availableFunds: string;
    marginUsed: string;
    pnl: string;
    status: 'healthy' | 'warning' | 'critical';
} {
    const marginRatio = calculateMarginRatio(summary);
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (marginRatio >= MARGIN_THRESHOLDS.CRITICAL) status = 'critical';
    else if (marginRatio >= MARGIN_THRESHOLDS.WARNING) status = 'warning';

    return {
        currency: summary.currency.toUpperCase(),
        equity: summary.equity.toFixed(8),
        availableFunds: summary.available_funds.toFixed(8),
        marginUsed: `${(marginRatio * 100).toFixed(2)}%`,
        pnl: getTotalSessionPnl(summary).toFixed(8),
        status
    };
}
