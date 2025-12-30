/**
 * @fileoverview Deribit Grant Type Enum
 * @module Deribit/enums/GrantType
 *
 * Defines OAuth grant types for Deribit authentication.
 */

/**
 * Deribit OAuth grant type.
 */
export enum GrantType {
    /**
     * Client credentials (API key + secret).
     * Most common for API integrations.
     */
    CLIENT_CREDENTIALS = 'client_credentials',

    /**
     * Client signature (API key + HMAC signature).
     * More secure alternative.
     */
    CLIENT_SIGNATURE = 'client_signature',

    /**
     * Refresh token.
     * Used to renew an existing access token.
     */
    REFRESH_TOKEN = 'refresh_token'
}

/**
 * Type alias for grant type values.
 */
export type GrantTypeType = `${GrantType}`;
