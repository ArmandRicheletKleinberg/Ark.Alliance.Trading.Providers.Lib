/**
 * @fileoverview UUID Generator Utility
 * @module Common/helpers/UuidGenerator
 *
 * Native UUID v4 generator using Node.js crypto.randomUUID().
 *
 * @remarks
 * Uses crypto.randomUUID() which is:
 * - Native to Node.js 14.17+ (no external dependencies)
 * - 3x faster than uuid package (pre-generates/caches random data)
 * - Cryptographically secure (uses CSPRNG)
 *
 * @see https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
 */

import { randomUUID } from 'crypto';

/**
 * Generates a UUID v4 string using Node.js native crypto.randomUUID().
 *
 * @returns UUID v4 string in standard format (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
 *
 * @example
 * ```typescript
 * const id = generateUuid(); // "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateUuid(): string {
    return randomUUID();
}

/**
 * Validates a UUID string format.
 *
 * @param uuid - String to validate
 * @returns True if valid UUID v4 format
 */
export function isValidUuid(uuid: string): boolean {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

/**
 * Generates a short UUID (first 8 characters) for logging.
 *
 * @returns Short UUID string
 */
export function generateShortUuid(): string {
    return randomUUID().substring(0, 8);
}
