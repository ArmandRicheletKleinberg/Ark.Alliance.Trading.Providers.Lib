/**
 * @fileoverview Strategy Domain Events
 * @module Binance/domain/events/StrategyEvents
 *
 * Defines domain events related to trading strategy lifecycle and execution.
 * These events are used for strategy monitoring, logging, and state management.
 */

/**
 * Strategy event type constants.
 *
 * @remarks
 * These events represent key moments in a trading strategy's lifecycle:
 * - Lifecycle events: start, stop, pause, resume
 * - Signal events: entry, exit, reversal signals
 * - Execution events: order placement, fill, error
 * - State events: position change, PnL update
 */
export const STRATEGY_EVENTS = {
    // ═══════════════════════════════════════════════════════════════════════════════
    // Lifecycle Events
    // ═══════════════════════════════════════════════════════════════════════════════

    /** Strategy has been initialized and is ready to start. */
    STRATEGY_INITIALIZED: 'strategyInitialized',

    /** Strategy has started executing. */
    STRATEGY_STARTED: 'strategyStarted',

    /** Strategy has been stopped. */
    STRATEGY_STOPPED: 'strategyStopped',

    /** Strategy has been paused (temporary halt). */
    STRATEGY_PAUSED: 'strategyPaused',

    /** Strategy has resumed from paused state. */
    STRATEGY_RESUMED: 'strategyResumed',

    /** Strategy encountered a fatal error and stopped. */
    STRATEGY_ERROR: 'strategyError',

    // ═══════════════════════════════════════════════════════════════════════════════
    // Signal Events
    // ═══════════════════════════════════════════════════════════════════════════════

    /** A new trading signal has been generated. */
    SIGNAL_GENERATED: 'signalGenerated',

    /** Entry signal detected (go long or short). */
    ENTRY_SIGNAL: 'entrySignal',

    /** Exit signal detected (close position). */
    EXIT_SIGNAL: 'exitSignal',

    /** Reversal signal detected (flip position direction). */
    REVERSAL_SIGNAL: 'reversalSignal',

    /** Signal was filtered out (did not pass validation). */
    SIGNAL_FILTERED: 'signalFiltered',

    // ═══════════════════════════════════════════════════════════════════════════════
    // Execution Events
    // ═══════════════════════════════════════════════════════════════════════════════

    /** Order placement initiated. */
    ORDER_PLACING: 'orderPlacing',

    /** Order placed successfully. */
    ORDER_PLACED: 'orderPlaced',

    /** Order placement failed. */
    ORDER_FAILED: 'orderFailed',

    /** Order was filled (partial or complete). */
    ORDER_FILLED: 'orderFilled',

    /** Order was cancelled. */
    ORDER_CANCELLED: 'orderCancelled',

    /** Order was rejected by exchange. */
    ORDER_REJECTED: 'orderRejected',

    // ═══════════════════════════════════════════════════════════════════════════════
    // Position Events
    // ═══════════════════════════════════════════════════════════════════════════════

    /** New position opened. */
    POSITION_OPENED: 'positionOpened',

    /** Position size increased. */
    POSITION_INCREASED: 'positionIncreased',

    /** Position size decreased (partial close). */
    POSITION_DECREASED: 'positionDecreased',

    /** Position fully closed. */
    POSITION_CLOSED: 'positionClosed',

    /** Position direction reversed. */
    POSITION_REVERSED: 'positionReversed',

    /** Position liquidated by exchange. */
    POSITION_LIQUIDATED: 'positionLiquidated',

    // ═══════════════════════════════════════════════════════════════════════════════
    // PnL Events
    // ═══════════════════════════════════════════════════════════════════════════════

    /** Unrealized PnL updated. */
    UNREALIZED_PNL_UPDATED: 'unrealizedPnlUpdated',

    /** Realized PnL recorded (trade closed). */
    REALIZED_PNL_RECORDED: 'realizedPnlRecorded',

    /** Take profit level hit. */
    TAKE_PROFIT_HIT: 'takeProfitHit',

    /** Stop loss level hit. */
    STOP_LOSS_HIT: 'stopLossHit',

    /** Trailing stop triggered. */
    TRAILING_STOP_TRIGGERED: 'trailingStopTriggered',

    // ═══════════════════════════════════════════════════════════════════════════════
    // Risk Events
    // ═══════════════════════════════════════════════════════════════════════════════

    /** Risk limit threshold approached. */
    RISK_WARNING: 'riskWarning',

    /** Maximum drawdown exceeded. */
    MAX_DRAWDOWN_EXCEEDED: 'maxDrawdownExceeded',

    /** Daily loss limit reached. */
    DAILY_LOSS_LIMIT_REACHED: 'dailyLossLimitReached',

    /** Position size limit reached. */
    POSITION_LIMIT_REACHED: 'positionLimitReached'

} as const;

/**
 * Type for strategy event names.
 */
export type StrategyEventType = typeof STRATEGY_EVENTS[keyof typeof STRATEGY_EVENTS];

/**
 * Base interface for all strategy events.
 */
export interface StrategyEventBase {
    /** Event type. */
    readonly type: StrategyEventType;

    /** Timestamp of the event. */
    readonly timestamp: number;

    /** Strategy identifier. */
    readonly strategyId: string;

    /** Instrument symbol. */
    readonly instrument?: string;
}

/**
 * Strategy lifecycle event.
 */
export interface StrategyLifecycleEvent extends StrategyEventBase {
    readonly type: typeof STRATEGY_EVENTS.STRATEGY_STARTED |
    typeof STRATEGY_EVENTS.STRATEGY_STOPPED |
    typeof STRATEGY_EVENTS.STRATEGY_PAUSED |
    typeof STRATEGY_EVENTS.STRATEGY_RESUMED |
    typeof STRATEGY_EVENTS.STRATEGY_ERROR;

    /** Reason for the lifecycle change. */
    readonly reason?: string;

    /** Error details if applicable. */
    readonly error?: string;
}

/**
 * Signal event.
 */
export interface SignalEvent extends StrategyEventBase {
    readonly type: typeof STRATEGY_EVENTS.SIGNAL_GENERATED |
    typeof STRATEGY_EVENTS.ENTRY_SIGNAL |
    typeof STRATEGY_EVENTS.EXIT_SIGNAL |
    typeof STRATEGY_EVENTS.REVERSAL_SIGNAL;

    /** Signal direction. */
    readonly direction: 'LONG' | 'SHORT' | 'NEUTRAL';

    /** Signal strength (0-1). */
    readonly strength?: number;

    /** Signal source/indicator name. */
    readonly source?: string;
}

/**
 * Execution event.
 */
export interface ExecutionEvent extends StrategyEventBase {
    readonly type: typeof STRATEGY_EVENTS.ORDER_PLACED |
    typeof STRATEGY_EVENTS.ORDER_FILLED |
    typeof STRATEGY_EVENTS.ORDER_CANCELLED |
    typeof STRATEGY_EVENTS.ORDER_REJECTED;

    /** Order ID. */
    readonly orderId: string;

    /** Order side. */
    readonly side: 'BUY' | 'SELL';

    /** Order quantity. */
    readonly quantity: string;

    /** Order price (if limit). */
    readonly price?: string;

    /** Fill price (if filled). */
    readonly fillPrice?: string;
}

/**
 * Position event.
 */
export interface PositionEvent extends StrategyEventBase {
    readonly type: typeof STRATEGY_EVENTS.POSITION_OPENED |
    typeof STRATEGY_EVENTS.POSITION_CLOSED |
    typeof STRATEGY_EVENTS.POSITION_REVERSED;

    /** Position size. */
    readonly size: string;

    /** Position direction. */
    readonly direction: 'LONG' | 'SHORT' | 'FLAT';

    /** Entry price. */
    readonly entryPrice?: string;

    /** Exit price (if closed). */
    readonly exitPrice?: string;

    /** Realized PnL (if closed). */
    readonly realizedPnl?: string;
}

/**
 * Union type for all strategy events.
 */
export type StrategyEvent =
    | StrategyLifecycleEvent
    | SignalEvent
    | ExecutionEvent
    | PositionEvent
    | StrategyEventBase;
