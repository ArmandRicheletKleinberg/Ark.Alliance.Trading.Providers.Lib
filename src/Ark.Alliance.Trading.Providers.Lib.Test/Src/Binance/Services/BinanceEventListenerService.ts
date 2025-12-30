/**
 * @fileoverview Binance Event Listener Service
 * @module Binance/Services/BinanceEventListenerService
 *
 * Concrete implementation of EventListenerService for Binance.
 * Wraps BinanceUserDataStream to capture account/order/position events.
 *
 * @remarks
 * Uses BaseService lifecycle:
 * - `start()` connects to User Data Stream
 * - `stop()` disconnects from stream
 */

import { EventListenerService, EventListenerConfig } from '../../Engine/Services/EventListenerService';

// Dynamic import to avoid circular dependencies
const providerLibPath = '../../../../Ark.Alliance.Trading.Providers.Lib/Src/Binance';

/**
 * Binance event listener configuration.
 */
export interface BinanceEventListenerConfig extends EventListenerConfig {
    apiKey: string;
    apiSecret: string;
    baseUrl?: string;
    wsUrl?: string;
}

/**
 * Binance-specific event listener service.
 *
 * @remarks
 * Connects to Binance User Data Stream and captures:
 * - ORDER_UPDATE events
 * - POSITION_UPDATE events
 * - ACCOUNT_UPDATE events
 * - Balance updates
 */
export class BinanceEventListenerService extends EventListenerService {
    private restClient: any;
    private userDataStream: any;
    private isSubscribed: boolean = false;
    private readonly binanceConfig: BinanceEventListenerConfig;

    /**
     * Creates Binance event listener service.
     */
    constructor(config: BinanceEventListenerConfig) {
        super({
            instanceKey: 'binance-event-listener',
            ...config
        });
        this.binanceConfig = config;
    }

    /**
     * Service name identifier.
     */
    protected getServiceName(): string {
        return 'BinanceEventListenerService';
    }

    /**
     * Connect to Binance User Data Stream.
     * Called by BaseService.start()
     */
    protected async onStart(): Promise<void> {
        // Dynamic import of Binance classes
        const { BinanceRestClient, BinanceUserDataStream } = require(providerLibPath);

        // Create REST client for listen key management
        this.restClient = new BinanceRestClient(
            this.binanceConfig.apiKey,
            this.binanceConfig.apiSecret,
            {
                baseUrl: this.binanceConfig.baseUrl || 'testnet.binancefuture.com',
                timeoutMs: 30000
            }
        );

        // Create User Data Stream
        this.userDataStream = new BinanceUserDataStream(this.restClient, {
            wsStreamUrl: this.binanceConfig.wsUrl || 'wss://stream.binancefuture.com',
            restBaseUrl: this.binanceConfig.baseUrl || 'testnet.binancefuture.com',
            keepaliveIntervalMs: 30 * 60 * 1000,
            maxReconnectAttempts: 5
        });

        // Register event handlers
        this.setupEventHandlers();

        // Connect to stream
        await this.userDataStream.connect();

        this.logger.info('Connected to User Data Stream');
    }

    /**
     * Disconnect from User Data Stream.
     * Called by BaseService.stop()
     */
    protected async onStop(): Promise<void> {
        if (this.userDataStream) {
            await this.userDataStream.disconnect();
            this.userDataStream = null;
        }
        this.restClient = null;
        this.isSubscribed = false;

        this.logger.info('Disconnected from User Data Stream');
    }

    /**
     * Subscribe to specific events.
     * For User Data Stream, all events are received once connected.
     */
    public async subscribeToEvents(events: string[]): Promise<void> {
        if (!this.isConnected()) {
            await this.start();
        }
        this.isSubscribed = true;
        this.logger.debug(`Subscribed to events: ${events.join(', ')}`);
    }

    /**
     * Unsubscribe from events.
     */
    public async unsubscribeFromEvents(events: string[]): Promise<void> {
        // User Data Stream doesn't support selective unsubscribe
        this.logger.debug(`Unsubscribe requested for: ${events.join(', ')}`);
    }

    /**
     * Sets up event handlers for User Data Stream events.
     */
    private setupEventHandlers(): void {
        if (!this.userDataStream) return;

        // Order update events
        this.userDataStream.on('orderUpdate', (data: any) => {
            this.recordEvent('ORDER_UPDATE', {
                symbol: data.symbol,
                side: data.side,
                orderStatus: data.orderStatus,
                orderId: data.orderId,
                clientOrderId: data.clientOrderId,
                orderType: data.orderType,
                price: data.originalPrice,
                quantity: data.originalQuantity,
                executedQty: data.filledQuantity,
                avgPrice: data.averagePrice,
                timeInForce: data.timeInForce,
                reduceOnly: data.isReduceOnly,
                workingType: data.workingType,
                timestamp: data.eventTime
            });
        });

        // Position update events (from accountUpdate)
        this.userDataStream.on('accountUpdate', (data: any) => {
            const raw = data;

            // Extract position updates
            const positions = raw.a?.P || raw.positions || [];
            for (const position of positions) {
                this.recordEvent('POSITION_UPDATE', {
                    symbol: position.s || position.symbol,
                    positionAmount: parseFloat(position.pa || position.positionAmt || '0'),
                    entryPrice: parseFloat(position.ep || position.entryPrice || '0'),
                    unrealizedPnL: parseFloat(position.up || position.unrealizedProfit || '0'),
                    marginType: position.mt || position.marginType,
                    positionSide: position.ps || position.positionSide,
                    timestamp: raw.E || Date.now()
                });
            }

            // Extract balance updates
            const balances = raw.a?.B || raw.balances || [];
            for (const balance of balances) {
                this.recordEvent('BALANCE_UPDATE', {
                    asset: balance.a || balance.asset,
                    walletBalance: parseFloat(balance.wb || balance.balance || '0'),
                    crossWalletBalance: parseFloat(balance.cw || balance.crossWalletBalance || '0'),
                    timestamp: raw.E || Date.now()
                });
            }
        });

        // Margin call event
        this.userDataStream.on('marginCall', (data: any) => {
            this.recordEvent('MARGIN_CALL', {
                crossWalletBalance: data.cw,
                positions: data.p,
                timestamp: data.E || Date.now()
            });
        });

        // Algo Order Update
        this.userDataStream.on('algoOrderUpdate', (data: any) => {
            this.recordEvent('ALGO_ORDER_UPDATE', {
                algoId: data.algoId,
                symbol: data.symbol,
                side: data.side,
                status: data.algoStatus,
                orderType: data.orderType,
                quantity: data.quantity,
                timestamp: data.eventTime
            });
        });

        // Trade Lite
        this.userDataStream.on('tradeLite', (data: any) => {
            this.recordEvent('TRADE_LITE', {
                symbol: data.symbol,
                side: data.side,
                price: data.price,
                quantity: data.quantity,
                isLiquidation: data.isLiquidation,
                timestamp: data.eventTime
            });
        });

        // Account Config Update
        this.userDataStream.on('accountConfigUpdate', (data: any) => {
            this.recordEvent('ACCOUNT_CONFIG_UPDATE', {
                symbol: data.symbol,
                leverage: data.leverage,
                multiAssetsMode: data.multiAssetsMode,
                timestamp: data.eventTime
            });
        });

        // Grid Update
        this.userDataStream.on('gridUpdate', (data: any) => {
            this.recordEvent('GRID_UPDATE', {
                strategyId: data.gridStrategyId,
                status: data.gridStatus,
                timestamp: data.eventTime
            });
        });

        // Conditional Order Reject
        this.userDataStream.on('conditionalOrderTriggerReject', (data: any) => {
            this.recordEvent('CONDITIONAL_ORDER_REJECT', {
                symbol: data.symbol,
                orderId: data.orderId,
                reason: data.rejectReason,
                timestamp: data.eventTime
            });
        });

        // Listen key expired
        this.userDataStream.on('listenKeyExpired', () => {
            this.recordEvent('LISTEN_KEY_EXPIRED', {
                timestamp: Date.now()
            });
            this.logger.warn('Listen key expired');
        });

        // Connection events
        this.userDataStream.on('connected', () => {
            this.recordEvent('STREAM_CONNECTED', { timestamp: Date.now() });
        });

        this.userDataStream.on('disconnected', () => {
            this.recordEvent('STREAM_DISCONNECTED', { timestamp: Date.now() });
        });

        this.userDataStream.on('error', (error: Error) => {
            this.recordEvent('STREAM_ERROR', {
                message: error.message,
                timestamp: Date.now()
            });
        });
    }
}

/**
 * Factory function for creating BinanceEventListenerService.
 */
export function createBinanceEventListenerService(config: BinanceEventListenerConfig): BinanceEventListenerService {
    return new BinanceEventListenerService(config);
}
