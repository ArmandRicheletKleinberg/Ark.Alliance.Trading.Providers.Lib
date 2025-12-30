/**
 * @fileoverview Event Generator
 * @module Mocks/Generators/EventGenerator
 *
 * Generates realistic WebSocket event sequences for testing event-driven scenarios.
 * Simulates Binance User Data Stream events: ORDER_UPDATE, ACCOUNT_UPDATE, MARGIN_CALL.
 *
 * @remarks
 * Design Philosophy (Open/Closed Principle):
 * - Event sequences are CLOSED to modification (core patterns stable)
 * - New event types can be ADDED via extension
 * - All event timing is deterministic for reproducible tests
 *
 * Future Considerations:
 * - Adding new event types: Create new generate*Event() method
 * - DO NOT change existing event structure without migration plan
 * - Event sequences should always be backward-compatible
 */

import { MockOrderUpdate, MockAlgoOrderUpdate } from './OrderGenerator';
import { MockPositionRisk } from './PositionGenerator';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * User Data Stream event types.
 */
export type UserDataEventType =
    | 'ORDER_TRADE_UPDATE'
    | 'ACCOUNT_UPDATE'
    | 'MARGIN_CALL'
    | 'listenKeyExpired';

/**
 * ORDER_TRADE_UPDATE event structure.
 */
export interface OrderTradeUpdateEvent {
    e: 'ORDER_TRADE_UPDATE';
    E: number; // Event time
    T: number; // Transaction time
    o: {
        s: string;  // Symbol
        c: string;  // Client order ID
        S: string;  // Side
        o: string;  // Order type
        f: string;  // Time in force
        q: string;  // Original quantity
        p: string;  // Price
        ap: string; // Average price
        sp: string; // Stop price
        x: string;  // Execution type
        X: string;  // Order status
        i: number;  // Order ID
        l: string;  // Last filled quantity
        z: string;  // Cumulative filled quantity
        L: string;  // Last filled price
        N: string;  // Commission asset
        n: string;  // Commission
        T: number;  // Order trade time
        t: number;  // Trade ID
        b: string;  // Bids notional
        a: string;  // Ask notional
        m: boolean; // Is maker side?
        R: boolean; // Reduce only
        wt: string; // Working type
        ot: string; // Original order type
        ps: string; // Position side
        cp: boolean; // Close position
        AP: string;  // Activation price (trailing stop)
        cr: string;  // Callback rate (trailing stop)
        pP: boolean; // Protected
        si: number;  // Stop working indicator
        ss: number;  // Stop working time
        rp: string;  // Realized profit
    };
}

/**
 * ACCOUNT_UPDATE evento structure.
 */
export interface AccountUpdateEvent {
    e: 'ACCOUNT_UPDATE';
    E: number; // Event time
    T: number; // Transaction time
    a: {
        m: string;  // Event reason type
        B: Array<{ // Balances
            a: string;  // Asset
            wb: string; // Wallet balance
            cw: string; // Cross wallet balance
            bc: string; // Balance change
        }>;
        P: Array<{ // Positions
            s: string;  // Symbol
            pa: string; // Position amount
            ep: string; // Entry price
            cr: string; // (Pre-fee) Accumulated realized
            up: string; // Unrealized PnL
            mt: string; // Margin type
            iw: string; // Isolated wallet (if isolated position)
            ps: string; // Position side
        }>;
    };
}

/**
 * MARGIN_CALL event structure.
 */
export interface MarginCallEvent {
    e: 'MARGIN_CALL';
    E: number; // Event time
    cw: string; // Cross wallet balance
    p: Array<{  // Positions of margin call
        s: string;  // Symbol
        ps: string; // Position side
        pa: string; // Position amount
        mt: string; // Margin type
        iw: string; // Isolated wallet (if isolated position)
        mp: string; // Mark price
        up: string; // Unrealized PnL
        mm: string; // Maintenance margin required
    }>;
}

/**
 * Listen key expired event.
 */
export interface ListenKeyExpiredEvent {
    e: 'listenKeyExpired';
    E: number;
    listenKey: string;
}

/**
 * Union type for all events.
 */
export type UserDataEvent =
    | OrderTradeUpdateEvent
    | AccountUpdateEvent
    | MarginCallEvent
    | ListenKeyExpiredEvent;

/**
 * Event sequence configuration.
 */
export interface EventSequenceConfig {
    /** Delay in ms before emitting event */
    delay: number;

    /** Event type */
    type: UserDataEventType;

    /** Event data (generator will create if not provided) */
    data?: Partial<any>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event Generator
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates realistic WebSocket event sequences for mock testing.
 *
 * @remarks
 * IMMUTABLE DESIGN: Event structures must remain backward-compatible
 * Adding new fields is OK, removing/changing existing fields requires migration
 */
export class EventGenerator {
    private currentTime: number = Date.now();

    /**
     * Generates an ORDER_TRADE_UPDATE event from an order.
     */
    public generateOrderUpdateEvent(
        order: MockOrderUpdate,
        executionType: string = 'TRADE'
    ): OrderTradeUpdateEvent {
        return {
            e: 'ORDER_TRADE_UPDATE',
            E: this.currentTime,
            T: this.currentTime,
            o: {
                s: order.symbol,
                c: order.clientOrderId,
                S: order.side,
                o: order.type,
                f: order.timeInForce,
                q: order.origQty,
                p: order.price,
                ap: order.avgPrice,
                sp: order.stopPrice || '0',
                x: executionType,
                X: order.status,
                i: order.orderId,
                l: '0',
                z: order.executedQty,
                L: '0',
                N: 'USDT',
                n: '0',
                T: order.updateTime,
                t: order.orderId + 1000,
                b: '0',
                a: '0',
                m: false,
                R: order.reduceOnly,
                wt: order.workingType || 'CONTRACT_PRICE',
                ot: order.origType || order.type,
                ps: order.positionSide,
                cp: order.closePosition,
                AP: order.activatePrice || '0',
                cr: order.priceRate || '0',
                pP: false,
                si: 0,
                ss: 0,
                rp: '0'
            }
        };
    }

    /**
     * Generates an ACCOUNT_UPDATE event from position data.
     */
    public generateAccountUpdateEvent(
        positions: MockPositionRisk[],
        reason: string = 'ORDER'
    ): AccountUpdateEvent {
        return {
            e: 'ACCOUNT_UPDATE',
            E: this.currentTime,
            T: this.currentTime,
            a: {
                m: reason,
                B: [
                    {
                        a: 'USDT',
                        wb: '10000.00000000',
                        cw: '10000.00000000',
                        bc: '0.00000000'
                    }
                ],
                P: positions.map(p => ({
                    s: p.symbol,
                    pa: p.positionAmt,
                    ep: p.entryPrice,
                    cr: '0',
                    up: p.unRealizedProfit,
                    mt: p.marginType,
                    iw: p.isolatedMargin,
                    ps: p.positionSide
                }))
            }
        };
    }

    /**
     * Generates a MARGIN_CALL event for near-liquidation scenarios.
     */
    public generateMarginCallEvent(
        positions: MockPositionRisk[]
    ): MarginCallEvent {
        return {
            e: 'MARGIN_CALL',
            E: this.currentTime,
            cw: '1000.00000000',
            p: positions.map(p => ({
                s: p.symbol,
                ps: p.positionSide,
                pa: p.positionAmt,
                mt: p.marginType,
                iw: p.isolatedMargin,
                mp: p.markPrice,
                up: p.unRealizedProfit,
                mm: (parseFloat(p.notional) * 0.004).toFixed(8)
            }))
        };
    }

    /**
     * Generates a listenKeyExpired event.
     */
    public generateListenKeyExpiredEvent(listenKey: string = 'mock_key'): ListenKeyExpiredEvent {
        return {
            e: 'listenKeyExpired',
            E: this.currentTime,
            listenKey
        };
    }

    /**
     * Generates a complete order lifecycle event sequence.
     * NEW → FILLED with corresponding ACCOUNT_UPDATE.
     */
    public generateOrderLifecycleSequence(
        order: MockOrderUpdate,
        position: MockPositionRisk
    ): EventSequenceConfig[] {
        return [
            {
                delay: 0,
                type: 'ORDER_TRADE_UPDATE',
                data: { ...order, status: 'NEW' }
            },
            {
                delay: 100,
                type: 'ORDER_TRADE_UPDATE',
                data: { ...order, status: 'FILLED', executedQty: order.origQty }
            },
            {
                delay: 150,
                type: 'ACCOUNT_UPDATE',
                data: { positions: [position] }
            }
        ];
    }

    /**
     * Generates partial fill sequence (multiple events).
     */
    public generatePartialFillSequence(
        order: MockOrderUpdate,
        fillSteps: number = 3
    ): EventSequenceConfig[] {
        const sequence: EventSequenceConfig[] = [];
        const totalQty = parseFloat(order.origQty);
        const stepQty = totalQty / fillSteps;

        for (let i = 1; i <= fillSteps; i++) {
            const executedQty = (stepQty * i).toFixed(4);
            const status = i === fillSteps ? 'FILLED' : 'PARTIALLY_FILLED';

            sequence.push({
                delay: i * 100,
                type: 'ORDER_TRADE_UPDATE',
                data: { ...order, status, executedQty }
            });
        }

        return sequence;
    }

    /**
     * Generates stop order trigger sequence.
     * Price crosses stop → order NEW → order FILLED → position update.
     */
    public generateStopTriggerSequence(
        order: MockOrderUpdate,
        position: MockPositionRisk
    ): EventSequenceConfig[] {
        return [
            {
                delay: 0,
                type: 'ORDER_TRADE_UPDATE',
                data: { ...order, status: 'NEW' }
            },
            {
                delay: 50,
                type: 'ORDER_TRADE_UPDATE',
                data: { ...order, status: 'FILLED', executedQty: order.origQty }
            },
            {
                delay: 100,
                type: 'ACCOUNT_UPDATE',
                data: { positions: [position], reason: 'STOP' }
            }
        ];
    }

    /**
     * Generates position inversion sequence.
     * LONG → CLOSE → SHORT (or vice versa).
     */
    public generatePositionInversionSequence(
        closeOrder: MockOrderUpdate,
        openOrder: MockOrderUpdate,
        neutralPosition: MockPositionRisk,
        newPosition: MockPositionRisk
    ): EventSequenceConfig[] {
        return [
            // Close existing position
            {
                delay: 0,
                type: 'ORDER_TRADE_UPDATE',
                data: { ...closeOrder, status: 'FILLED' }
            },
            {
                delay: 50,
                type: 'ACCOUNT_UPDATE',
                data: { positions: [neutralPosition] }
            },
            // Open new position (opposite side)
            {
                delay: 100,
                type: 'ORDER_TRADE_UPDATE',
                data: { ...openOrder, status: 'FILLED' }
            },
            {
                delay: 150,
                type: 'ACCOUNT_UPDATE',
                data: { positions: [newPosition] }
            }
        ];
    }

    /**
     * Generates margin call sequence (liquidation warning).
     */
    public generateMarginCallSequence(
        positions: MockPositionRisk[]
    ): EventSequenceConfig[] {
        return [
            {
                delay: 0,
                type: 'MARGIN_CALL',
                data: { positions }
            },
            {
                delay: 100,
                type: 'ACCOUNT_UPDATE',
                data: { positions, reason: 'MARGIN_CALL' }
            }
        ];
    }

    /**
     * Generates order cancellation sequence.
     */
    public generateCancellationSequence(
        order: MockOrderUpdate
    ): EventSequenceConfig[] {
        return [
            {
                delay: 0,
                type: 'ORDER_TRADE_UPDATE',
                data: { ...order, status: 'NEW' }
            },
            {
                delay: 100,
                type: 'ORDER_TRADE_UPDATE',
                data: { ...order, status: 'CANCELED', executedQty: '0' }
            }
        ];
    }

    /**
     * Advances internal clock (for deterministic timing).
     */
    public advanceTime(ms: number): void {
        this.currentTime += ms;
    }

    /**
     * Resets internal clock.
     */
    public resetTime(): void {
        this.currentTime = Date.now();
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a new EventGenerator instance.
 */
export function createEventGenerator(): EventGenerator {
    return new EventGenerator();
}
