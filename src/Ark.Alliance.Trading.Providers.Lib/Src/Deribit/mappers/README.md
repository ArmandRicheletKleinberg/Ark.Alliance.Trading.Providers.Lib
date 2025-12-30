# Deribit Mappers

## Overview

Pure functions transforming Deribit API responses to common domain models.

---

## Architecture

```mermaid
flowchart LR
    subgraph Input["Deribit DTOs"]
        OrderDto[DeribitOrder]
        PositionDto[DeribitPosition]
        TickerDto[DeribitTicker]
    end
    
    subgraph Mappers["Mapper Functions"]
        OM[DeribitOrderMapper]
        PM[DeribitPositionMapper]
        TM[DeribitTickerMapper]
    end
    
    subgraph Output["Common Domain"]
        IOrder[IOrder]
        IPosition[IPosition]
        ITicker[ITicker]
    end
    
    OrderDto --> OM --> IOrder
    PositionDto --> PM --> IPosition
    TickerDto --> TM --> ITicker
    
    style Input fill:#e1f5ee
    style Mappers fill:#3e70ef
    style Output fill:#1e40af
```

---

## Files

| File | From | To |
|:-----|:-----|:---|
| `DeribitOrderMapper.ts` | `DeribitOrder` | `IOrder` |
| `DeribitPositionMapper.ts` | `DeribitPosition` | `IPosition` |

---

## Enum Mappings

| Deribit | Common |
|:--------|:-------|
| `buy` | `BUY` |
| `sell` | `SELL` |
| `limit` | `LIMIT` |
| `market` | `MARKET` |
| `stop_limit` | `STOP_LIMIT` |
| `stop_market` | `STOP_MARKET` |

---

## Usage

```typescript
import { DeribitOrderMapper, DeribitPositionMapper } from 'ark-alliance-trading-providers-lib/Deribit';

// Map order
const order: IOrder = DeribitOrderMapper.toCommon(deribitOrder);

// Map positions
const positions: IPosition[] = DeribitPositionMapper.toCommonArray(deribitPositions);
```
