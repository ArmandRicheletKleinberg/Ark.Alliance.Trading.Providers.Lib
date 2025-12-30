/**
 * @fileoverview Algo Order Update Stream Event
 * @module dtos/userDataStream/AlgoUpdateStreamEvent
 * 
 * Event pushed when algo (conditional) order status changes.
 * Reference: Binance USDⓈ-M Futures User Data Streams
 */

import { Result } from '../../../Common/result/Result';
import {
    OrderSide,
    PositionSide,
    TimeInForce,
    WorkingType,
    type OrderSideType,
    type PositionSideType,
    type TimeInForceType,
    type WorkingTypeType
} from '../../enums';
import { AlgoOrderStatus, isAlgoTerminalStatus, isAlgoActiveStatus } from '../binance/AlgoOrderUpdate';

// ═══════════════════════════════════════════════════════════════════════════════
// Raw Event (from Binance WebSocket)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw ALGO_UPDATE event from Binance WebSocket.
 * 
 * @remarks
 * Note: E and T have swapped meanings compared to other events
 * - T: Event Time
 * - E: Transaction Time
 */
export interface AlgoUpdateRaw {
    /** Event type - always 'ALGO_UPDATE' */
    e: 'ALGO_UPDATE';
    /** Event Time (note: swapped with T) */
    T: number;
    /** Transaction Time (note: swapped with E) */
    E: number;
    /** Algo order data */
    o: {
        /** Client Algo ID */
        caid: string;
        /** Algo ID */
        aid: number;
        /** Algo Type (e.g., 'CONDITIONAL') */
        at: string;
        /** Order Type (e.g., 'TAKE_PROFIT') */
        o: string;
        /** Symbol */
        s: string;
        /** Side: BUY or SELL */
        S: string;
        /** Position Side */
        ps: string;
        /** Time in Force */
        f: string;
        /** Quantity */
        q: string;
        /** Algo Status */
        X: string;
        /** Order ID (in matching engine) */
        ai: string;
        /** Average fill price in matching engine */
        ap: string;
        /** Executed quantity in matching engine */
        aq: string;
        /** Actual order type in matching engine */
        act: string;
        /** Trigger price */
        tp: string;
        /** Order price */
        p: string;
        /** STP mode */
        V: string;
        /** Working type */
        wt: string;
        /** Price match mode */
        pm: string;
        /** If Close-All */
        cp: boolean;
        /** If price protection is on */
        pP: boolean;
        /** Is reduce only */
        R: boolean;
        /** Trigger time */
        tt: number;
        /** GTD time */
        gtd: number;
        /** Failed reason */
        rm: string;
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parsed Event
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parsed ALGO_UPDATE event with typed fields.
 */
export interface AlgoUpdateEvent {
    /** Event type - always 'ALGO_UPDATE' */
    eventType: 'ALGO_UPDATE';
    /** Event time (ms) */
    eventTime: number;
    /** Transaction time (ms) */
    transactionTime: number;

    // Algo identification
    /** Client-assigned algo ID */
    clientAlgoId: string;
    /** System algo ID */
    algoId: number;
    /** Algo type (e.g., 'CONDITIONAL') */
    algoType: string;

    // Order details
    /** Order type (e.g., 'TAKE_PROFIT', 'STOP_LOSS') */
    orderType: string;
    /** Trading symbol */
    symbol: string;
    /** Order side */
    side: OrderSideType;
    /** Position side */
    positionSide: PositionSideType;
    /** Time in force */
    timeInForce: TimeInForceType;
    /** Order quantity */
    quantity: string;

    // Status
    /** Current algo status */
    algoStatus: AlgoOrderStatus;

    // Matching engine data (only when triggered)
    /** Order ID in matching engine */
    matchingEngineOrderId: string;
    /** Average fill price */
    avgFillPrice: string;
    /** Executed quantity */
    executedQty: string;
    /** Actual order type in matching engine */
    actualOrderType: string;

    // Trigger conditions
    /** Trigger price */
    triggerPrice: string;
    /** Order price */
    orderPrice: string;
    /** Working type for trigger */
    workingType: WorkingTypeType;
    /** Trigger time (ms) */
    triggerTime: number;

    // Flags
    /** STP (Self-Trade Prevention) mode */
    stpMode: string;
    /** Price match mode */
    priceMatchMode: string;
    /** Whether this is a close-all order */
    closeAll: boolean;
    /** Whether price protection is enabled */
    priceProtection: boolean;
    /** Whether this is reduce-only */
    reduceOnly: boolean;

    // GTD
    /** Good-till-date time (ms) */
    gtdTime: number;

    // Failure
    /** Reason for failure (if failed) */
    failedReason: string;

    // Computed helpers
    /** Whether the algo order is in a terminal state */
    isTerminal: boolean;
    /** Whether the algo order is active */
    isActive: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parser
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parses a raw ALGO_UPDATE event from Binance.
 * 
 * @param raw - Raw event from WebSocket.
 * @returns Result containing parsed event or error.
 */
export function parseAlgoUpdate(raw: AlgoUpdateRaw): Result<AlgoUpdateEvent> {
    try {
        const o = raw.o;
        const algoStatus = o.X as AlgoOrderStatus;

        const event: AlgoUpdateEvent = {
            eventType: 'ALGO_UPDATE',
            // Note: E and T are swapped in ALGO_UPDATE
            eventTime: raw.T,
            transactionTime: raw.E,

            // Identification
            clientAlgoId: o.caid,
            algoId: o.aid,
            algoType: o.at,

            // Order details
            orderType: o.o,
            symbol: o.s,
            side: o.S as OrderSideType,
            positionSide: o.ps as PositionSideType,
            timeInForce: o.f as TimeInForceType,
            quantity: o.q,

            // Status
            algoStatus,

            // Matching engine
            matchingEngineOrderId: o.ai,
            avgFillPrice: o.ap,
            executedQty: o.aq,
            actualOrderType: o.act,

            // Trigger
            triggerPrice: o.tp,
            orderPrice: o.p,
            workingType: o.wt as WorkingTypeType,
            triggerTime: o.tt,

            // Flags
            stpMode: o.V,
            priceMatchMode: o.pm,
            closeAll: o.cp,
            priceProtection: o.pP,
            reduceOnly: o.R,

            // GTD
            gtdTime: o.gtd,

            // Failure
            failedReason: o.rm,

            // Computed
            isTerminal: algoStatus === AlgoOrderStatus.FINISHED ||
                algoStatus === AlgoOrderStatus.REJECTED ||
                algoStatus === AlgoOrderStatus.EXPIRED ||
                algoStatus === AlgoOrderStatus.CANCELLED,
            isActive: algoStatus === AlgoOrderStatus.NEW ||
                algoStatus === AlgoOrderStatus.TRIGGERING ||
                algoStatus === AlgoOrderStatus.TRIGGERED
        };
        return Result.ok(event);
    } catch (error) {
        return Result.fromError<AlgoUpdateEvent>(
            error instanceof Error ? error : new Error('Failed to parse ALGO_UPDATE event'),
            'PARSE_ERROR'
        );
    }
}

/**
 * Type guard to check if raw message is an ALGO_UPDATE event.
 */
export function isAlgoUpdateEvent(raw: unknown): raw is AlgoUpdateRaw {
    return typeof raw === 'object' &&
        raw !== null &&
        (raw as AlgoUpdateRaw).e === 'ALGO_UPDATE';
}
