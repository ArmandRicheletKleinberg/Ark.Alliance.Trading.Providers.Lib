# Binance Mappers

## Overview

Pure functions that transform Binance API responses to common domain models.

---

## Architecture

```mermaid
flowchart LR
    subgraph Input["Binance DTOs"]
        OrderResponse[OrderResponse]
        PositionRisk[PositionRiskInfo]
        AccountInfo[AccountInfo]
    end
    
    subgraph Mappers["Mapper Functions"]
        OM[OrderMapper]
        PM[PositionMapper]
        AM[AccountMapper]
    end
    
    subgraph Output["Common Domain"]
        IOrder[IOrder]
        IPosition[IPosition]
        IAccount[IAccount]
    end
    
    OrderResponse --> OM --> IOrder
    PositionRisk --> PM --> IPosition
    AccountInfo --> AM --> IAccount
    
    style Input fill:#e1f5fe
    style Mappers fill:#fff3e0
    style Output fill:#e8f5e9
```

---

## Files

| File | From | To | Description |
|:-----|:-----|:---|:------------|
| `OrderMapper.ts` | `OrderResponse` | `IOrder` | Maps order fields, status, type |
| `PositionMapper.ts` | `PositionRiskInfo` | `IPosition` | Maps position, PnL, margin |
| `AccountMapper.ts` | `AccountInfo` | `IAccount` | Maps balances, positions |
| `TradeMapper.ts` | `UserTrade` | `ITrade` | Maps fill data |

---

## Usage

```typescript
import { OrderMapper, PositionMapper } from 'ark-alliance-trading-providers-lib/Binance';

// Map single order
const order: IOrder = OrderMapper.toCommon(binanceOrder);

// Map array of positions
const positions: IPosition[] = PositionMapper.toCommonArray(binancePositions);
```

---

## Design Principles

1. **Pure Functions** - No side effects, same input = same output
2. **Null Safety** - Handle missing/undefined fields gracefully
3. **Type Safety** - Full TypeScript type coverage
4. **Testable** - Easy to unit test with mock data
