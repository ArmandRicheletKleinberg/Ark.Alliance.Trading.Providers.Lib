/**
 * @fileoverview Domain Layer Barrel Export
 * @module domain
 *
 * Provides centralized exports for the entire domain layer.
 * The domain layer contains the core business logic, entities,
 * value objects, and domain events.
 *
 * @example
 * ```typescript
 * import {
 *     BaseEvent,
 *     EventType,
 *     OrderFilledEvent
 * } from '../domain';
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Domain Events
// ═══════════════════════════════════════════════════════════════════════════════

export * from './events';

// ═══════════════════════════════════════════════════════════════════════════════
// Value Objects
// ═══════════════════════════════════════════════════════════════════════════════

export * from './value-objects';
