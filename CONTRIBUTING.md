# Contributing to Ark Alliance Trading Providers Library

Thank you for your interest in contributing! We welcome contributions from the community.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

---

## 📜 Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow:

- **Be respectful** and inclusive
- **Be collaborative** and constructive
- **Be professional** in all interactions
- **Focus on what is best** for the community
- **Show empathy** towards other community members

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Git** for version control
- **TypeScript** knowledge recommended

### Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/Ark.Alliance.Trading.Bot-React.git
cd Ark.Alliance.Trading.Bot-React
```

---

## 💻 Development Setup

### 1. Install Dependencies

```bash
# Install library dependencies
cd src/Ark.Alliance.Trading.Providers.Lib
npm install

# Install test dependencies
cd ../Ark.Alliance.Trading.Providers.Lib.Test
npm install
```

### 2. Configure Environment

Create a `.env` file in the test project:

```bash
cd src/Ark.Alliance.Trading.Providers.Lib.Test
cp .env.example .env
```

Edit `.env` with your testnet credentials:
- Binance Testnet: https://testnet.binancefuture.com
- Deribit Testnet: https://test.deribit.com

### 3. Build and Test

```bash
# Build the library
cd src/Ark.Alliance.Trading.Providers.Lib
npm run build

# Run market data tests (no credentials needed)
cd ../Ark.Alliance.Trading.Providers.Lib.Test
npm run test:execute:market

# Run full test suite (requires credentials)
npm run test:execute
```

---

## 🤝 How to Contribute

### Types of Contributions

- 🐛 **Bug Reports**: Found a bug? Open an issue
- ✨ **Feature Requests**: Have an idea? Propose it
- 🔧 **Bug Fixes**: Submit a pull request
- 📚 **Documentation**: Improve docs
- 🧪 **Tests**: Add test coverage
- 🌐 **New Providers**: Add support for new exchanges

### Reporting Bugs

When reporting bugs, include:
- **Clear title** and description
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Environment details** (Node version, OS, etc.)
- **Code samples** or error messages
- **Possible solution** (if you have one)

Use the bug report template when creating an issue.

### Suggesting Features

When suggesting features:
- **Explain the use case** and problem it solves
- **Describe the proposed solution**
- **Consider alternatives** you've evaluated
- **Show examples** if applicable

---

## 🎨 Coding Standards

### TypeScript Style

```typescript
// ✅ Good: Clear interfaces and types
interface OrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: OrderType;
  quantity: number;
  price?: number;
}

// ✅ Good: Result pattern for error handling
async function placeOrder(params: OrderParams): Promise<Result<Order>> {
  // Implementation
}

// ❌ Bad: Using `any` type
function processData(data: any): any {
  // Avoid this
}
```

### Naming Conventions

| Type | Convention | Example |
|:-----|:-----------|:--------|
| **Classes** | PascalCase | `BinanceRestClient` |
| **Interfaces** | PascalCase with `I` prefix | `IAuthStrategy` |
| **Functions** | camelCase | `generateSignature()` |
| **Constants** | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT` |
| **Files** | PascalCase | `OrderMapper.ts` |

### Code Organization

- **One class per file** (except related types)
- **Group related functionality** in folders
- **Use barrel exports** (`index.ts`)
- **Keep functions pure** when possible
- **Minimize side effects**

### Documentation

```typescript
/**
 * Places an order on the exchange.
 * 
 * @param params - Order parameters including symbol, side, type, and quantity
 * @returns Result containing the created Order or an error
 * 
 * @example
 * ```typescript
 * const result = await client.placeOrder({
 *   symbol: 'BTCUSDT',
 *   side: 'BUY',
 *   type: 'MARKET',
 *   quantity: 0.001
 * });
 * ```
 */
async placeOrder(params: OrderParams): Promise<Result<Order>>
```

---

## 🧪 Testing Requirements

### Test Coverage

- All new features **must include tests**
- Bug fixes **must include regression tests**
- Aim for **>90% code coverage**
- Use the scenario-based test engine when applicable

### Writing Tests

```typescript
// Use the ReflectionTestEngine for integration tests
// Add scenarios to JSON files in Src/Scenarios/

// Example scenario:
{
  "name": "Place Market Order",
  "enabled": true,
  "targetClass": "BinanceRestClient",
  "targetMethod": "placeOrder",
  "input": {
    "symbol": "BTCUSDT",
    "side": "BUY",
    "type": "MARKET",
    "quantity": 0.001
  },
  "expectedOutput": {
    "success": true,
    "status": "FILLED"
  }
}
```

### Running Tests

```bash
# Run all tests
npm run test:execute

# Run specific category
npm run test:execute:account
npm run test:execute:market

# Verbose output
npm run test:verbose
```

---

## 🔄 Pull Request Process

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Changes

- Follow coding standards
- Write tests
- Update documentation
- Commit with clear messages

### 3. Commit Guidelines

```bash
# Format: <type>(<scope>): <subject>

# Examples:
git commit -m "feat(binance): add support for bracket orders"
git commit -m "fix(deribit): correct timestamp format in auth"
git commit -m "docs(readme): update installation instructions"
git commit -m "test(orders): add tests for GTX order types"
```

**Types**: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`

### 4. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

### 5. PR Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Commit messages are clear
- [ ] No credentials in code

### 6. Review Process

- Maintainers will review your PR
- Address feedback promptly
- Keep PR focused and small
- Be patient and respectful

---

## 🌐 Adding New Providers

To add support for a new exchange:

1. **Create provider folder**: `Src/NewProvider/`
2. **Implement clients**: REST and/or WebSocket clients
3. **Add DTOs**: Request/response data structures
4. **Create mappers**: API response to domain models
5. **Add tests**: Comprehensive test scenarios
6. **Update documentation**: Provider-specific README
7. **Update main README**: Add to supported providers list

See existing providers (Binance, Deribit) as reference implementations.

---

## 💬 Community

- **Issues**: https://github.com/ArmandRicheletKleinberg/Ark.Alliance.Trading.Bot-React/issues
- **Discussions**: Use GitHub Discussions for questions
- **Email**: armand@m2h.io for direct contact

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Ark Alliance Trading Providers Library!** 🚀

*Last Updated: 2025-12-30*
