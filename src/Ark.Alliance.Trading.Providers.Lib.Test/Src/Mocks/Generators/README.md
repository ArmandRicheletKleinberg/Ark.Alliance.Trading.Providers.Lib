# Mock Data Generators

Comprehensive mock data generation system for realistic financial time series, orders, positions, and events testing without live API dependencies.

---

## Table of Contents

1. [Overview](#overview)
2. [Mathematical Foundations](#mathematical-foundations)
3. [Generators](#generators)
4. [Usage Examples](#usage-examples)
5. [Academic References](#academic-references)
6. [Best Practices](#best-practices)

---

## Overview

This module provides four core generators that produce realistic mock data for testing trading systems:

| Generator | Purpose | Key Features |
|:----------|:--------|:-------------|
| **PriceSeriesGenerator** | Time series prices | GBM, GARCH, fat tails, events |
| **OrderGenerator** | Order lifecycle | 7 types, 6 statuses, sequences |
| **PositionGenerator** | Position states | 10 scenarios, all leverages |
| **EventGenerator** | WebSocket events | 4 types, 6 patterns |

### Why Mock Data?

1. **CI/CD Friendly** - No external dependencies, runs in GitHub Actions
2. **Deterministic** - Reproducible results with seeded RNG
3. **Edge Cases** - Test rare events (flash crash, liquidation)
4. **Fast** - Instant generation, no network latency
5. **Complete Coverage** - All order types, statuses, transitions

---

## Mathematical Foundations

### 1. Geometric Brownian Motion (GBM)

**Used in**: `PriceSeriesGenerator`

#### Mathematical Formula

Price evolution follows the stochastic differential equation:

```
dS(t) = μ S(t) dt + σ S(t) dW(t)
```

Where:
- `S(t)` = Asset price at time t
- `μ` = Drift (expected return)
- `σ` = Volatility
- `W(t)` = Wiener process (standard Brownian motion)

#### Discrete Implementation

For simulation with time steps Δt:

```
S(t+Δt) = S(t) exp((μ - σ²/2)Δt + σ√Δt · Z)
```

Where `Z ~ N(0,1)` (standard normal distribution)

#### Why GBM?

- **Realistic**: Captures exponential growth and log-normal distribution
- **Positive prices**: Prices never go negative (unlike arithmetic BM)
- **Industry standard**: Used in Black-Scholes and derivative pricing
- **Simplicity**: Easy to implement and understand

**Reference**: Black, F., & Scholes, M. (1973). "The Pricing of Options and Corporate Liabilities." *Journal of Political Economy*, 81(3), 637-654.

---

### 2. GARCH Volatility Clustering

**Used in**: `PriceSeriesGenerator` (optional)

#### Mathematical Formula - GARCH(1,1)

Conditional variance follows:

```
σ²(t) = ω + α · ε²(t-1) + β · σ²(t-1)
```

Where:
- `σ²(t)` = Conditional variance at time t
- `ω` = Long-term variance (base level)
- `α` = ARCH coefficient (shock persistence)
- `β` = GARCH coefficient (volatility persistence)
- `ε(t-1)` = Previous period's return shock

**Stationarity Constraint**: `α + β < 1`

#### "Stylized Facts" Captured

1. **Volatility Clustering**: High volatility periods cluster together
2. **Mean Reversion**: Volatility reverts to long-term mean
3. **Persistence**: Shocks affect variance for multiple periods

#### Typical Parameters

```typescript
{
    omega: 0.0001,  // Base variance
    alpha: 0.1,     // Shock persistence (10%)
    beta: 0.85      // Volatility persistence (85%)
}
```

**Reference**: Bollerslev, T. (1986). "Generalized Autoregressive Conditional Heteroskedasticity." *Journal of Econometrics*, 31(3), 307-327.

---

### 3. Fat-Tailed Distributions (Student-t)

**Used in**: `PriceSeriesGenerator`

#### Mathematical Formula

Probability density function:

```
f(x) = Γ((ν+1)/2) / (√(νπ) · Γ(ν/2)) · (1 + x²/ν)^(-(ν+1)/2)
```

Where:
- `ν` = Degrees of freedom (lower = fatter tails)
- `Γ(·)` = Gamma function

#### Why Student-t?

**Empirical Evidence**: Financial returns exhibit **excess kurtosis** (fat tails)

| Distribution | Kurtosis | Extreme Events |
|:-------------|:---------|:---------------|
| Normal (Z) | 3 | Rare |
| Student-t (ν=5) | 9 | Common |
| Actual market | 5-10 | Very common |

**Typical Parameters**: ν = 3 to 7 degrees of freedom

**Reference**: Mandelbrot, B. (1963). "The Variation of Certain Speculative Prices." *The Journal of Business*, 36(4), 394-419.

---

### 4. Event Injection (Jumps)

**Used in**: `PriceSeriesGenerator`

#### Mathematical Model - Jump Diffusion

```
dS(t) = μ S(t) dt + σ S(t) dW(t) + S(t⁻) dJ(t)
```

Where:
- `J(t)` = Jump process (Poisson distributed)
- Jumps occur with probability `λ dt`
- Jump size drawn from distribution (e.g., log-normal)

#### Implemented Events

```typescript
{
    flashCrashProbability: 0.01,    // 1% per step
    flashCrashMagnitude: 0.03,      // -3% drop
    gapProbability: 0.02,           // 2% per step
    gapMagnitude: 0.015             // ±1.5% gap
}
```

**Reference**: Merton, R. C. (1976). "Option Pricing when Underlying Stock Returns are Discontinuous." *Journal of Financial Economics*, 3(1-2), 125-144.

---

## Generators

### 1. PriceSeriesGenerator

**File**: [`PriceSeriesGenerator.ts`](./PriceSeriesGenerator.ts)

#### Features

- ✅ Geometric Brownian Motion (GBM)
- ✅ GARCH(1,1) volatility clustering
- ✅ Student-t distribution (fat tails)
- ✅ Event injection (flash crash, gaps)
- ✅ Seeded RNG for reproducibility

#### Usage

```typescript
import { createBtcPriceGenerator } from './Mocks/Generators';

// Simple GBM
const generator = createBtcPriceGenerator(100, 42); // 100 steps, seed=42
const prices = generator.generate();

// Advanced with GARCH
const advancedGen = new PriceSeriesGenerator(
    {
        startPrice: 50000,
        volatility: 0.5,
        drift: 0.0,
        steps: 100,
        seed: 42
    },
    {
        alpha: 0.1,
        beta: 0.85,
        omega: 0.0001
    },
    {
        flashCrashProbability: 0.01,
        flashCrashMagnitude: 0.03
    }
);
```

#### Output Format

```typescript
interface PricePoint {
    timestamp: number;  // Unix timestamp (ms)
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
```

---

### 2. OrderGenerator

**File**: [`OrderGenerator.ts`](./OrderGenerator.ts)

#### Coverage

**Order Types** (7):
- MARKET, LIMIT
- STOP, STOP_MARKET
- TAKE_PROFIT, TAKE_PROFIT_MARKET
- TRAILING_STOP_MARKET

**Order Statuses** (6):
- NEW, PARTIALLY_FILLED, FILLED
- CANCELED, EXPIRED, REJECTED

**Time In Force** (4):
- GTC (Good Till Cancel)
- IOC (Immediate Or Cancel)
- FOK (Fill Or Kill)
- GTX (Good Till Crossing - Post Only)

#### Usage

```typescript
import { OrderGenerator } from './Mocks/Generators';

const generator = new OrderGenerator();

// Simple market order
const marketOrder = generator.generateMarketOrder(
    'BTCUSDT',
    'BUY',
    0.001,
    50000
);

// Complete lifecycle
const [newOrder, filledOrder] = generator.generateOrderLifecycle(
    'BTCUSDT',
    'BUY',
    'LIMIT',
    0.001,
    49000
);

// All statuses for mapping tests
const allStatuses = generator.generateAllStatuses('LIMIT');
```

---

### 3. PositionGenerator

**File**: [`PositionGenerator.ts`](./PositionGenerator.ts)

#### Scenarios (10)

| Scenario | Leverage | Use Case |
|:---------|:---------|:---------|
| `LONG_PROFIT` | 10x | Long position in profit |
| `LONG_LOSS` | 10x | Long position in loss |
| `SHORT_PROFIT` | 10x | Short position in profit |
| `SHORT_LOSS` | 10x | Short position in loss |
| `NEUTRAL` | N/A | No position (closed) |
| `NEAR_LIQUIDATION` | 20x | **Critical** - liquidation risk |
| `HIGH_LEVERAGE` | 125x | Maximum leverage |
| `MEDIUM_LEVERAGE_25X` | 25x | Common day trader |
| `MEDIUM_LEVERAGE_50X` | 50x | Higher risk |
| `LOW_LEVERAGE` | 1x | Conservative (≈ spot) |

#### Liquidation Price Formula

**Simplified** (for testing):

```
Liquidation Price (Long) = Entry Price × (1 - 1/Leverage + MMR)
Liquidation Price (Short) = Entry Price × (1 + 1/Leverage - MMR)
```

Where `MMR` = Maintenance Margin Rate (typically 0.4%)

**Note**: Actual Binance calculation is more complex (includes position tier, margin balance, etc.)

#### Usage

```typescript
import { PositionGenerator } from './Mocks/Generators';

const generator = new PositionGenerator();

// Specific scenario
const longProfit = generator.generateLongInProfit('BTCUSDT', 0.01, 5);

// Near liquidation (critical test)
const nearLiq = generator.generateNearLiquidation('BTCUSDT', true);

// All scenarios
const allScenarios = generator.generateAllScenarios();

// Position lifecycle
const [open, update, close] = generator.generatePositionLifecycle(
    'BTCUSDT',
    true, // isLong
    0.01
);
```

---

### 4. EventGenerator

**File**: [`EventGenerator.ts`](./EventGenerator.ts)

#### Event Types (4)

```typescript
type UserDataEventType =
    | 'ORDER_TRADE_UPDATE'    // Order state change
    | 'ACCOUNT_UPDATE'        // Position/balance update
    | 'MARGIN_CALL'           // Liquidation warning
    | 'listenKeyExpired';     // Connection event
```

#### Event Sequences (6)

```typescript
// 1. Order Lifecycle
generateOrderLifecycleSequence(order, position)
// → NEW (0ms) → FILLED (100ms) → ACCOUNT_UPDATE (150ms)

// 2. Partial Fill
generatePartialFillSequence(order, 3)
// → PARTIALLY_FILLED (100ms) → PARTIALLY_FILLED (200ms) → FILLED (300ms)

// 3. Stop Trigger
generateStopTriggerSequence(order, position)
// → NEW (0ms) → FILLED (50ms) → ACCOUNT_UPDATE (100ms)

// 4. Position Inversion
generatePositionInversionSequence(closeOrder, openOrder, neutral, newPos)
// → Close LONG → Neutral → Open SHORT

// 5. Margin Call
generateMarginCallSequence(positions)
// → MARGIN_CALL (0ms) → ACCOUNT_UPDATE (100ms)

// 6. Cancellation
generateCancellationSequence(order)
// → NEW (0ms) → CANCELED (100ms)
```

#### Usage

```typescript
import { EventGenerator, OrderGenerator, PositionGenerator } from './Mocks/Generators';

const eventGen = new EventGenerator();
const orderGen = new OrderGenerator();
const posGen = new PositionGenerator();

// Create mock data
const order = orderGen.generateMarketOrder('BTCUSDT', 'BUY', 0.001, 50000);
const position = posGen.generateLongInProfit();

// Generate event sequence
const sequence = eventGen.generateOrderLifecycleSequence(order, position);

// Emit events with delays
for (const step of sequence) {
    await new Promise(r => setTimeout(r, step.delay));
    emitter.emit(step.type, step.data);
}
```

---

## Usage Examples

### Example 1: Complete Order Flow Test

```typescript
import {
    OrderGenerator,
    PositionGenerator,
    EventGenerator
} from './Mocks/Generators';

// Setup
const orderGen = new OrderGenerator();
const posGen = new PositionGenerator();
const eventGen = new EventGenerator();

// 1. Generate market order
const order = orderGen.generateMarketOrder('BTCUSDT', 'BUY', 0.01, 50000);

// 2. Generate resulting position
const position = posGen.generateLongInProfit('BTCUSDT', 0.01, 2);

// 3. Generate event sequence
const events = eventGen.generateOrderLifecycleSequence(order, position);

// 4. Test mapper
const mappedOrder = OrderMapper.mapBinanceOrderToIOrder(order);

// 5. Verify flow
expect(mappedOrder.status).toBe('FILLED');
expect(mappedOrder.executedQty).toBe(order.origQty);
```

### Example 2: Volatility Clustering Test

```typescript
import { PriceSeriesGenerator } from './Mocks/Generators';

// Generate price series with GARCH
const generator = new PriceSeriesGenerator(
    { startPrice: 50000, volatility: 0.5, drift: 0, steps: 1000, seed: 42 },
    { alpha: 0.1, beta: 0.85, omega: 0.0001 }
);

const prices = generator.generate();

// Calculate realized volatility windows
const volatilities = prices.map((p, i) => {
    if (i < 20) return 0;
    const returns = prices.slice(i-20, i).map((p2, j) =>
        Math.log(p2.close / prices[i-20+j-1]?.close || 1)
    );
    return Math.sqrt(returns.reduce((a,b) => a + b*b, 0) / 20);
});

// Verify clustering: High vol periods cluster together
const clustered = volatilities.filter((v, i) =>
    i > 0 && v > 0.02 && volatilities[i-1] > 0.02
).length;

expect(clustered).toBeGreaterThan(volatilities.filter(v => v > 0.02).length * 0.3);
```

### Example 3: Liquidation Risk Test

```typescript
import { PositionGenerator } from './Mocks/Generators';

const generator = new PositionGenerator();

// Generate near-liquidation position
const position = generator.generateNearLiquidation('BTCUSDT', true);

// Verify liquidation price proximity
const markPrice = parseFloat(position.markPrice);
const liqPrice = parseFloat(position.liquidationPrice);
const distance = Math.abs(markPrice - liqPrice) / markPrice;

// Should be within 1% of liquidation
expect(distance).toBeLessThan(0.01);

// Test liquidation warning logic
const shouldWarn = distance < 0.02;
expect(shouldWarn).toBe(true);
```

---

## Academic References

### Core Financial Mathematics

1. **Black, F., & Scholes, M.** (1973). "The Pricing of Options and Corporate Liabilities." *Journal of Political Economy*, 81(3), 637-654.
   - Foundation of GBM in finance

2. **Bollerslev, T.** (1986). "Generalized Autoregressive Conditional Heteroskedasticity." *Journal of Econometrics*, 31(3), 307-327.
   - GARCH model introduction

3. **Engle, R. F.** (1982). "Autoregressive Conditional Heteroscedasticity with Estimates of the Variance of United Kingdom Inflation." *Econometrica*, 50(4), 987-1007.
   - ARCH model (predecessor to GARCH)

4. **Merton, R. C.** (1976). "Option Pricing when Underlying Stock Returns are Discontinuous." *Journal of Financial Economics*, 3(1-2), 125-144.
   - Jump diffusion models

5. **Mandelbrot, B.** (1963). "The Variation of Certain Speculative Prices." *The Journal of Business*, 36(4), 394-419.
   - Fat tails and non-normal distributions in finance

### Stylized Facts

6. **Cont, R.** (2001). "Empirical Properties of Asset Returns: Stylized Facts and Statistical Issues." *Quantitative Finance*, 1(2), 223-236.
   - Comprehensive survey of financial time series properties

7. **Ding, Z., Granger, C. W., & Engle, R. F.** (1993). "A Long Memory Property of Stock Market Returns and a New Model." *Journal of Empirical Finance*, 1(1), 83-106.
   - Long-term volatility persistence

### Testing and Simulation

8. **Glasserman, P.** (2004). *Monte Carlo Methods in Financial Engineering*. Springer.
   - Simulation techniques for finance

9. **Seydel, R. U.** (2012). *Tools for Computational Finance* (5th ed.). Springer.
   - Numerical methods for financial models

### Recent Machine Learning Approaches

10. **Esteban, C., Hyland, S. L., & Rätsch, G.** (2017). "Real-valued (Medical) Time Series Generation with Recurrent Conditional GANs." *arXiv preprint arXiv:1706.02633*.
    - Modern synthetic data generation

---

## Best Practices

### 1. Reproducibility

**Always use seeds** for deterministic tests:

```typescript
const generator = createBtcPriceGenerator(100, 42); // seed = 42
```

### 2. Realistic Parameters

**Use market-calibrated values**:

```typescript
// BTC typical volatility: 50-80% annual
{ volatility: 0.5 }

// GARCH typical for crypto
{ alpha: 0.1, beta: 0.85, omega: 0.0001 }

// Fat tails (ν=5 is realistic)
random.nextStudentT(5)
```

### 3. Edge Case Coverage

**Test rare but critical scenarios**:

```typescript
// Flash crash
{ flashCrashProbability: 0.01, flashCrashMagnitude: 0.05 }

// Near liquidation
const nearLiq = generator.generateNearLiquidation('BTCUSDT', true);

// Massive leverage
const highLev = generator.generateHighLeverage();
```

### 4. Validation

**Verify statistical properties**:

```typescript
// Check mean ≈ 0 for returns
const returns = prices.map((p, i) => i > 0 ?
    Math.log(p.close / prices[i-1].close) : 0
);
const mean = returns.reduce((a,b) => a+b) / returns.length;
expect(Math.abs(mean)).toBeLessThan(0.01);

// Check volatility clustering autocorrelation
const absReturns = returns.map(Math.abs);
const acf = calculateAutocorrelation(absReturns, 1);
expect(acf).toBeGreaterThan(0.1); // Positive autocorrelation
```

---

## Authors

**Armand Richelet-Kleinberg** - *Architect*
- Mock data architecture design
- Core generator implementation

**Ceasar (Anthropic Claude)** - *AI Collaboration Partner*
- Mathematical formulation
- Code generation and optimization
- Documentation and references

---

## License

Part of Ark Alliance Trading Providers Library.
