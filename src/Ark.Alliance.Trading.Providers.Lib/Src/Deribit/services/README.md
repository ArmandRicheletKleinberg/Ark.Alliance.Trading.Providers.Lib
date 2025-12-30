# Deribit Services

## Overview

High-level service implementations for Deribit, wrapping clients with common interfaces.

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
        +subscribeQuote(symbol, cb) Result~Handle~
    }
    
    class ITradingService {
        <<interface>>
        +placeOrder(params) Result~IOrder~
        +cancelOrder(symbol, id) Result~void~
        +getPositions() Result~IPosition[]~
    }
    
    class DeribitMarketDataService {
        -client: DeribitMarketDataClient
        -subscriptions: Map
        +connect() Result~void~
        +getTicker(instrument) Result~ITicker~
    }
    
    class DeribitTradingService {
        -client: DeribitTradingClient
        +placeOrder(params) Result~IOrder~
        +getPositions() Result~IPosition[]~
    }
    
    IMarketDataService <|.. DeribitMarketDataService
    ITradingService <|.. DeribitTradingService
    
    style DeribitMarketDataService fill:#1e40af
    style DeribitTradingService fill:#1e40af
```

---

## Files

| File | Interface | Status |
|:-----|:----------|:------:|
| `DeribitMarketDataService.ts` | `IMarketDataService` | ✅ Complete |
| `DeribitTradingService.ts` | `ITradingService` | ✅ Complete |

---

## Usage

```typescript
import { DeribitMarketDataService, DeribitEnvironment } from 'ark-alliance-trading-providers-lib/Deribit';

const service = new DeribitMarketDataService({
    environment: DeribitEnvironment.TESTNET,
    defaultCurrency: 'BTC'
});

await service.connect();

// Get ticker
const ticker = await service.getTicker('BTC-PERPETUAL');
if (ticker.isSuccess) {
    console.log('Last:', ticker.data.lastPrice);
}

// Subscribe to quotes
const handle = await service.subscribeQuote('BTC-PERPETUAL', (quote) => {
    console.log('Quote:', quote.bidPrice, quote.askPrice);
});
```
