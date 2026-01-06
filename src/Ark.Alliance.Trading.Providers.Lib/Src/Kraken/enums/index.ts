/**
 * @fileoverview Kraken Enums Barrel Export
 * @module Kraken/enums
 *
 * Centralized exports for all Kraken enumerations.
 */

// Environment
export {
    KrakenEnvironment,
    isMainnet,
    isTestnet,
    getRestBaseUrl,
    getWsUrl,
    type KrakenEnvironmentType
} from './KrakenEnvironment';

// Order Side
export {
    KrakenOrderSide,
    getOppositeSide,
    type KrakenOrderSideType
} from './OrderSide';

// Order Type
export {
    KrakenOrderType,
    requiresPrice,
    requiresStopPrice,
    isStopOrder,
    type KrakenOrderTypeType
} from './OrderType';

// Order Status
export {
    KrakenOrderStatus,
    isTerminalState,
    isActiveState,
    hasBeenFilled,
    type KrakenOrderStatusType
} from './OrderStatus';

// Time In Force
export {
    KrakenTimeInForce,
    requiresImmediateExecution,
    isPostOnly,
    type KrakenTimeInForceType
} from './TimeInForce';
