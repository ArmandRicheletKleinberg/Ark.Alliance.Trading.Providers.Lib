/**
 * @fileoverview Binance Server Time Synchronization
 * @module utils/ServerTimeSync
 * 
 * Maintains time offset between local system and Binance servers
 * to prevent -1021 "Timestamp outside of recvWindow" errors.
 * 
 * Usage:
 *   await ServerTimeSync.initialize('TESTNET');
 *   const correctedTimestamp = ServerTimeSync.getTimestamp();
 */

import * as https from 'https';
import { BinanceEnvironment } from '../enums';
import { LoggingService } from '../../Common/helpers/logging/LoggingService';
import { LogLevel } from '../../Common/helpers/logging/LogLevel';

/** API URLs by environment */
const BINANCE_FAPI_URLS: Record<BinanceEnvironment, string> = {
    TESTNET: 'testnet.binancefuture.com',
    MAINNET: 'fapi.binance.com'
};

export class ServerTimeSync {
    private static instance: ServerTimeSync | null = null;
    private static timeOffset: number = 0;
    private static lastSyncTime: number = 0;
    private static syncIntervalMs: number = 60000; // Re-sync every 60 seconds
    private static syncInterval: NodeJS.Timeout | null = null;
    private static currentEnvironment: BinanceEnvironment = BinanceEnvironment.TESTNET;
    private static isInitialized: boolean = false;
    private static logger = new LoggingService({ minLevel: LogLevel.DEBUG }, 'ServerTimeSync');

    /**
     * Initialize time sync for specified environment
     * Must be called before using getTimestamp()
     */
    static async initialize(environment: BinanceEnvironment): Promise<void> {
        ServerTimeSync.currentEnvironment = environment;

        // Initial sync
        await ServerTimeSync.syncTime();

        // Start periodic sync
        if (ServerTimeSync.syncInterval) {
            clearInterval(ServerTimeSync.syncInterval);
        }

        ServerTimeSync.syncInterval = setInterval(async () => {
            try {
                await ServerTimeSync.syncTime();
            } catch (err) {
                ServerTimeSync.logger.warn('Periodic sync failed, will retry');
            }
        }, ServerTimeSync.syncIntervalMs);

        ServerTimeSync.isInitialized = true;
        ServerTimeSync.logger.info(`Initialized for ${environment}, offset: ${ServerTimeSync.timeOffset}ms`);
    }

    /**
     * Sync local time with Binance server
     */
    static async syncTime(): Promise<number> {
        const hostname = BINANCE_FAPI_URLS[ServerTimeSync.currentEnvironment];

        return new Promise((resolve, reject) => {
            const localTimeBefore = Date.now();

            const req = https.request({
                hostname,
                path: '/fapi/v1/time',
                method: 'GET',
                timeout: 5000
            }, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const localTimeAfter = Date.now();
                        const latency = localTimeAfter - localTimeBefore;
                        const avgLocalTime = localTimeBefore + Math.floor(latency / 2);

                        const response = JSON.parse(data);
                        const serverTime = response.serverTime;

                        // Calculate offset: positive means server is ahead
                        ServerTimeSync.timeOffset = serverTime - avgLocalTime;
                        ServerTimeSync.lastSyncTime = localTimeAfter;

                        ServerTimeSync.logger.info(`✅ Synced: offset=${ServerTimeSync.timeOffset}ms, latency=${latency}ms`);
                        resolve(ServerTimeSync.timeOffset);
                    } catch (err) {
                        reject(err);
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Timeout syncing server time'));
            });

            req.end();
        });
    }

    /**
     * Get corrected timestamp for API requests
     * This is the main method to use instead of Date.now()
     */
    static getTimestamp(): number {
        return Date.now() + ServerTimeSync.timeOffset;
    }

    /**
     * Get current time offset (for debugging)
     */
    static getOffset(): number {
        return ServerTimeSync.timeOffset;
    }

    /**
     * Check if sync is needed and perform if necessary
     */
    static async ensureSynced(): Promise<void> {
        const timeSinceSync = Date.now() - ServerTimeSync.lastSyncTime;
        if (timeSinceSync > ServerTimeSync.syncIntervalMs || !ServerTimeSync.isInitialized) {
            await ServerTimeSync.syncTime();
        }
    }

    /**
     * Switch to different environment
     */
    static async switchEnvironment(environment: BinanceEnvironment): Promise<void> {
        if (environment !== ServerTimeSync.currentEnvironment) {
            ServerTimeSync.currentEnvironment = environment;
            await ServerTimeSync.syncTime();
            ServerTimeSync.logger.info(`Switched to ${environment}, new offset: ${ServerTimeSync.timeOffset}ms`);
        }
    }

    /**
     * Stop periodic sync (for cleanup)
     */
    static stop(): void {
        if (ServerTimeSync.syncInterval) {
            clearInterval(ServerTimeSync.syncInterval);
            ServerTimeSync.syncInterval = null;
        }
        ServerTimeSync.isInitialized = false;
    }
}
