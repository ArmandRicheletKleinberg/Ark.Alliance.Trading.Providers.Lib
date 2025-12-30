/**
 * @fileoverview Grid Update Stream Event
 * @module dtos/userDataStream/GridUpdateStreamEvent
 * 
 * Event pushed when a grid strategy order is filled or partially filled.
 * Reference: Binance USDⓈ-M Futures User Data Streams
 */

import { Result } from '../../../Common/result/Result';
import { GridStrategyStatus, type GridStrategyStatusType } from '../../enums/UserDataStreamEnums';

// ═══════════════════════════════════════════════════════════════════════════════
// Raw Event (from Binance WebSocket)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw GRID_UPDATE event from Binance WebSocket.
 */
export interface GridUpdateRaw {
    /** Event type - always 'GRID_UPDATE' */
    e: 'GRID_UPDATE';
    /** Transaction Time */
    T: number;
    /** Event Time */
    E: number;
    /** Grid update data */
    gu: {
        /** Strategy ID */
        si: number;
        /** Strategy Type (e.g., 'GRID') */
        st: string;
        /** Strategy Status */
        ss: string;
        /** Symbol */
        s: string;
        /** Realized PNL */
        r: string;
        /** Unmatched Average Price */
        up: string;
        /** Unmatched Quantity */
        uq: string;
        /** Unmatched Fee */
        uf: string;
        /** Matched PNL */
        mp: string;
        /** Update Time */
        ut: number;
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parsed Event
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Grid strategy data from update event.
 */
export interface GridStrategyData {
    /** Unique strategy ID */
    strategyId: number;
    /** Strategy type (e.g., 'GRID') */
    strategyType: string;
    /** Current strategy status */
    strategyStatus: GridStrategyStatusType;
    /** Trading symbol */
    symbol: string;
    /** Realized PNL from strategy */
    realizedPnl: string;
    /** Average price of unmatched orders */
    unmatchedAvgPrice: string;
    /** Quantity of unmatched orders */
    unmatchedQty: string;
    /** Fee for unmatched orders */
    unmatchedFee: string;
    /** Matched PNL */
    matchedPnl: string;
    /** Timestamp of last update */
    updateTime: number;
}

/**
 * Parsed GRID_UPDATE event with typed fields.
 */
export interface GridUpdateEvent {
    /** Event type - always 'GRID_UPDATE' */
    eventType: 'GRID_UPDATE';
    /** Event time (ms) */
    eventTime: number;
    /** Transaction time (ms) */
    transactionTime: number;
    /** Grid strategy data */
    gridData: GridStrategyData;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parser
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parses a raw GRID_UPDATE event from Binance.
 * 
 * @param raw - Raw event from WebSocket.
 * @returns Result containing parsed event or error.
 */
export function parseGridUpdate(raw: GridUpdateRaw): Result<GridUpdateEvent> {
    try {
        const gu = raw.gu;

        const event: GridUpdateEvent = {
            eventType: 'GRID_UPDATE',
            eventTime: raw.E,
            transactionTime: raw.T,
            gridData: {
                strategyId: gu.si,
                strategyType: gu.st,
                strategyStatus: gu.ss as GridStrategyStatusType,
                symbol: gu.s,
                realizedPnl: gu.r,
                unmatchedAvgPrice: gu.up,
                unmatchedQty: gu.uq,
                unmatchedFee: gu.uf,
                matchedPnl: gu.mp,
                updateTime: gu.ut
            }
        };
        return Result.ok(event);
    } catch (error) {
        return Result.fromError<GridUpdateEvent>(
            error instanceof Error ? error : new Error('Failed to parse GRID_UPDATE event'),
            'PARSE_ERROR'
        );
    }
}

/**
 * Type guard to check if raw message is a GRID_UPDATE event.
 */
export function isGridUpdateEvent(raw: unknown): raw is GridUpdateRaw {
    return typeof raw === 'object' &&
        raw !== null &&
        (raw as GridUpdateRaw).e === 'GRID_UPDATE';
}
