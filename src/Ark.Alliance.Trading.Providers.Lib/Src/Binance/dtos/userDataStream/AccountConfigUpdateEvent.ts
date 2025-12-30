/**
 * @fileoverview Account Config Update Event
 * @module dtos/userDataStream/AccountConfigUpdateEvent
 * 
 * Event pushed when account configuration changes (leverage or multi-assets mode).
 * Reference: Binance USDⓈ-M Futures User Data Streams
 */

import { Result } from '../../../Common/result/Result';

// ═══════════════════════════════════════════════════════════════════════════════
// Raw Event (from Binance WebSocket)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw ACCOUNT_CONFIG_UPDATE event from Binance WebSocket.
 * 
 * @remarks
 * Contains either `ac` for leverage change or `ai` for multi-assets mode change,
 * but never both in the same event.
 */
export interface AccountConfigUpdateRaw {
    /** Event type - always 'ACCOUNT_CONFIG_UPDATE' */
    e: 'ACCOUNT_CONFIG_UPDATE';
    /** Event Time */
    E: number;
    /** Transaction Time */
    T: number;
    /** Account config - leverage change (optional) */
    ac?: {
        /** Symbol */
        s: string;
        /** Leverage value */
        l: number;
    };
    /** Account info - multi-assets mode change (optional) */
    ai?: {
        /** Multi-Assets Mode enabled */
        j: boolean;
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parsed Event
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Leverage update data.
 */
export interface LeverageUpdate {
    /** Trading symbol */
    symbol: string;
    /** New leverage value */
    leverage: number;
}

/**
 * Parsed ACCOUNT_CONFIG_UPDATE event with typed fields.
 */
export interface AccountConfigUpdateEvent {
    /** Event type - always 'ACCOUNT_CONFIG_UPDATE' */
    eventType: 'ACCOUNT_CONFIG_UPDATE';
    /** Event time (ms) */
    eventTime: number;
    /** Transaction time (ms) */
    transactionTime: number;
    /** Leverage update data (if this is a leverage change event) */
    leverageUpdate?: LeverageUpdate;
    /** Multi-assets mode setting (if this is a multi-assets mode change) */
    multiAssetsMode?: boolean;
    /** Whether this event is a leverage change */
    isLeverageChange: boolean;
    /** Whether this event is a multi-assets mode change */
    isMultiAssetsModeChange: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parser
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parses a raw ACCOUNT_CONFIG_UPDATE event from Binance.
 * 
 * @param raw - Raw event from WebSocket.
 * @returns Result containing parsed event or error.
 */
export function parseAccountConfigUpdate(raw: AccountConfigUpdateRaw): Result<AccountConfigUpdateEvent> {
    try {
        const event: AccountConfigUpdateEvent = {
            eventType: 'ACCOUNT_CONFIG_UPDATE',
            eventTime: raw.E,
            transactionTime: raw.T,
            leverageUpdate: raw.ac ? {
                symbol: raw.ac.s,
                leverage: raw.ac.l
            } : undefined,
            multiAssetsMode: raw.ai?.j,
            isLeverageChange: !!raw.ac,
            isMultiAssetsModeChange: !!raw.ai
        };
        return Result.ok(event);
    } catch (error) {
        return Result.fromError<AccountConfigUpdateEvent>(
            error instanceof Error ? error : new Error('Failed to parse ACCOUNT_CONFIG_UPDATE event'),
            'PARSE_ERROR'
        );
    }
}

/**
 * Type guard to check if raw message is an ACCOUNT_CONFIG_UPDATE event.
 */
export function isAccountConfigUpdateEvent(raw: unknown): raw is AccountConfigUpdateRaw {
    return typeof raw === 'object' &&
        raw !== null &&
        (raw as AccountConfigUpdateRaw).e === 'ACCOUNT_CONFIG_UPDATE';
}
