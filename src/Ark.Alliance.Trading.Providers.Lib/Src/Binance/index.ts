/**
 * @fileoverview Binance Provider Library Main Export
 * @module Binance
 *
 * Provides centralized exports for the Binance provider library.
 * This is the main entry point for consuming the library.
 *
 * @remarks
 * The library follows Clean Architecture principles.
 * Enums are exported from ./enums - single source of truth.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Enums (Consolidated - single source of truth)
// ═══════════════════════════════════════════════════════════════════════════════

export * from './enums';

// ═══════════════════════════════════════════════════════════════════════════════
// Domain Layer (cache, events)
// ═══════════════════════════════════════════════════════════════════════════════

export * from './domain/cache';
export * from './domain/events';

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs (Data Transfer Objects) - use the dtos barrel
// ═══════════════════════════════════════════════════════════════════════════════

export * from './dtos';

// ═══════════════════════════════════════════════════════════════════════════════
// Clients (Infrastructure Layer)
// ═══════════════════════════════════════════════════════════════════════════════

export * from './clients';

// ═══════════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════════

export * from './utils';

// ═══════════════════════════════════════════════════════════════════════════════
// Shared (Constants, Errors)
// ═══════════════════════════════════════════════════════════════════════════════

export * from './shared';

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers (Binance-specific security, etc.)
// ═══════════════════════════════════════════════════════════════════════════════

export * from './helpers';
