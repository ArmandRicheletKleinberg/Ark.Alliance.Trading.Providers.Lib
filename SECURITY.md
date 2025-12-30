# Security Policy

## 🔐 Reporting Security Vulnerabilities

**DO NOT** report security vulnerabilities through public GitHub issues.

Instead, please report them via email to: **armand@m2h.io**

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within **48 hours** and work with you to understand and resolve the issue.

---

## 🛡️ Security Best Practices

### API Credentials Management

> [!CAUTION]
> **Never commit real API credentials to version control.**

#### ✅ DO:
- Use environment variables for all credentials
- Store credentials in `.env` files (add to `.gitignore`)
- Use separate credentials for testnet and production
- Rotate API keys regularly
- Use read-only keys for market data applications
- Set IP restrictions on exchange API keys

#### ❌ DON'T:
- Hardcode credentials in source code
- Commit `.env` files to git
- Share credentials in plaintext (Slack, email, etc.)
- Use production keys in development/testing
- Grant unnecessary permissions to API keys

### Environment Variables Template

Always use placeholder values in example files:

```bash
# ❌ WRONG
BINANCE_API_KEY=abc123def456

# ✅ CORRECT
BINANCE_API_KEY=CHANGE_ME_YOUR_BINANCE_API_KEY
```

### Testnet vs Production

| Environment | Use Case | Risk Level |
|:------------|:---------|:-----------|
| **Testnet** | Development, testing, debugging | 🟢 Low (fake funds) |
| **Production** | Live trading with real funds | 🔴 High (real money) |

> [!WARNING]
> Always test on **testnet** before deploying to production.

**Testnet URLs**:
- Binance Futures: `https://testnet.binancefuture.com`
- Deribit: `https://test.deribit.com`

---

## 🔒 Supported Versions

| Version | Supported          | Notes |
|:--------|:------------------:|:------|
| 1.0.x   | ✅ Yes             | Current stable release |
| < 1.0   | ❌ No              | Pre-release versions |

---

## 🚨 Known Security Considerations

### Rate Limiting
- The library tracks rate limits from exchange APIs
- Exceeding rate limits may result in temporary IP bans
- Use the `onRateLimitUpdate` callback to monitor limits

### WebSocket Connections
- WebSocket connections automatically reconnect on disconnection
- Listen keys expire after 60 minutes (auto-refreshed by library)
- Always call `disconnect()` to clean up resources

### Signature Generation
- HMAC-SHA256 for Binance (API secret never transmitted)
- Ed25519 for Deribit (private key never transmitted)
- Timestamps prevent replay attacks

---

## 📋 Security Checklist for Contributors

Before submitting a pull request:

- [ ] No hardcoded credentials in code
- [ ] No real API keys in test files
- [ ] `.env` files are in `.gitignore`
- [ ] Example files use "CHANGE_ME" placeholders
- [ ] No sensitive data in logs
- [ ] Dependencies are up to date
- [ ] No known vulnerabilities (run `npm audit`)

---

## 🔄 Vulnerability Disclosure Process

1. **Report** received via email
2. **Acknowledgment** within 48 hours
3. **Investigation** and severity assessment (1-7 days)
4. **Fix development** in private branch
5. **Testing** and validation
6. **Disclosure** after fix is released
7. **Credit** to reporter (unless anonymity requested)

---

## 📧 Contact

For security concerns, contact:

**Armand Richelet-Kleinberg**  
Email: armand@m2h.io  
Organization: M2H.Io Ark.Alliance

---

*Last Updated: 2025-12-30*
