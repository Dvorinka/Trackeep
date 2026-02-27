# Trackeep Version Management & Update Workflow

## 📍 Where Version Comes From

### **Current Version Detection:**
1. **Backend**: `APP_VERSION` environment variable (defaults to "1.0.0")
2. **Frontend**: `VITE_APP_VERSION` environment variable (passed during build)

### **Version Priority Order:**
1. `__APP_VERSION__` build constant (highest priority)
2. `VITE_APP_VERSION` environment variable (frontend)
3. `APP_VERSION` environment variable (backend)
4. Falls back to "1.0.0" (default)

---

## 🏷️ How to Set Version Properly

### **Option 1: Environment Variables (Recommended)**

#### **Development:**
```bash
# Set version in .env file
echo "APP_VERSION=1.2.0" >> .env

# Start with version
docker compose up
```

#### **Production:**
```bash
# Set version environment variable
export APP_VERSION=1.2.0
docker compose -f docker-compose.prod.yml up
```

### **Option 2: Build-time Constants**

#### **Frontend (vite.config.ts):**
```typescript
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  },
  // ... rest of config
})
```

#### **Backend (build):**
```bash
# Build with version
APP_VERSION=1.2.0 go build -ldflags "-X main.version=${APP_VERSION}"
```

---

## 🚀 How to Push Updates with Proper Labels

### **Method 1: GitHub Actions (Recommended)**

#### **Create `.github/workflows/release.yml`:**
```yaml
name: Release and Deploy

on:
  push:
    tags:
      - 'v*'  # Trigger on version tags like v1.2.0

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        
      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Extract version from tag
        run: |
          VERSION=${GITHUB_REF#refs/tags/v*}
          VERSION=${VERSION#refs/tags/v}
          echo "VERSION=$VERSION" >> $GITHUB_ENV
          echo "Building version: $VERSION"
          
      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          file: ./backend/Dockerfile
          push: true
          tags: |
            ghcr.io/dvorinka/trackeep/backend:latest
            ghcr.io/dvorinka/trackeep/backend:${{ env.VERSION }}
          labels: |
            version=${{ env.VERSION }}
            build-date=${{ github.event.head_commit.timestamp }}
            commit=${{ github.sha }}
            
      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./frontend/Dockerfile
          push: true
          tags: |
            ghcr.io/dvorinka/trackeep/frontend:latest
            ghcr.io/dvorinka/trackeep/frontend:${{ env.VERSION }}
          labels: |
            version=${{ env.VERSION }}
            build-date=${{ github.event.head_commit.timestamp }}
            commit=${{ github.sha }}
```

### **Method 2: Manual Docker Push**

#### **Tag and Push:**
```bash
# Set version
export VERSION=1.2.0

# Build and tag with version
docker build -t ghcr.io/dvorinka/trackeep/backend:${VERSION} ./backend
docker build -t ghcr.io/dvorinka/trackeep/backend:latest ./backend

docker build -t ghcr.io/dvorinka/trackeep/frontend:${VERSION} .
docker build -t ghcr.io/dvorinka/trackeep/frontend:latest .

# Push both tags
docker push ghcr.io/dvorinka/trackeep/backend:${VERSION}
docker push ghcr.io/dvorinka/trackeep/backend:latest

docker push ghcr.io/dvorinka/trackeep/frontend:${VERSION}
docker push ghcr.io/dvorinka/trackeep/frontend:latest

# Create Git tag
git tag v${VERSION}
git push origin v${VERSION}
```

---

## 📋 How People Do It (Industry Standards)

### **Semantic Versioning:**
```
MAJOR.MINOR.PATCH
1.2.0
│ │ └─ PATCH: Bug fixes, small features
│ └─ MINOR: New features, breaking changes
└─ MAJOR: Major changes, breaking API
```

### **Version Labels:**
```dockerfile
# In Dockerfile
LABEL version="1.2.0"
LABEL build-date="2024-02-27"
LABEL commit="abc123def"
```

### **Environment Variables:**
```bash
# Production
APP_VERSION=1.2.0
VITE_APP_VERSION=1.2.0

# Development
APP_VERSION=1.3.0-dev
VITE_APP_VERSION=1.3.0-dev
```

### **Git Tags:**
```bash
# Create version tag
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0

# Lightweight tags (for CI/CD)
git tag v1.2.0 ${COMMIT_SHA}
git push origin v1.2.0
```

---

## 🔄 Update Detection Logic

### **How System Detects Updates:**

#### **Current Setup:**
```go
// Backend gets current version
currentVersion := os.Getenv("APP_VERSION")
if currentVersion == "" {
    currentVersion = "1.0.0"
}

// Frontend gets version from build
return import.meta.env.VITE_APP_VERSION || '1.0.0'
```

#### **Update Check:**
```go
// Compares current vs latest
if isNewerVersion("latest", currentVersion) {
    // Update available!
    return updateInfo, true, nil
}
```

---

## 🎯 Recommended Workflow

### **Development:**
```bash
# 1. Set version in .env
echo "APP_VERSION=1.2.1-dev" >> .env

# 2. Start development
docker compose up

# 3. Test updates
curl http://localhost:8080/api/updates/check
```

### **Production Release:**
```bash
# 1. Update version
export APP_VERSION=1.2.1

# 2. Build and push
./scripts/release.sh 1.2.1

# 3. Deploy
docker compose -f docker-compose.prod.yml up -d
```

### **Version Update Process:**
1. **Code changes** → Commit to main branch
2. **Version bump** → Update APP_VERSION in .env
3. **Tag release** → `git tag v1.2.1 && git push origin v1.2.1`
4. **Auto-build** → GitHub Actions builds Docker images
5. **Push tags** → `latest` + versioned tags to registry
6. **Deploy** → Users get updates automatically

---

## ✅ Best Practices

### **Version Management:**
- ✅ Use semantic versioning (MAJOR.MINOR.PATCH)
- ✅ Always update both frontend and backend versions
- ✅ Use environment variables for flexibility
- ✅ Tag releases in Git

### **Docker Tags:**
- ✅ Always push `latest` tag for updates
- ✅ Also push versioned tags for rollback
- ✅ Add labels for metadata
- ✅ Use consistent naming convention

### **Release Process:**
- ✅ Automate with GitHub Actions
- ✅ Test before tagging
- ✅ Document changes in release notes
- ✅ Use semantic versioning

---

## 🧪 Testing Your Setup

### **Test Version Detection:**
```bash
# Check current version
curl -s http://localhost:8080/api/updates/check | jq '.currentVersion'

# Should return your APP_VERSION value
```

### **Test Update Detection:**
```bash
# Simulate update available
# Backend will show "latest" vs your current version
```

### **Verify Docker Images:**
```bash
# Check if images have version labels
docker inspect ghcr.io/dvorinka/trackeep/backend:latest | jq '.[0].Config.Labels.version'
docker inspect ghcr.io/dvorinka/trackeep/frontend:latest | jq '.[0].Config.Labels.version'
```

This system ensures proper versioning and update detection for your Trackeep application!
