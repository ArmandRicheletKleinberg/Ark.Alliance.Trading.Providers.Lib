# Deribit Clients

## Overview

JSON-RPC 2.0 clients for Deribit API with OAuth2 authentication and automatic token refresh.

---

## Architecture

```mermaid
classDiagram
    direction TB
    
    class BaseJsonRpcClient {
        <<abstract>>
        #ws: WebSocket
        #requestId: number
        +connect() Promise~Result~
        +disconnect() Promise~Result~
        +call(method, params) Promise~Result~
        +subscribe(channel) Promise~Result~
    }
    
    class DeribitJsonRpcClient {
        -accessToken: string
        -refreshToken: string
        +authenticate() Promise~Result~
        +refreshAccessToken() Promise~Result~
        #onAuthenticate() Promise~Result~
    }
    
    class DeribitMarketDataClient {
        <<Public API>>
        +getTicker(instrument) Promise~Result~
        +getOrderBook(instrument) Promise~Result~
        +subscribeQuote(instrument, cb) Promise~Result~
    }
    
    class DeribitTradingClient {
        <<Auth Required>>
        +placeOrder(params) Promise~Result~
        +cancelOrder(orderId) Promise~Result~
        +getPositions(currency) Promise~Result~
    }
    
    BaseJsonRpcClient <|-- DeribitJsonRpcClient
    DeribitJsonRpcClient <|-- DeribitMarketDataClient
    DeribitJsonRpcClient <|-- DeribitTradingClient
    
    style DeribitMarketDataClient fill:#e8f5e9
    style DeribitTradingClient fill:#fff3e0
```

---

## Sequence: Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    
    participant App as Application
    participant Client as DeribitJsonRpcClient
    participant WS as WebSocket
    participant API as Deribit API
    
    rect rgb(232, 245, 233)
        Note over App,API: Connection & Auth
        App->>Client: connect()
        Client->>WS: new WebSocket(url)
        WS-->>Client: onopen
        Client->>Client: onAuthenticate()
        alt Has Credentials
            Client->>API: public/auth
            API-->>Client: {access_token, refresh_token}
            Client->>Client: scheduleTokenRefresh()
        else Public Access
            Client->>Client: Skip auth
        end
        Client-->>App: Result.Success
    end
```

---

## Files

| File | Access Level | Description |
|:-----|:-------------|:------------|
| `DeribitJsonRpcClient.ts` | Base | OAuth2 auth, token management |
| `DeribitMarketDataClient.ts` | Public | Tickers, order books (no auth) |
| `DeribitTradingClient.ts` | Authenticated | Orders, positions |

---

## Usage

```typescript
import { DeribitMarketDataClient, DeribitEnvironment } from 'ark-alliance-trading-providers-lib/Deribit';

// Public market data (no credentials needed)
const client = new DeribitMarketDataClient({
    credentials: { clientId: '', clientSecret: '' },
    environment: DeribitEnvironment.TESTNET
});

await client.connect();
const ticker = await client.getTicker('BTC-PERPETUAL');
```
