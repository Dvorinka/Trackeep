# 🚀 Trackeep Release Guide

This guide covers how to create releases for Trackeep using different methods.

## Method 1: GitHub CLI (Recommended)

For new features or bug fixes:

```bash
# 1. Commit your changes
git commit -m "feat: add new amazing feature"

# 2. Create version tag and push
git tag v1.2.7
git push origin v1.2.7

# 3. Create GitHub release with CLI
gh release create v1.2.7 \
  --title "Trackeep v1.2.7 - Release Title" \
  --notes "Release notes here..."

# Or use a release notes file
gh release create v1.2.7 \
  --title "Trackeep v1.2.7 - Release Title" \
  --notes-file RELEASE_v1.2.7.md
```

### GitHub CLI Installation

If you don't have GitHub CLI installed:

```bash
# Ubuntu/Debian
sudo apt install gh

# Alternative with Snap
sudo snap install gh

# Authenticate with GitHub
gh auth login
```

## Method 2: Manual Scripts

For traditional workflow:

```bash
# Use version update script
./scripts/update-version.sh 1.2.7

# Commit and push
git add . && git commit -m "chore: bump version to 1.2.7"
git push origin main
```

## Method 3: Release Script

Use the automated release script:

```bash
./scripts/release.sh 1.2.7
```

This script will:
- Update version in .env file
- Build Docker images with version tags
- Push images to GitHub Container Registry
- Create and push Git tag
- Push tag to origin

## Semantic Versioning

Follow industry standard (MAJOR.MINOR.PATCH):

```
1.2.6 → 1.3.0  (MINOR: new features)
1.2.6 → 1.2.7  (PATCH: bug fixes)  
1.2.6 → 2.0.0  (MAJOR: breaking changes)
```

## Release Notes Template

Create comprehensive release notes following this structure:

```markdown
# 🎉 Trackeep v1.2.7 - Release Title

## ✅ What's New

### **Feature Category 1**
- ✅ New feature description
- ✅ Another improvement

### **Bug Fixes**
- ✅ Fixed issue description
- ✅ Another bug fix

## 🎯 How to Update

### **Current Users:**
```bash
# Option 1: Built-in updates
# Update button appears in left navigation

# Option 2: Manual Docker pull
docker compose pull
docker compose up -d
```

## 📦 Docker Images

- `ghcr.io/dvorinka/trackeep/backend:1.2.7`
- `ghcr.io/dvorinka/trackeep/frontend:1.2.7`
- `ghcr.io/dvorinka/trackeep/backend:latest`
- `ghcr.io/dvorinka/trackeep/frontend:latest`
```

## Docker Images

Images are automatically built and pushed to GitHub Container Registry:

- **Registry**: `ghcr.io/dvorinka/trackeep`
- **Latest tags**: `backend:latest`, `frontend:latest` (for auto-updates)
- **Versioned tags**: `backend:1.2.5`, `frontend:1.2.5` (for specific releases)
- **Automatic builds**: Triggered by Git tags and pushes to main branch
