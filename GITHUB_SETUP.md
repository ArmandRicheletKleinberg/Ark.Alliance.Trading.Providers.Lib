# GitHub Repository Setup Guide

## 📋 Repository Details

- **Repository Name**: `Ark.Alliance.Trading.Providers.Lib`
- **Owner**: Your GitHub username
- **Visibility**: Private
- **Description**: Production-ready multi-provider TypeScript SDK for cryptocurrency trading APIs (Binance, Deribit, and more)
- **Topics**: `typescript`, `trading`, `crypto`, `binance`, `deribit`, `futures`, `websocket`, `api-client`

---

## 🚀 Quick Setup (GitHub CLI)

If you have GitHub CLI installed, run:

```bash
# Navigate to project directory
cd c:\Users\Criprtoswiss\source\repos\Ark.Alliance.Trading.Providers.Lib

# Create private repository
gh repo create Ark.Alliance.Trading.Providers.Lib --private --description "Production-ready multi-provider TypeScript SDK for cryptocurrency trading" --source=. --remote=origin --push

# Create develop branch
git checkout -b develop
git push -u origin develop

# Switch back to main
git checkout main
```

---

## 🌐 Manual Setup (GitHub Web Interface)

### Step 1: Create Repository

1. Go to https://github.com/new
2. Fill in the details:
   - **Repository name**: `Ark.Alliance.Trading.Providers.Lib`
   - **Description**: `Production-ready multi-provider TypeScript SDK for cryptocurrency trading`
   - **Visibility**: ✅ Private
   - **Initialize**: ⚠️ **DO NOT** initialize with README, .gitignore, or license (we already have these)
3. Click **Create repository**

### Step 2: Connect Local Repository

After creating the repository, GitHub will show you commands. Use these:

```bash
# Navigate to your project
cd c:\Users\Criprtoswiss\source\repos\Ark.Alliance.Trading.Providers.Lib

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/Ark.Alliance.Trading.Providers.Lib.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

### Step 3: Create Develop Branch

```bash
# Create and switch to develop branch
git checkout -b develop

# Push develop branch
git push -u origin develop

# Switch back to main
git checkout main
```

---

## 🔒 Configure Branch Protection

### Protect Main Branch

1. Go to repository **Settings** → **Branches**
2. Click **Add branch protection rule**
3. Configure as follows:

#### Branch name pattern
```
main
```

#### Protection rules (check these):

- ✅ **Require a pull request before merging**
  - ✅ Require approvals: 1
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Add status checks:
    - `build (ubuntu-latest, 20.x)`
    - `build (windows-latest, 20.x)`
    - `build (macos-latest, 20.x)`
    - `lint`

- ✅ **Require conversation resolution before merging**

- ✅ **Require signed commits**

- ✅ **Require linear history**

- ✅ **Include administrators** (enforce for everyone)

- ✅ **Restrict who can push to matching branches**
  - Add yourself and trusted maintainers

- ✅ **Allow force pushes**: ❌ Disabled

- ✅ **Allow deletions**: ❌ Disabled

4. Click **Create** or **Save changes**

---

## 🔐 Configure Repository Secrets

### Required Secrets for CI/CD

Go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add the following secrets:

| Secret Name | Description | Example Value |
|:------------|:------------|:--------------|
| `NPM_TOKEN` | NPM publish token | `npm_xxxxxxxxxxxx` |
| `BINANCE_TESTNET_API_KEY` | Binance testnet API key | From https://testnet.binancefuture.com |
| `BINANCE_TESTNET_SECRET` | Binance testnet secret | From https://testnet.binancefuture.com |
| `DERIBIT_CLIENT_ID` | Deribit testnet client ID | From https://test.deribit.com |
| `DERIBIT_CLIENT_SECRET` | Deribit testnet secret | From https://test.deribit.com |

### How to Create NPM Token

1. Login to https://www.npmjs.com
2. Go to **Access Tokens** → **Generate New Token**
3. Select **Automation** token type
4. Copy the token
5. Add to GitHub secrets as `NPM_TOKEN`

---

## 📛 Update Badge URLs

After creating the repository, update the badges in `README.md`:

**Your GitHub username**: `YOUR_USERNAME`

Replace in `README.md` (line 5-11):

```markdown
[![Build Status](https://github.com/YOUR_USERNAME/Ark.Alliance.Trading.Providers.Lib/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/Ark.Alliance.Trading.Providers.Lib/actions)
[![npm version](https://badge.fury.io/js/ark-alliance-trading-providers-lib.svg)](https://www.npmjs.com/package/ark-alliance-trading-providers-lib)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](./src/Ark.Alliance.Trading.Providers.Lib.Test)
[![Tests](https://img.shields.io/badge/tests-70%2B%20scenarios-brightgreen)](./src/Ark.Alliance.Trading.Providers.Lib.Test)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)](https://nodejs.org/)
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Repository created and is private
- [ ] Local repository connected to remote
- [ ] `main` branch pushed
- [ ] `develop` branch created and pushed
- [ ] Branch protection rules for `main` enabled
- [ ] All required secrets added
- [ ] Badges updated with correct username
- [ ] CI/CD workflows trigger on push
- [ ] README renders correctly on GitHub

---

## 🔄 Workflow Triggers

Your CI/CD pipelines will automatically run when:

- **ci.yml**: Push to `main` or `develop`, Pull requests
- **publish.yml**: Version tags (`v*.*.*`)
- **test.yml**: Daily at 2 AM UTC, Manual trigger

---

## 📝 Git Workflow

### Recommended Branch Strategy

```
main (protected)
  ↑
  └── Pull Requests only
       ↑
develop (active development)
  ↑
  └── feature/*, fix/*, docs/*
```

### Creating a Feature

```bash
# Start from develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/okx-integration

# Make changes, commit
git add .
git commit -m "feat(okx): add OKX provider integration"

# Push feature branch
git push -u origin feature/okx-integration

# Create Pull Request on GitHub: feature/okx-integration → develop
# After approval and CI passes: Merge to develop

# For release: Create PR from develop → main
```

---

## 🚀 First Release

After setup, create your first release:

```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create version tag
git tag -a v1.0.0 -m "Initial release - Binance & Deribit providers"

# Push tag (triggers publish workflow)
git push origin v1.0.0
```

This will automatically:
1. Run tests
2. Build library
3. Publish to NPM
4. Create GitHub release

---

## 📞 Need Help?

If you encounter issues:

1. **Check CI/CD logs**: Repository → Actions
2. **Verify secrets**: Settings → Secrets and variables
3. **Review branch protection**: Settings → Branches
4. **Test locally**: Run `npm run build` and `npm run test:execute:market`

---

## 🔗 Quick Links (Update after creation)

- **Repository**: https://github.com/YOUR_USERNAME/Ark.Alliance.Trading.Providers.Lib
- **Actions**: https://github.com/YOUR_USERNAME/Ark.Alliance.Trading.Providers.Lib/actions
- **Issues**: https://github.com/YOUR_USERNAME/Ark.Alliance.Trading.Providers.Lib/issues
- **Pull Requests**: https://github.com/YOUR_USERNAME/Ark.Alliance.Trading.Providers.Lib/pulls
- **Settings**: https://github.com/YOUR_USERNAME/Ark.Alliance.Trading.Providers.Lib/settings

---

*Setup guide created: 2025-12-30*
