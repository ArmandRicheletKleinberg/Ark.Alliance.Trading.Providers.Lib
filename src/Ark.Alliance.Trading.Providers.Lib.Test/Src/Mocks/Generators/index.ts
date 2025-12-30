/**
 * @fileoverview Mock Generators Barrel Export
 * @module Mocks/Generators
 *
 * Central export point for all mock data generators.
 */

// Export shared types from OrderGenerator to avoid duplication
export type {
    MockOrderType,
    MockOrderStatus,
    MockOrderSide,
    MockTimeInForce,
    MockPositionSide,
    MockWorkingType
} from './OrderGenerator';

// Export generator classes and their specific types
export * from './PriceSeriesGenerator';
export { OrderGenerator, createOrderGenerator, quickMarketOrder, quickLimitOrder } from './OrderGenerator';
export type { MockOrderConfig, MockOrderUpdate, MockAlgoOrderUpdate } from './OrderGenerator';

export { PositionGenerator, createPositionGenerator, quickLongPosition, quickShortPosition } from './PositionGenerator';
export type { MockMarginType, MockPositionConfig, MockPositionRisk, PositionScenario } from './PositionGenerator';

export { EventGenerator, createEventGenerator } from './EventGenerator';
export type {
    UserDataEventType,
    OrderTradeUpdateEvent,
    AccountUpdateEvent,
    MarginCallEvent,
    ListenKeyExpiredEvent,
    UserDataEvent,
    EventSequenceConfig
} from './EventGenerator';
