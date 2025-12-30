# NPM Publishing Guide

## 📋 Prerequisites

Before publishing to NPM, ensure you have:

1. **NPM Account**: Create one at https://www.npmjs.com/signup
2. **NPM Token**: Generate a token from https://www.npmjs.com/settings/tokens
3. **GitHub Secrets**: Add `NPM_TOKEN` to repository secrets
4. **Clean Build**: All tests passing, no uncommitted changes
5. **Version Update**: Bump version in `package.json`

---

## 🚀 Publishing Methods

### Method 1: Automated (Recommended)

Publishing is automated via GitHub Actions when you create a version tag:

```bash
# 1. Update version in package.json
cd src/Ark.Alliance.Trading.Providers.Lib
npm version patch  # or minor, or major

# 2. Commit and push changes
git add package.json
git commit -m "chore: bump version to X.Y.Z"
git push

# 3. Create and push version tag
git tag v1.0.1
git push origin v1.0.1

# GitHub Actions will automatically:
# - Build the library
# - Run tests
# - Publish to NPM
# - Create GitHub release
```

### Method 2: Manual Publishing

If you need to publish manually:

```bash
# 1. Navigate to library
cd src/Ark.Alliance.Trading.Providers.Lib

# 2. Login to NPM
npm login

# 3. Build library
npm run build

# 4. Publish
npm publish --access public

# 5. Verify publication
npm info ark-alliance-trading-providers-lib
```

---

## 📝 Pre-Publish Checklist

- [ ] All tests passing (`npm run test:execute`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Version bumped in `package.json`
- [ ] CHANGELOG.md updated
- [ ] No credentials in codebase
- [ ] README.md updated with new features
- [ ] dist/ folder built and contains correct files
- [ ] Git working directory clean

---

## 🔐 NPM Token Setup

### For GitHub Actions

1. Generate token at https://www.npmjs.com/settings/tokens
   - Token Type: **Automation**
   - Permissions: **Publish**
2. Add to GitHub repository secrets:
   - Go to repository → Settings → Secrets and variables → Actions
   - Create new secret: `NPM_TOKEN`
   - Paste the token value

### For Local Publishing

```bash
# Login interactively
npm login

# Or use token
npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN
```

---

## 🏷️ Versioning Strategy

Follow **Semantic Versioning** (semver):

| Version Type | When to Use | Command |
|:-------------|:------------|:--------|
| **Patch** (1.0.1) | Bug fixes, no API changes | `npm version patch` |
| **Minor** (1.1.0) | New features, backward compatible | `npm version minor` |
| **Major** (2.0.0) | Breaking changes | `npm version major` |

### Pre-release Versions

```bash
# Beta release
npm version 1.1.0-beta.1

# Release candidate
npm version 1.1.0-rc.1
```

---

## 📦 Package Contents

The published package includes:

```
ark-alliance-trading-providers-lib@1.0.0
├── dist/              # Compiled JavaScript + TypeScript declarations
│   ├── index.js
│   ├── index.d.ts
│   ├── Binance/
│   ├── Deribit/
│   └── Common/
├── README.md          # Documentation
└── LICENSE            # MIT License
```

**Excluded** (via `.npmignore`):
- Source TypeScript files (`Src/`)
- Tests
- Configuration files
- Development dependencies

---

## 🔍 Post-Publish Verification

After publishing, verify the package:

```bash
# Check package info
npm info ark-alliance-trading-providers-lib

# Test installation in a new project
mkdir test-install
cd test-install
npm init -y
npm install ark-alliance-trading-providers-lib

# Verify import works
node -e "const lib = require('ark-alliance-trading-providers-lib'); console.log('✓ Import successful');"
```

---

## 🐛 Troubleshooting

### "Package already exists"

```bash
# Increment version first
npm version patch
git push && git push --tags
```

### "Authentication failed"

```bash
# Re-login to NPM
npm logout
npm login
```

### "EPUBLISHCONFLICT"

This version has already been published. You cannot overwrite published versions.

```bash
# Bump to a new version
npm version patch
```

### Build Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

---

## 📊 NPM Statistics

After publishing, track your package:

- **NPM Page**: https://www.npmjs.com/package/ark-alliance-trading-providers-lib
- **Download Stats**: https://npm-stat.com/charts.html?package=ark-alliance-trading-providers-lib
- **Bundle Size**: https://bundlephobia.com/package/ark-alliance-trading-providers-lib

---

## 🔄 Unpublishing (Emergency Only)

> [!CAUTION]
> Only unpublish within 72 hours or if absolutely necessary (security issue).

```bash
# Unpublish specific version
npm unpublish ark-alliance-trading-providers-lib@1.0.0

# Unpublish entire package (dangerous!)
npm unpublish ark-alliance-trading-providers-lib --force
```

---

**Last Updated**: 2025-12-30  
**Maintainer**: Armand Richelet-Kleinberg (armand@m2h.io)
