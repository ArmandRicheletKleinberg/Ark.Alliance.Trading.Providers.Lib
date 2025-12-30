# Multi-Provider Architecture: Binance + Deribit Integration

> **Document Version:** 1.0  
> **Date:** 2025-12-29  
> **Scope:** `Ark.Alliance.Trading.Providers.Lib`  
> **Status:** 📋 Planning Phase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [AS-IS Analysis (Binance)](#2-as-is-analysis-binance)
3. [Deribit API Analysis](#3-deribit-api-analysis)
4. [Differences and Points of Attention](#4-differences-and-points-of-attention)
5. [TO-BE Design](#5-to-be-design)
6. [Implementation Plan](#6-implementation-plan)
7. [TODO List](#7-todo-list)
8. [Risk Areas and Open Questions](#8-risk-areas-and-open-questions)

---

## 1. Executive Summary

This document provides a comprehensive audit of the existing Binance provider implementation and defines the architecture for adding Deribit support while minimizing code duplication. The design follows **Clean Architecture** and **Domain-Driven Design (DDD)** principles.

### Key Findings

| Aspect | Binance | Deribit | Compatibility |
|--------|---------|---------|---------------|
| **Protocol** | REST + WebSocket streams | JSON-RPC over WebSocket/HTTP | ⚠️ Different paradigm |
| **Authentication** | HMAC signature per request | OAuth2 access/refresh tokens | ⚠️ Different strategy |
| **Instrument Naming** | `BTCUSDT` | `BTC-PERPETUAL`, `BTC-25MAR23` | ⚠️ Different format |
| **Subscriptions** | WebSocket native streams | JSON-RPC subscribe method | ⚠️ Different mechanism |
| **Position Model** | By symbol + position side | By instrument name | ✅ Similar concept |
| **Order Model** | Numeric order IDs | String order IDs | ⚠️ Type difference |

### Reuse Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    /Common/Clients/Base                      │
├─────────────────────────────────────────────────────────────┤
│  IProviderClient        - Interface for all provider clients │
│  IAuthStrategy          - Pluggable authentication strategy  │
│  BaseJsonRpcClient      - JSON-RPC WebSocket base (NEW)      │
│  BaseStreamClient       - Stream-based WebSocket base        │
│  BaseRestClient         - HTTP REST base (existing)          │
│  ResultMapper           - Provider-agnostic Result helpers   │
├─────────────────────────────────────────────────────────────┤
│                      /Common/Domain                          │
├─────────────────────────────────────────────────────────────┤
│  IOrder                 - Provider-agnostic order interface  │
│  IPosition              - Provider-agnostic position iface   │
│  IMarketData            - Provider-agnostic market data      │
│  BaseEvent              - Already exists and is reusable     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. AS-IS Analysis (Binance)

### 2.1 Current Architecture

The existing Binance provider follows a well-structured layered architecture:

```
src/Binance/
├── clients/                      # Infrastructure Layer
│   ├── Base/
│   │   ├── _BaseWebSocketClient.ts    # Abstract WS with reconnection
│   │   ├── _BaseRestClient.ts         # Abstract REST with latency tracking
│   │   └── types/                     # Config types
│   ├── BinanceApiWsClient.ts          # Order execution via WS API
│   ├── BinanceMarketDataWs.ts         # Public bookTicker stream
│   ├── BinanceRestClient.ts           # Signed REST API
│   ├── BinanceSpotClient.ts           # Spot SAPI for transfers
│   └── BinanceUserDataStream.ts       # User data stream (listenKey)
├── domain/                       # Domain Layer
│   ├── events/
│   │   ├── BaseEvent.ts              # ✅ Reusable abstract base
│   │   ├── AccountEvents.ts          # Account domain events
│   │   ├── OrderEvents.ts            # Order domain events
│   │   ├── PositionDomainEvents.ts   # Position domain events
│   │   └── SystemEvents.ts           # System domain events
│   ├── cache/
│   │   ├── AccountCache.ts           # Account state cache
│   │   ├── OrderCache.ts             # Order state cache
│   │   ├── PositionCache.ts          # Position state cache
│   │   └── SymbolInfoCache.ts        # Symbol metadata cache
│   └── value-objects/
│       ├── Price.ts                  # Immutable price VO
│       ├── Quantity.ts               # Immutable quantity VO
│       └── Symbol.ts                 # Symbol VO with precision
├── dtos/                         # Data Transfer Objects
│   ├── binance/                      # Raw Binance API types
│   ├── marketData/                   # Market data DTOs
│   ├── position/                     # Position DTOs
│   └── userDataStream/               # User stream DTOs
├── enums/                        # Enumerations
│   ├── OrderSide.ts, OrderType.ts, OrderStatus.ts, etc.
├── shared/                       # Shared utilities
│   ├── constants/BinanceConstants.ts
│   ├── errors/BinanceErrors.ts
│   └── utils/
└── utils/                        # Helper utilities
    ├── LatencyTracker.ts
    ├── ResiliencePolicy.ts
    └── ServerTimeSync.ts
```

### 2.2 Existing Abstractions

#### Classes Suitable for Multi-Provider Reuse

| Class | Location | Reuse Potential | Notes |
|-------|----------|-----------------|-------|
| `BaseEvent` | `domain/events/BaseEvent.ts` | ✅ **High** | Provider-agnostic, well-designed |
| `BaseWebSocketClient` | `clients/Base/` | ⚠️ **Medium** | Stream-oriented, not JSON-RPC compatible |
| `BaseRestClient` | `clients/Base/` | ⚠️ **Medium** | HMAC-focused, needs abstraction |
| `Result<T>` | `Common/result/` | ✅ **High** | Already provider-agnostic |
| `BaseService` | `Common/services/` | ✅ **High** | Provider-agnostic service lifecycle |
| `LatencyTracker` | `utils/` | ✅ **High** | Can be shared |
| `ResiliencePolicy` | `utils/` | ✅ **High** | Can be shared |

### 2.3 Limitations and Provider-Specific Assumptions

#### Hard-coded Binance Assumptions

1. **Authentication**: HMAC-SHA256 signature per request
2. **Time sync**: Binance-specific `-1021` error handling
3. **Listen Key**: User data stream requires periodic keepalive
4. **Symbol format**: Uppercase, no separators (e.g., `BTCUSDT`)
5. **WebSocket protocol**: JSON message streams, not JSON-RPC
6. **Order IDs**: Numeric (number type)
7. **Position Side**: `LONG`, `SHORT`, `BOTH`

---

## 3. Deribit API Analysis

> **Source**: [Official Deribit API Documentation](https://docs.deribit.com/)

### 3.1 Transport and Protocol

Deribit provides three API interfaces:
1. **JSON-RPC over WebSocket** (preferred)
2. **JSON-RPC over HTTP**
3. **FIX** (Financial Information eXchange)

> [!IMPORTANT]
> Deribit uses **JSON-RPC 2.0** protocol, NOT REST. All requests follow the RPC pattern with `method`, `params`, `id`.

#### WebSocket Endpoint Structure

| Environment | WebSocket URL |
|-------------|---------------|
| Production | `wss://www.deribit.com/ws/api/v2` |
| Testnet | `wss://test.deribit.com/ws/api/v2` |

#### JSON-RPC Request Format

```json
{
    "jsonrpc": "2.0",
    "id": 8066,
    "method": "public/ticker",
    "params": {
        "instrument_name": "BTC-PERPETUAL"
    }
}
```

#### JSON-RPC Response Format

```json
{
    "jsonrpc": "2.0",
    "id": 8066,
    "result": { /* ... */ },
    "usIn": 1535043730126248,
    "usOut": 1535043730126250,
    "usDiff": 2
}
```

### 3.2 Authentication Model

Deribit uses an **OAuth 2.0-style** authentication model with access and refresh tokens.

#### Authentication Methods

| Grant Type | Use Case |
|------------|----------|
| `client_credentials` | API key + secret → access token |
| `client_signature` | API key + HMAC signature → access token |
| `refresh_token` | Refresh expired access token |

#### Authentication Response

```json
{
    "jsonrpc": "2.0",
    "id": 9929,
    "result": {
        "access_token": "1582628593469.1MbQ-J_4...",
        "expires_in": 31536000,
        "refresh_token": "1582628593469.1GP4rQd0...",
        "scope": "connection mainaccount",
        "token_type": "bearer"
    }
}
```

### 3.3 Instrument Naming and Lifecycle

| Type | Pattern | Examples |
|------|---------|----------|
| **Perpetual** | `{CURRENCY}-PERPETUAL` | `BTC-PERPETUAL`, `ETH-PERPETUAL` |
| **Futures** | `{CURRENCY}-{DMMMYY}` | `BTC-25MAR23`, `BTC-5AUG23` |
| **Options** | `{CURRENCY}-{DMMMYY}-{STRIKE}-{K}` | `BTC-25MAR23-420-C`, `BTC-5AUG23-580-P` |

### 3.4 Order Object (Deribit)

```json
{
    "order_id": "ETH-584849853",
    "instrument_name": "ETH-PERPETUAL",
    "direction": "buy",
    "amount": 40,
    "filled_amount": 40,
    "price": 207.3,
    "average_price": 203.3,
    "order_type": "market",
    "order_state": "filled",
    "time_in_force": "good_til_cancelled"
}
```

### 3.5 Position Object (Deribit)

```json
{
    "instrument_name": "BTC-PERPETUAL",
    "direction": "buy",
    "size": 185160,
    "size_currency": 10.646886321,
    "average_price": 15000,
    "mark_price": 17391,
    "floating_profit_loss": 0.906961435,
    "leverage": 33,
    "kind": "future"
}
```

---

## 4. Differences and Points of Attention

### 4.1 Protocol Differences

| Aspect | Binance | Deribit |
|--------|---------|---------|
| **Protocol** | REST + WS streams | JSON-RPC |
| **Request ID** | Auto-generated | Client-provided |
| **Subscriptions** | Dedicated WS streams | `public/subscribe` RPC |
| **Error format** | `{ code, msg }` | `{ error: { code, message } }` |

### 4.2 Authentication Differences

| Aspect | Binance | Deribit |
|--------|---------|---------|
| **Method** | HMAC per request | OAuth tokens |
| **Token refresh** | N/A (listenKey) | Refresh token flow |
| **Scopes** | N/A | Granular scopes |

### 4.3 Data Model Differences

| Model | Binance | Deribit |
|-------|---------|---------|
| **Order ID** | `number` | `string` |
| **Symbol** | `BTCUSDT` | `BTC-PERPETUAL` |
| **Side** | `BUY`/`SELL` | `buy`/`sell` |
| **Position side** | `LONG`/`SHORT`/`BOTH` | N/A (direction-based) |

---

## 5. TO-BE Design

### 5.1 Target Multi-Provider Architecture

```
src/
├── Common/                           # Provider-Agnostic Core
│   ├── Clients/
│   │   └── Base/
│   │       ├── IProviderClient.ts        # Common client interface
│   │       ├── IAuthStrategy.ts          # Pluggable auth interface
│   │       ├── BaseStreamClient.ts       # For stream-based WS (Binance)
│   │       ├── BaseJsonRpcClient.ts      # For JSON-RPC WS (Deribit) [NEW]
│   │       └── BaseRestClient.ts         # HTTP REST base
│   ├── Domain/
│   │   ├── IOrder.ts                     # Provider-agnostic order
│   │   ├── IPosition.ts                  # Provider-agnostic position
│   │   └── IMarketData.ts                # Provider-agnostic market data
│   └── Events/
│       └── BaseEvent.ts                  # Move from Binance
├── Binance/                          # Binance Provider (Refactored)
│   ├── clients/
│   │   ├── BinanceAuthStrategy.ts        # Implements IAuthStrategy [NEW]
│   │   └── ... (existing clients)
│   ├── mappers/                          # DTO to Domain mappers [NEW]
│   └── ... (existing structure)
└── Deribit/                          # Deribit Provider [NEW]
    ├── clients/
    │   ├── DeribitJsonRpcClient.ts       # Extends BaseJsonRpcClient
    │   ├── DeribitMarketDataClient.ts    # Public subscriptions
    │   ├── DeribitUserDataClient.ts      # Private subscriptions
    │   └── DeribitAuthStrategy.ts        # OAuth2 token management
    ├── domain/
    │   ├── events/                       # Extends BaseEvent
    │   └── cache/                        # Deribit-specific caches
    ├── dtos/
    │   ├── auth/, trading/, account/, marketData/
    ├── enums/
    │   ├── DeribitEnvironment.ts
    │   ├── InstrumentKind.ts
    │   └── OrderState.ts
    ├── mappers/
    └── shared/
        ├── constants/DeribitConstants.ts
        └── errors/DeribitErrors.ts
```

### 5.2 Common Interfaces

#### IAuthStrategy Interface

```typescript
export interface IAuthStrategy {
    authenticate(): Promise<Result<AuthCredentials>>;
    refreshIfNeeded(): Promise<Result<AuthCredentials>>;
    applyToRequest(request: ProviderRequest): ProviderRequest;
    isValid(): boolean;
}
```

#### IOrder Interface

```typescript
export interface IOrder {
    readonly orderId: string;           // String for all providers
    readonly instrument: string;        // Provider-specific format
    readonly side: OrderSide;           // Normalized enum
    readonly type: OrderType;           // Normalized enum
    readonly quantity: string;          // String for precision
    readonly price?: string;
    readonly status: OrderStatus;       // Normalized enum
    readonly providerData: unknown;     // Type narrowing for specifics
}
```

---

## 6. Implementation Plan

### Phase 1: Extract Common Abstractions (2-3 days)

| File | Description |
|------|-------------|
| `Common/Clients/Base/IProviderClient.ts` | Base provider client interface |
| `Common/Clients/Base/IAuthStrategy.ts` | Authentication strategy interface |
| `Common/Clients/Base/BaseJsonRpcClient.ts` | JSON-RPC WebSocket base |
| `Common/Domain/IOrder.ts` | Provider-agnostic order interface |
| `Common/Domain/IPosition.ts` | Provider-agnostic position interface |
| `Common/Events/BaseEvent.ts` | Move from Binance |

### Phase 2: Refactor Binance Provider (2-3 days)

| File | Changes |
|------|---------|
| `Binance/clients/BinanceAuthStrategy.ts` | Extract HMAC auth to strategy |
| `Binance/mappers/OrderMapper.ts` | Map Binance DTO → `IOrder` |
| `Binance/mappers/PositionMapper.ts` | Map Binance DTO → `IPosition` |
| Update all event imports | Point to `Common/Events/BaseEvent.ts` |

### Phase 3: Implement Deribit Provider (5-7 days)

#### Step 3.1: Enums
- `DeribitEnvironment.ts`, `InstrumentKind.ts`, `OrderState.ts`, `Direction.ts`, `TimeInForce.ts`, `GrantType.ts`

#### Step 3.2: DTOs
- `dtos/auth/`, `dtos/trading/`, `dtos/account/`, `dtos/marketData/`

#### Step 3.3: Clients
- `DeribitJsonRpcClient.ts`, `DeribitAuthStrategy.ts`, `DeribitMarketDataClient.ts`, `DeribitUserDataClient.ts`

#### Step 3.4: Domain & Mappers
- Events extending `BaseEvent`, caches, mappers

### Phase 4: Integration and Testing (3-4 days)

- Provider factory pattern
- Integration tests for Deribit
- End-to-end testnet tests

---

## 7. TODO List

### 🔴 Priority 0 (Critical)

- [ ] Create `Common/Clients/Base/IProviderClient.ts`
- [ ] Create `Common/Clients/Base/IAuthStrategy.ts`
- [ ] Create `Common/Clients/Base/BaseJsonRpcClient.ts`
- [ ] Move `BaseEvent` to `Common/Events/`
- [ ] Create `Common/Domain/IOrder.ts`, `IPosition.ts`, `IMarketData.ts`

### 🟠 Priority 1 (High)

- [ ] Create `Binance/clients/BinanceAuthStrategy.ts`
- [ ] Create `Deribit/enums/` (all enum files)
- [ ] Create `Deribit/dtos/` (all DTO directories)
- [ ] Create `Deribit/clients/DeribitJsonRpcClient.ts`
- [ ] Create `Deribit/clients/DeribitAuthStrategy.ts`
- [ ] Create `Deribit/clients/DeribitMarketDataClient.ts`
- [ ] Create `Deribit/clients/DeribitUserDataClient.ts`

### 🟡 Priority 2 (Medium)

- [ ] Create `Deribit/domain/events/` (extend `BaseEvent`)
- [ ] Create `Deribit/domain/cache/`
- [ ] Create `Deribit/mappers/`
- [ ] Create `Deribit/shared/constants/DeribitConstants.ts`
- [ ] Create `Deribit/shared/errors/DeribitErrors.ts`
- [ ] Create `Common/ProviderFactory.ts`

### 🟢 Priority 3 (Low)

- [ ] Create integration tests for Deribit
- [ ] Create end-to-end testnet tests
- [ ] Add JSDoc documentation to all new files
- [ ] Update main `index.ts` to export Deribit

---

## 8. Risk Areas and Open Questions

### 🔴 High Risk

| Area | Risk | Mitigation |
|------|------|------------|
| **Token expiration** | Access token expires during operation | Proactive refresh 5 min before expiry |
| **2FA requirements** | Some operations may fail without 2FA | Handle `verification_required` error |
| **Rate limits** | Different model than Binance | Deribit-specific rate limit cache |

### 🟠 Medium Risk

| Area | Risk | Mitigation |
|------|------|------------|
| **Instrument parsing** | Complex naming scheme edge cases | Comprehensive unit tests |
| **Reconnection** | Cancel-on-disconnect behavior | Explicit `enable_cancel_on_disconnect` call |
| **Position model** | No explicit position side | Map `direction` field |

### 🟡 Open Questions

1. **Partial fills handling**: How are partial fills reported in `user.changes` subscription?
2. **Order ID format**: Are order IDs always prefixed with instrument?
3. **Reconnection**: Does server auto re-subscribe after reconnection?
4. **Testnet funding**: How to obtain testnet funds for testing?
5. **Linear vs Inverse**: Settlement currency handling?

---

> **Next Steps:** After approval of this plan, proceed with Phase 1 implementation starting with common abstractions.
