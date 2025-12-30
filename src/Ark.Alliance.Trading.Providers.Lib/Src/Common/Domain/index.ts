/**
 * @fileoverview Common Domain Barrel Export
 * @module Common/Domain
 *
 * Centralized exports for provider-agnostic domain interfaces.
 */

// Order interfaces and helpers
export {
    OrderSide,
    OrderType,
    OrderStatus,
    TimeInForce,
    IOrder,
    IOrderUpdate,
    isTerminalOrderStatus,
    getOppositeSide
} from './IOrder';

// Position interfaces and helpers
export {
    PositionDirection,
    MarginType,
    IPosition,
    IPositionUpdate,
    isFlat,
    getDirectionFromSize
} from './IPosition';

// Market data interfaces and helpers
export {
    IQuote,
    ITicker,
    IOrderBookLevel,
    IOrderBook,
    ITrade,
    IKline,
    getMidPrice,
    getSpread,
    getSpreadPercent
} from './IMarketData';

// Instrument interfaces
export {
    InstrumentType,
    OptionType,
    SettlementType,
    IInstrument,
    ParsedDeribitInstrument,
    ParsedBinanceInstrument
} from './IInstrument';

// Account interfaces and helpers
export {
    AccountCurrency,
    IAccount,
    IAccountUpdate,
    IAccountBalance,
    getMarginUtilization,
    hasSufficientMargin,
    isMarginAtRisk
} from './IAccount';
