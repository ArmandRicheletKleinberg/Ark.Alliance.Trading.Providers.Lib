# Binance Services

## Overview

High-level service layer implementing `IMarketDataService` and `ITradingService` interfaces for Binance Futures.

---

## Architecture

```mermaid
classDiagram
    direction TB
    
    class IMarketDataService {
        <<interface>>
        +connect() Result~void~
        +disconnect() Result~void~
        +getTicker(symbol) Result~ITicker~
        +getOrderBook(symbol, depth) Result~IOrderBook~
        +subscribeQuote(symbol, cb) Result~Handle~
    }
    
    class ITradingService {
        <<interface>>
        +placeOrder(params) Result~IOrder~
        +cancelOrder(symbol, id) Result~void~
        +getPositions(symbol?) Result~IPosition[]~
        +getOrders(symbol?) Result~IOrder[]~
    }
    
    class BinanceMarketDataService {
        -client: BinanceRestClient
        -wsClient: BinanceWebSocketClient
        +connect() Result~void~
        +getTicker(symbol) Result~ITicker~
        +subscribeQuote(symbol, cb) Result~Handle~
    }
    
    class BinanceTradingService {
        -client: BinanceRestClient
        +placeOrder(params) Result~IOrder~
        +cancelOrder(symbol, id) Result~void~
        +getPositions(symbol?) Result~IPosition[]~
    }
    
    IMarketDataService <|.. BinanceMarketDataService
    ITradingService <|.. BinanceTradingService
```

---

## Sequence: Order Placement

```mermaid
sequenceDiagram
    autonumber
    
    participant App as Application
    participant Svc as BinanceTradingService
    participant Client as BinanceRestClient
    participant API as Binance API
    
    rect rgb(230, 245, 255)
        Note over App,API: Order Placement Flow
        App->>Svc: placeOrder(params)
        Svc->>Svc: Validate parameters
        Svc->>Client: placeOrder(params)
        Client->>Client: Sign request (HMAC)
        Client->>API: POST /fapi/v1/order
        API-->>Client: OrderResponse
        Client-->>Svc: Result~OrderResponse~
        Svc->>Svc: OrderMapper.toCommon()
        Svc-->>App: Result~IOrder~
    end
```

---

## Files

| File | Interface | Description |
|:-----|:----------|:------------|
| `BinanceMarketDataService.ts` | `IMarketDataService` | Tickers, order books, subscriptions |
| `BinanceTradingService.ts` | `ITradingService` | Orders, positions, account |
| `index.ts` | - | Barrel exports |

---

## Usage

```typescript
import { BinanceTradingService } from 'ark-alliance-trading-providers-lib/Binance';

const tradingService = new BinanceTradingService({
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    environment: 'TESTNET'
});

// Place order using common interface
const result = await tradingService.placeOrder({
    symbol: 'BTCUSDT',
    side: 'BUY',
    type: 'MARKET',
    quantity: 0.002
});

if (result.isSuccess) {
    console.log('Order placed:', result.data.orderId);
}
```
