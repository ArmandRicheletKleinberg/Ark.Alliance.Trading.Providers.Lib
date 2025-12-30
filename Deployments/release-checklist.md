# Release Checklist

Use this checklist before creating a new release of the library.

## 📋 Pre-Release Checklist

### Code Quality

- [ ] All tests passing locally
  ```bash
  cd src/Ark.Alliance.Trading.Providers.Lib.Test
  npm run test:execute
  ```

- [ ] TypeScript compiles without errors
  ```bash
  cd src/Ark.Alliance.Trading.Providers.Lib
  npm run build
  ```

- [ ] No console.log statements in production code
- [ ] No hardcoded credentials or secrets
- [ ] All TODO comments addressed or documented

### Documentation

- [ ] README.md updated with new features
- [ ] CHANGELOG.md updated with version changes
- [ ] API documentation reflects current implementation
- [ ] Module-specific READMEs updated
- [ ] Code comments are clear and accurate

### Version Management

- [ ] Version bumped in `package.json`
- [ ] Version follows semver (MAJOR.MINOR.PATCH)
- [ ] Git tag created for version
- [ ] Version changelog entry added

### Dependencies

- [ ] All dependencies up to date
  ```bash
  npm outdated
  ```

- [ ] No known security vulnerabilities
  ```bash
  npm audit
  ```

- [ ] Peer dependencies documented

### Testing

- [ ] Unit tests pass (100%)
- [ ] Integration tests pass
- [ ] Market data tests pass (no credentials)
- [ ] Authenticated tests pass (with testnet credentials)
- [ ] Manual smoke testing completed

### Build

- [ ] `dist/` folder generated correctly
- [ ] TypeScript declarations (.d.ts) present
- [ ] Source maps generated (if applicable)
- [ ] Package size is reasonable (<1MB)
- [ ] All exports are accessible

### Git

- [ ] All changes committed
- [ ] Working directory clean
- [ ] Pushed to remote
- [ ] No uncommitted files
- [ ] Branch up to date with main

### NPM

- [ ] Logged into NPM account
- [ ] NPM token configured (for CI/CD)
- [ ] Package name available
- [ ] Version not already published

---

## 🚀 Release Process

### 1. Prepare Release

```bash
# Update version
npm version <patch|minor|major>

# Update CHANGELOG.md
# Document all changes, fixes, and new features

# Commit version bump
git add package.json CHANGELOG.md
git commit -m "chore: release v1.x.x"
```

### 2. Create Tag

```bash
# Create annotated tag
git tag -a v1.x.x -m "Release version 1.x.x"

# Push commits and tags
git push origin main
git push origin v1.x.x
```

### 3. GitHub Actions (Automated)

The CI/CD pipeline will automatically:
- ✅ Run tests
- ✅ Build library
- ✅ Publish to NPM
- ✅ Create GitHub release

### 4. Verify Publication

```bash
# Check NPM
npm info ark-alliance-trading-providers-lib@1.x.x

# Test installation
npm install ark-alliance-trading-providers-lib@1.x.x
```

### 5. Announce Release

- [ ] Update GitHub release notes
- [ ] Announce in project channels
- [ ] Update documentation site (if applicable)
- [ ] Share on social media (optional)

---

## 📊 Post-Release

### Monitoring

- [ ] Monitor NPM download stats
- [ ] Watch for issue reports
- [ ] Check GitHub Discussions
- [ ] Review CI/CD logs

### Follow-up

- [ ] Address any critical bugs immediately
- [ ] Plan next release cycle
- [ ] Update project roadmap
- [ ] Thank contributors

---

## 🐛 Emergency Rollback

If critical issues are discovered:

### Option 1: Hotfix Release

```bash
# Fix the issue
# Create hotfix branch
git checkout -b hotfix/v1.x.y

# Make fixes
# Test thoroughly

# Release hotfix
npm version patch
git push && git push --tags
```

### Option 2: Deprecate Version

```bash
# Deprecate problematic version
npm deprecate ark-alliance-trading-providers-lib@1.x.x "Critical bug found, use 1.x.y instead"
```

---

**Review this checklist before every release!**

*Last Updated: 2025-12-30*
