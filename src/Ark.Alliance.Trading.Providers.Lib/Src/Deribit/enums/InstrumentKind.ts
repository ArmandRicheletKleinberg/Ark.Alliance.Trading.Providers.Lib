/**
 * @fileoverview Deribit Instrument Kind Enum
 * @module Deribit/enums/InstrumentKind
 *
 * Defines the types of instruments available on Deribit.
 */

/**
 * Deribit instrument kind.
 * @remarks From Deribit API: "future", "option", "spot", "future_combo", "option_combo"
 */
export enum InstrumentKind {
    FUTURE = 'future',
    OPTION = 'option',
    SPOT = 'spot',
    FUTURE_COMBO = 'future_combo',
    OPTION_COMBO = 'option_combo'
}

/**
 * Type alias for instrument kind values.
 */
export type InstrumentKindType = `${InstrumentKind}`;

/**
 * Check if instrument is a derivative.
 */
export function isDerivative(kind: InstrumentKind): boolean {
    return kind === InstrumentKind.FUTURE || kind === InstrumentKind.OPTION;
}

/**
 * Check if instrument is a combo/spread.
 */
export function isCombo(kind: InstrumentKind): boolean {
    return kind === InstrumentKind.FUTURE_COMBO || kind === InstrumentKind.OPTION_COMBO;
}

/**
 * Check if instrument is an option.
 */
export function isOption(kind: InstrumentKind): boolean {
    return kind === InstrumentKind.OPTION || kind === InstrumentKind.OPTION_COMBO;
}
