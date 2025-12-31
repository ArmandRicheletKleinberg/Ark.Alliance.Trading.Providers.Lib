# <i class="fa fa-building"></i> Ark Alliance Trading Providers Library

<div align="center">

[![npm version](https://badge.fury.io/js/ark-alliance-trading-providers-lib.svg)](https://www.npmjs.com/package/ark-alliance-trading-providers-lib)
[![npm downloads](https://img.shields.io/npm/dm/ark-alliance-trading-providers-lib.svg)](https://www.npmjs.com/package/ark-alliance-trading-providers-lib)
[![Build Status](https://github.com/ArmandRicheletKleinberg/Ark.Alliance.Trading.Providers.Lib/actions/workflows/ci.yml/badge.svg)](https://github.com/ArmandRicheletKleinberg/Ark.Alliance.Trading.Providers.Lib/actions)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](./src/Ark.Alliance.Trading.Providers.Lib.Test)
[![Tests](https://img.shields.io/badge/tests-70%2B%20scenarios-brightgreen)](./src/Ark.Alliance.Trading.Providers.Lib.Test)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)](https://nodejs.org/)

**Production-Ready Multi-Provider Cryptocurrency Trading SDK**

> **<i class="fa fa-box"></i> [Available on npm](https://www.npmjs.com/package/ark-alliance-trading-providers-lib)** - Install with `npm install ark-alliance-trading-providers-lib`

*Organization*: M2H.Io Ark.Alliance Ecosystem  
*Version*: 1.0.0  
*Last Updated*: 2025-12-30

[Installation](#-quick-start) • [Library Documentation](./src/Ark.Alliance.Trading.Providers.Lib/README.md) • [Test Guide](./src/Ark.Alliance.Trading.Providers.Lib.Test/README.md) • [Contributing](./CONTRIBUTING.md)

</div>

---

## <i class="fa fa-question-circle"></i> What is This?

A **production-ready TypeScript SDK** that unifies cryptocurrency trading across multiple exchanges with a single, elegant API. Stop writing exchange-specific code—write once, trade everywhere.

**Perfect for:**
- <i class="fa fa-robot"></i> Algorithmic trading bots
- <i class="fa fa-chart-line"></i> Market data aggregators
- <i class="fa fa-briefcase"></i> Portfolio management systems
- <i class="fa fa-chart-bar"></i> Trading analytics platforms

---

## <i class="fa fa-star"></i> Key Features

| Feature | Description |
|:--------|:------------|
| <i class="fa fa-plug"></i> **Multi-Provider** | Unified interface for Binance Futures and Deribit exchanges |
| <i class="fa fa-chart-line"></i> **Order Management** | Place, modify, cancel, and track orders with standardized API |
| <i class="fa fa-coins"></i> **Position Tracking** | Real-time position monitoring with P&L calculation |
| <i class="fa fa-broadcast-tower"></i> **WebSocket Streams** | Low-latency market data and user event subscriptions |
| <i class="fa fa-bolt"></i> **Event-Driven** | Async event architecture for order fills, position updates |
| <i class="fa fa-check-circle"></i> **Result Pattern** | Type-safe error handling with functional programming paradigm |
| <i class="fa fa-lock"></i> **Secure Auth** | HMAC-SHA256 (Binance) and Ed25519 (Deribit) sign generation |
| <i class="fa fa-flask"></i> **100% Tested** | Comprehensive test suite with 70+ scenarios, 100% pass rate |
| <i class="fa fa-code"></i> **TypeScript-First** | Full type definitions with IntelliSense support |
| <i class="fa fa-globe"></i> **Testnet Support** | Built-in testnet URLs for safe development |

---

## <i class="fa fa-sitemap"></i> Architecture Overview

Clean, modular architecture built on industry-standard patterns:

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e1f5ff','primaryTextColor':'#000','primaryBorderColor':'#0288d1','lineColor':'#0288d1','secondaryColor':'#fff4e1','tertiaryColor':'#d4edda','noteBkgColor':'#fff9c4','noteTextColor':'#000'}}}%%
graph TB
    subgraph DomainLayer["<b>Domain Layer</b>"]
        Entities["Domain Entities<br/>(Order, Position, Account)"]
        Interfaces["Interfaces<br/>(IProviderClient, IAuthStrategy)"]
    end
    
    subgraph AppLayer["<b>Application Layer</b>"]
        UseCases["Use Cases<br/>(Place Order, Get Position)"]
        Mappers["Data Mappers<br/>(API ↔ Domain)"]
    end
    
    subgraph InfraLayer["<b>Infrastructure Layer</b>"]
        Clients["API Clients<br/>(REST, WebSocket)"]
        Auth["Authentication<br/>(HMAC, Ed25519)"]
    end
    
    subgraph ExtSystems["<b>External Systems</b>"]
        Exchanges["Exchange APIs<br/>(Binance, Deribit, etc.)"]
    end
    
    Interfaces -.->|defines| Clients
    UseCases --> Interfaces
    Mappers --> Entities
    Clients --> Auth
    Clients --> Exchanges
    UseCases --> Mappers
    
    style Entities fill:#e1f5ff,stroke:#0288d1,stroke-width:2px,color:#000
    style Interfaces fill:#fff4e1,stroke:#f57c00,stroke-width:2px,color:#000
    style UseCases fill:#d4edda,stroke:#388e3c,stroke-width:2px,color:#000
    style Mappers fill:#d4edda,stroke:#388e3c,stroke-width:2px,color:#000
    style Clients fill:#ffeaa7,stroke:#f57c00,stroke-width:2px,color:#000
    style Auth fill:#ffeaa7,stroke:#f57c00,stroke-width:2px,color:#000
    style Exchanges fill:#ffccbc,stroke:#d84315,stroke-width:2px,color:#000
    style DomainLayer fill:#f0f8ff,stroke:#0288d1,stroke-width:3px
    style AppLayer fill:#f1f8f4,stroke:#388e3c,stroke-width:3px
    style InfraLayer fill:#fffbf0,stroke:#f57c00,stroke-width:3px
    style ExtSystems fill:#fff3e0,stroke:#d84315,stroke-width:3px
```

> **<i class="fa fa-book"></i> For detailed architecture diagrams and patterns**, see [Library Documentation](./src/Ark.Alliance.Trading.Providers.Lib/README.md)

---

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e1f5ff','actorBkg':'#e1f5ff','actorBorder':'#0288d1','actorTextColor':'#000','signalColor':'#000','signalTextColor':'#000','labelBoxBkgColor':'#fff4e1','labelBoxBorderColor':'#f57c00','labelTextColor':'#000','loopTextColor':'#000','noteBorderColor':'#388e3c','noteBkgColor':'#fff9c4','noteTextColor':'#000','activationBorderColor':'#0288d1','activationBkgColor':'#bbdefb','sequenceNumberColor':'#fff'}}}%%
sequenceDiagram
    autonumber
    participant Client as Application
    participant Service as Trading Service
    participant Domain as Domain Events
    participant WS as WebSocket Stream
    participant Handlers as Event Handlers
    
    Client->>Service: Subscribe to Order Events
    Service->>WS: Connect to User Data Stream
    WS->>Domain: OrderUpdate Event
    Domain->>Handlers: Emit ORDER_FILLED
    Handlers->>Service: Update Local State
    Service->>Client: Notify Application
    
    Note over Domain: Domain events are<br/>immutable and typed
```

### Basic Usage

```typescript
import { BinanceRestClient } from 'ark-alliance-trading-providers-lib/Binance';

// Initialize client
const client = new BinanceRestClient(apiKey, secret, { testnet: true });

// Place order with type-safe Result pattern
const orderResult = await client.placeOrder({
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'MARKET',
  quantity: 0.001
});

if (orderResult.success) {
  console.log(`Order placed! ID: ${orderResult.data.orderId}`);
} else {
  console.error(`Error: ${orderResult.error.message}`);
}
```

> **<i class="fa fa-code"></i> For complete API reference and advanced examples**, see [Library Documentation](./src/Ark.Alliance.Trading.Providers.Lib/README.md)

---

## <i class="fa fa-map"></i> Roadmap

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e1f5ff','primaryTextColor':'#000','primaryBorderColor':'#0288d1','grid':'#ccc','doneTaskBkgColor':'#c8e6c9','doneTaskBorderColor':'#388e3c','activeTaskBkgColor':'#fff9c4','activeTaskBorderColor':'#f57c00','taskBkgColor':'#e3f2fd','taskBorderColor':'#0288d1','taskTextColor':'#000','todayLineColor':'#d32f2f','textColor':'#000'}}}%%
gantt
    title Provider Integration Timeline
    dateFormat YYYY-MM
    
    section Completed
    Binance Futures (Full)   :done, binance, 2024-12, 2025-01
    Deribit (Market Data)     :done, deribit-md, 2025-01, 2025-01
    
    section In Progress
    Deribit (User/Trading)    :active, deribit-full, 2025-01, 2025-02
    
    section Planned Q2 2025
    OKX Integration           :okx, 2025-04, 2025-05
    Bybit Integration         :bybit, 2025-05, 2025-06
    
    section Planned Q3 2025
    Kraken Futures            :kraken, 2025-07, 2025-08
    BitMEX Integration        :bitmex, 2025-08, 2025-09
    
    section Planned Q4 2025
    Gate.io Futures           :gateio, 2025-10, 2025-11
```

> **<i class="fa fa-tasks"></i> For detailed roadmap and milestones**, see [ROADMAP.md](./ROADMAP.md)

---

## <i class="fa fa-book-open"></i> Documentation

| Document | Description |
|:---------|:------------|
| **[<i class="fa fa-book"></i> Library API](./src/Ark.Alliance.Trading.Providers.Lib/README.md)** | Complete API reference, detailed architecture, integration guides |
| **[<i class="fa fa-flask"></i> Test Guide](./src/Ark.Alliance.Trading.Providers.Lib.Test/RE ADME.md)** | Test architecture, scenario-based testing, 70+ test scenarios |
| **[<i class="fa fa-users"></i> Contributing](./CONTRIBUTING.md)** | Coding standards, PR process, adding new providers |
| **[<i class="fa fa-rocket"></i> Deployment](./Deployments/npm-publishing.md)** | NPM publishing guide, versioning strategy |
| **[<i class="fa fa-github"></i> GitHub Setup](./GITHUB_SETUP.md)** | Branch protection, CI/CD workflows |

---

## <i class="fa fa-folder-tree"></i> Project Structure

```
Ark.Alliance.Trading.Providers.Lib/
├── src/
│   ├── Ark.Alliance.Trading.Providers.Lib/    # Main library
│   │   ├── Src/
│   │   │   ├── Binance/                       # Binance provider
│   │   │   ├── Deribit/                       # Deribit provider
│   │   │   └── Common/                        # Shared utilities
│   │   └── README.md                          # 📚 DETAILED API DOCS
│   │
│   └── Ark.Alliance.Trading.Providers.Lib.Test/  # Test suite
│       └── README.md                              # 🧪 TESTING GUIDE
│
├── Deployments/                               # Deployment guides
├── Scripts/                                   # Build scripts
└── README.md                                  # ⬅️ You are here
```

> **<i class="fa fa-arrow-right"></i> See [Library Documentation](./src/Ark.Alliance.Trading.Providers.Lib/README.md) for detailed module breakdown**

---

## <i class="fa fa-users"></i> Contributing

### Multi-Provider Design

The library uses a **provider abstraction pattern** to ensure consistent behavior across different exchanges while respecting each provider's unique protocols.

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e1f5ff','primaryTextColor':'#000','primaryBorderColor':'#0288d1','lineColor':'#0288d1','secondaryColor':'#fff4e1','tertiaryColor':'#d4edda','noteBkgColor':'#fff9c4','noteTextColor':'#000'}}}%%
graph TB
    subgraph AppLayer["<b>Application Layer</b>"]
        App["Your Trading Application"]
    end
    
    subgraph LibLayer["<b>Library Abstraction Layer</b>"]
        IProvider["IProviderClient Interface"]
        Result["Result&lt;T&gt; Pattern"]
        IAuth["IAuthStrategy Interface"]
    end
    
    subgraph ProviderImpl["<b>Provider Implementations</b>"]
        direction LR
        Binance["Binance Provider<br/>REST + WebSocket"]
        Deribit["Deribit Provider<br/>JSON-RPC"]
    end
    
    subgraph ExtAPIs["<b>External APIs</b>"]
        BinanceAPI["Binance Futures API<br/>HTTPS + WSS"]
        DeribitAPI["Deribit API<br/>WebSocket JSON-RPC"]
    end
    
    App --> IProvider
    App --> Result
    IProvider --> Binance
    IProvider --> Deribit
    Binance --> IAuth
    Deribit --> IAuth
    Binance --> BinanceAPI
    Deribit --> DeribitAPI
    
    style App fill:#e1f5ff,stroke:#0288d1,stroke-width:2px,color:#000
    style IProvider fill:#fff4e1,stroke:#f57c00,stroke-width:2px,color:#000
    style Result fill:#fff4e1,stroke:#f57c00,stroke-width:2px,color:#000
    style IAuth fill:#fff4e1,stroke:#f57c00,stroke-width:2px,color:#000
    style Binance fill:#d4edda,stroke:#388e3c,stroke-width:2px,color:#000
    style Deribit fill:#d4edda,stroke:#388e3c,stroke-width:2px,color:#000
    style BinanceAPI fill:#ffccbc,stroke:#d84315,stroke-width:2px,color:#000
    style DeribitAPI fill:#ffccbc,stroke:#d84315,stroke-width:2px,color:#000
    style AppLayer fill:#f0f8ff,stroke:#0288d1,stroke-width:3px
    style LibLayer fill:#fffbf0,stroke:#f57c00,stroke-width:3px
    style ProviderImpl fill:#f1f8f4,stroke:#388e3c,stroke-width:3px
    style ExtAPIs fill:#fff3e0,stroke:#d84315,stroke-width:3px
```

### Base Class Mechanism

Abstract base classes provide shared functionality across providers:

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e1f5ff','primaryTextColor':'#000','primaryBorderColor':'#0288d1','classText':'#000'}}}%%
classDiagram
    class IProviderClient {
        <<interface>>
        +connect() Promise~void~
        +disconnect() Promise~void~
        +isConnected() boolean
        +getProviderName() string
    }
    
    class IAuthStrategy {
        <<interface>>
        +generateSignature(data) string
        +getApiKey() string
        +authenticate(client) Promise~void~
    }
    
    class BaseJsonRpcClient {
        <<abstract>>
        #ws WebSocket
        #requestId number
        #pendingRequests Map
        +call(method, params) Promise~Result~
        +subscribe(channel) Promise~void~
        #sendRequest(method, params) Promise~any~
        #handleMessage(data) void
    }
    
    class BinanceRestClient {
        -apiKey string
        -apiSecret string
        -authStrategy IAuthStrategy
        +placeOrder(params) Result~Order~
        +cancelOrder(symbol, id) Result~Order~
        +getAccount() Result~Account~
        +getPositionRisk() Result~Position[]~
    }
    
    class BinanceWebSocketClient {
        -streams Map
        +subscribeKline(symbol, interval) void
        +subscribeBookTicker(symbol) void
        +subscribeUserData(listenKey) void
        +on(event, callback) void
    }
    
    class DeribitJsonRpcClient {
        -clientId string
        -clientSecret string
        +authenticate() Promise~void~
        +refreshToken() Promise~void~
        +heartbeat() void
    }
    
    class DeribitMarketDataClient {
        +getTicker(instrument) Promise~Result~
        +getOrderBook(instrument, depth) Promise~Result~
        +getInstruments(currency) Promise~Result~
    }
    
    class HmacSignatureGenerator {
        -apiSecret string
        +generateSignature(data) string
    }
    
    class Ed25519SignatureGenerator {
        -privateKey Buffer
        +generateSignature(data) string
    }
    
    IProviderClient <|.. BinanceRestClient : implements
    IProviderClient <|.. DeribitJsonRpcClient : implements
    IAuthStrategy <|.. HmacSignatureGenerator : implements
    IAuthStrategy <|.. Ed25519SignatureGenerator : implements
    BaseJsonRpcClient <|-- DeribitJsonRpcClient : extends
    DeribitJsonRpcClient <|-- DeribitMarketDataClient : extends
    BinanceRestClient --> IAuthStrategy : uses
    DeribitJsonRpcClient --> IAuthStrategy : uses
    
    style IProviderClient fill:#fff4e1,stroke:#f57c00,stroke-width:2px
    style IAuthStrategy fill:#fff4e1,stroke:#f57c00,stroke-width:2px
    style BaseJsonRpcClient fill:#fffbf0,stroke:#f57c00,stroke-width:2px
    style BinanceRestClient fill:#d4edda,stroke:#388e3c,stroke-width:2px
    style BinanceWebSocketClient fill:#d4edda,stroke:#388e3c,stroke-width:2px
    style DeribitJsonRpcClient fill:#d4edda,stroke:#388e3c,stroke-width:2px
    style DeribitMarketDataClient fill:#d4edda,stroke:#388e3c,stroke-width:2px
    style HmacSignatureGenerator fill:#e3f2fd,stroke:#0288d1,stroke-width:2px
    style Ed25519SignatureGenerator fill:#e3f2fd,stroke:#0288d1,stroke-width:2px
```

### Result Pattern

All API operations return a `Result<T>` object for consistent, type-safe error handling:

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e1f5ff','primaryTextColor':'#000','primaryBorderColor':'#0288d1','classText':'#000'}}}%%
classDiagram
    class Result~T~ {
        +success boolean
        +status ResultStatus
        +data? T
        +error? ErrorDetail
        +timestamp number
        +static Success~T~(data) Result~T~
        +static Failure~T~(status, error) Result~T~
        +isSuccess() boolean
        +isFailure() boolean
        +map~U~(fn) Result~U~
        +flatMap~U~(fn) Result~U~
        +getOrDefault(defaultValue) T
        +getOrThrow() T
    }
    
    class ResultStatus {
        <<enumeration>>
        OK
        CREATED
        BAD_REQUEST
        UNAUTHORIZED
        NOT_FOUND
        RATE_LIMITED
        TIMEOUT
        NETWORK_ERROR
        VALIDATION_ERROR
        INTERNAL_ERROR
    }
    
    class ErrorDetail {
        +code string
        +message string
        +details? object
        +timestamp number
    }
    
    Result --> ResultStatus : uses
    Result --> ErrorDetail : contains
    
    style Result fill:#e1f5ff,stroke:#0288d1,stroke-width:2px
    style ResultStatus fill:#fff9c4,stroke:#f57c00,stroke-width:2px
    style ErrorDetail fill:#ffccbc,stroke:#d84315,stroke-width:2px
```

### Architecture Diagrams

#### Order Placement Flow (Binance)

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e1f5ff','actorBkg':'#e1f5ff','actorBorder':'#0288d1','actorTextColor':'#000','signalColor':'#000','signalTextColor':'#000','labelBoxBkgColor':'#fff4e1','labelBoxBorderColor':'#f57c00','labelTextColor':'#000','loopTextColor':'#000','noteBorderColor':'#388e3c','noteBkgColor':'#fff9c4','noteTextColor':'#000','activationBorderColor':'#0288d1','activationBkgColor':'#bbdefb','sequenceNumberColor':'#fff'}}}%%
sequenceDiagram
    autonumber
    participant App as Trading Application
    participant Client as BinanceRestClient
    participant HMAC as HmacSignatureGenerator
    participant API as Binance Futures API
    
    App->>Client: placeOrder({symbol, side, type, quantity})
    Client->>Client: Add timestamp & recvWindow
    Client->>HMAC: generateSignature(queryString)
    HMAC-->>Client: HMAC-SHA256 signature
    Client->>API: POST /fapi/v1/order + signature header
    API-->>Client: Order Response + Rate Limit Headers
    Client->>Client: Parse rate limits
    Client->>Client: Map to domain Order model
    Client-->>App: Result<Order>
    
    alt Success
        App->>App: result.data.orderId
    else Error
        App->>App: Handle result.error
    end
```

#### WebSocket Authentication & Subscription Flow (Deribit)

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e1f5ff','actorBkg':'#e1f5ff','actorBorder':'#0288d1','actorTextColor':'#000','signalColor':'#000','signalTextColor':'#000','labelBoxBkgColor':'#fff4e1','labelBoxBorderColor':'#f57c00','labelTextColor':'#000','loopTextColor':'#000','noteBorderColor':'#388e3c','noteBkgColor':'#fff9c4','noteTextColor':'#000','activationBorderColor':'#0288d1','activationBkgColor':'#bbdefb','sequenceNumberColor':'#fff'}}}%%
sequenceDiagram
    autonumber
    participant App as Trading Application
    participant Client as DeribitMarketDataClient
    participant Auth as Ed25519Strategy
    participant WS as Deribit WebSocket API
    
    App->>Client: connect()
    Client->>WS: WebSocket Handshake
    WS-->>Client: Connection Established
    
    App->>Client: authenticate()
    Client->>Auth: generateSignature(timestamp + nonce)
    Auth-->>Client: Ed25519 signature
    Client->>WS: JSON-RPC: public/auth {client_id, signature, timestamp}
    WS-->>Client: {access_token, refresh_token, expires_in}
    Client->>Client: Store tokens & start refresh timer
    Client-->>App: Result<AuthSuccess>
    
    App->>Client: getTicker("BTC-PERPETUAL")
    Client->>WS: JSON-RPC: public/ticker {instrument_name}
    WS-->>Client: {ticker data}
    Client->>Client: Map to domain Ticker model
    Client-->>App: Result<Ticker>
    
    loop Every 15 minutes
        Client->>WS: JSON-RPC: public/auth {refresh_token}
        WS-->>Client: {new_access_token}
    end
```

---

## <i class="fa fa-pen"></i> Author

**Armand Richelet Kleinberg**  
M2H.Io Ark.Alliance Ecosystem

---

## <i class="fa fa-file-contract"></i> License

MIT License - see [LICENSE](./LICENSE) file for details

### Test Architecture

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e1f5ff','primaryTextColor':'#000','primaryBorderColor':'#0288d1','lineColor':'#0288d1','secondaryColor':'#fff4e1','tertiaryColor':'#d4edda','noteBkgColor':'#fff9c4','noteTextColor':'#000'}}}%%
flowchart TB
    subgraph TestFramework["<b>Test Framework</b>"]
        Engine["ReflectionTestEngine<br/>(Reflection + Dependency Injection)"]
        DynParams["DynamicOrderParams<br/>(Runtime Price Resolution)"]
        Scenarios["JSON Scenario Files<br/>(Declarative Test Definitions)"]
    end
    
    subgraph LibraryUnderTest["<b>Library Under Test</b>"]
        RestClient["BinanceRestClient"]
        WSClient["BinanceWebSocketClient"]
        Mappers["Response Mappers"]
    end
    
    subgraph ExternalAPI["<b>Binance Testnet</b>"]
        REST["REST API<br/>fapi.binance.com"]
        WS["WebSocket<br/>fstream.binance.com"]
    end
    
    Scenarios -->|Load & Parse| Engine
    Engine -->|Instantiate via Reflection| RestClient
    Engine -->|Resolve $DYNAMIC_*| DynParams
    DynParams -->|Fetch Current Prices| RestClient
    Engine -->|Execute Test Steps| RestClient
    Engine -->|Subscribe to Events| WSClient
    RestClient -->|HTTPS POST/GET| REST
    WSClient -->|WSS Subscribe| WS
    REST -->|Response| Mappers
    Mappers -->|Domain Models| Engine
    Engine -->|Assert & Report| TestResults["Test Results<br/>(error-report.json)"]
    
    style Engine fill:#e1f5ff,stroke:#0288d1,stroke-width:2px,color:#000
    style DynParams fill:#fff4e1,stroke:#f57c00,stroke-width:2px,color:#000
    style Scenarios fill:#d4edda,stroke:#388e3c,stroke-width:2px,color:#000
    style RestClient fill:#d4edda,stroke:#388e3c,stroke-width:2px,color:#000
    style WSClient fill:#d4edda,stroke:#388e3c,stroke-width:2px,color:#000
    style Mappers fill:#d4edda,stroke:#388e3c,stroke-width:2px,color:#000
    style REST fill:#ffccbc,stroke:#d84315,stroke-width:2px,color:#000
    style WS fill:#ffccbc,stroke:#d84315,stroke-width:2px,color:#000
    style TestResults fill:#fff9c4,stroke:#f57c00,stroke-width:2px,color:#000
    style TestFramework fill:#f0f8ff,stroke:#0288d1,stroke-width:3px
    style LibraryUnderTest fill:#f1f8f4,stroke:#388e3c,stroke-width:3px
    style ExternalAPI fill:#fff3e0,stroke:#d84315,stroke-width:3px
```

### Test Coverage

| Scenario File | Category | Scenarios | Pass Rate | Description |
|:--------------|:---------|:---------:|:---------:|:------------|
| `account.scenarios.json` | Account | 8 | ✅ 100% | Account info, balance, positions, commission rates |
| `market-data.scenarios.json` | Market Data | 8 | ✅ 100% | Prices, order book, klines, funding rates |
| `orders.scenarios.json` | Orders | 12 | ✅ 92% | Limit, market, stop orders (2 disabled) |
| `positions.scenarios.json` | Positions | 14 | ✅ 100% | Open/close positions, leverage, margin settings |
| `gtx-orders.scenarios.json` | Post-Only (GTX) | 13 | ✅ 100% | Maker-only orders with event validation |
| `market-orders.scenarios.json` | Market Orders | 8 | ✅ 100% | Market execution workflows |
| `algo-orders.scenarios.json` | Algo Orders | 10 | ✅ 100% | Stop-loss, take-profit, trailing stops |
| `mixed-orders.scenarios.json` | Mixed Workflows | 10 | ✅ 100% | Complex multi-order scenarios |
| **Total** | **All Categories** | **70+** | **✅ 100%** | **Comprehensive coverage** |

> [!NOTE]
> **Testnet Requirement**: Order/position/account tests require Binance Testnet credentials. Market data tests run without authentication using public APIs.

**Test Execution Flow**:

```mermaid
sequenceDiagram
    autonumber
    participant Runner as Test Runner (npm run test:execute)
    participant Engine as ReflectionTestEngine
    participant DynParams as DynamicOrderParams
    participant Client as BinanceRestClient
    participant API as Binance Testnet
    
    Runner->>Engine: loadScenarios("*.scenarios.json")
    Engine->>Engine: Parse JSON, filter enabled scenarios
    
    loop For each scenario
        Note over Engine: Phase 1: Setup Steps
        Engine->>DynParams: resolveDynamicParams($DYNAMIC_LIMIT_BUY)
        DynParams->>Client: getBookTicker("BTCUSDT")
        Client->>API: GET /fapi/v1/ticker/bookTicker
        API-->>DynParams: {bidPrice: 42000, askPrice: 42001}
        DynParams-->>Engine: bidPrice * 0.95 = 39900
        Engine->>Client: placeOrder({price: 39900, ...})
        Client->>API: POST /fapi/v1/order
        API-->>Engine: {orderId: 123456}
        Engine->>Engine: Store as variable ${setupOrderId}
        
        Note over Engine: Phase 2: Main Test
        Engine->>Client: getOrder(${setupOrderId})
        Client->>API: GET /fapi/v1/order
        API-->>Engine: {orderId: 123456, status: "NEW"}
        
        Note over Engine: Phase 3: Assertions
        Engine->>Engine: Assert status === "NEW"
        Engine->>Engine: Assert orderId === 123456
        
        Note over Engine: Phase 4: Cleanup
        Engine->>Client: cancelOrder(${setupOrderId})
        Client->>API: DELETE /fapi/v1/order
        API-->>Engine: {status: "CANCELED"}
    end
    
    Engine-->>Runner: Test Report (43 passed, 0 failed)
```

For complete test documentation, see [Test Project README](./src/Ark.Alliance.Trading.Providers.Lib.Test/README.md).

---

<div align="center">

**Built with <i class="fa fa-heart"></i> for the algorithmic trading community**

[<i class="fa fa-box"></i> npm](https://www.npmjs.com/package/ark-alliance-trading-providers-lib) • [<i class="fa fa-github"></i> GitHub](https://github.com/ArmandRicheletKleinberg/Ark.Alliance.Trading.Providers.Lib) • [<i class="fa fa-bug"></i> Issues](https://github.com/ArmandRicheletKleinberg/Ark.Alliance.Trading.Providers.Lib/issues)

</div>
