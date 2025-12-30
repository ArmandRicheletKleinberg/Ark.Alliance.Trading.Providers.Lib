/**
 * @fileoverview Deribit Authentication DTOs
 * @module Deribit/dtos/auth
 *
 * Data transfer objects for Deribit authentication.
 */

import { GrantType } from '../../enums';

/**
 * Authentication request parameters.
 */
export interface AuthRequest {
    grant_type: GrantType;
    client_id: string;
    client_secret?: string;
    refresh_token?: string;
    timestamp?: number;
    signature?: string;
    nonce?: string;
    scope?: string;
}

/**
 * Authentication response from Deribit.
 */
export interface AuthResponse {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    enabled_features: string[];
    token_type: 'bearer';
}

/**
 * Parsed scope information.
 */
export interface ParsedScope {
    connection: boolean;
    mainaccount: boolean;
    trade: 'read' | 'read_write' | 'none';
    wallet: 'read' | 'read_write' | 'none';
    account: 'read' | 'read_write' | 'none';
    sessionName?: string;
}

/**
 * Parse scope string into structured format.
 */
export function parseScope(scope: string): ParsedScope {
    const parts = scope.split(' ');
    const result: ParsedScope = {
        connection: parts.includes('connection'),
        mainaccount: parts.includes('mainaccount'),
        trade: 'none',
        wallet: 'none',
        account: 'none'
    };

    for (const part of parts) {
        if (part.startsWith('trade:')) {
            result.trade = part.split(':')[1] as 'read' | 'read_write';
        } else if (part.startsWith('wallet:')) {
            result.wallet = part.split(':')[1] as 'read' | 'read_write';
        } else if (part.startsWith('account:')) {
            result.account = part.split(':')[1] as 'read' | 'read_write';
        } else if (part.startsWith('session:')) {
            result.sessionName = part.split(':')[1];
        }
    }

    return result;
}
