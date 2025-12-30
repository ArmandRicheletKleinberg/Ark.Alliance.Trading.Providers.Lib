/**
 * @fileoverview Common Module Barrel Export
 * @module Common
 *
 * Centralized exports for common infrastructure components.
 * Provides cross-cutting concerns used throughout the application.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Result Pattern
// ═══════════════════════════════════════════════════════════════════════════════

export * from './result';

// ═══════════════════════════════════════════════════════════════════════════════
// Service Infrastructure
// ═══════════════════════════════════════════════════════════════════════════════

export * from './services';

// ═══════════════════════════════════════════════════════════════════════════════
// Domain Interfaces (Provider-Agnostic)
// ═══════════════════════════════════════════════════════════════════════════════

export * from './Domain';

// ═══════════════════════════════════════════════════════════════════════════════
// Client Interfaces (Provider-Agnostic)
// ═══════════════════════════════════════════════════════════════════════════════

export * from './Clients';

// ═══════════════════════════════════════════════════════════════════════════════
// Cache Infrastructure
// ═══════════════════════════════════════════════════════════════════════════════

export * from './helpers/cache';

// ═══════════════════════════════════════════════════════════════════════════════
// Logging Infrastructure
// ═══════════════════════════════════════════════════════════════════════════════

export * from './helpers/logging';

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

// Concurrency
export { AsyncLock, getSharedLock } from './helpers/concurrency/AsyncLock';

// Utilities
export * from './helpers/MathUtils';
export * from './helpers/TimeUtils';
export * from './helpers/QuantityUtils';
export * from './helpers/types';
