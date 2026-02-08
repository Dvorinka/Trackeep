# Centralized OAuth Service

This is a **standalone OAuth service** that handles GitHub authentication and email verification for all users. Users never need to set up their own OAuth applications - everything is centralized.

## 🎯 **How It Works**

### **For Users:**
1. **GitHub OAuth**: Click "Connect GitHub" → GitHub authorization → Automatic login with GitHub profile
2. **Email Verification**: Enter email → Receive verification code → Verify email for 2FA

### **For Developers:**
1. **Zero setup** - No OAuth app creation needed
2. **Simple integration** - Just redirect to our service
3. **Secure authentication** - We handle all the complexity
4. **User management** - Centralized user database

## 🚀 **Quick Start**

### **1. Setup the OAuth Service**

```bash
# Navigate to the OAuth service
cd oauth-service

# Run the setup script
./setup.sh

# Edit the .env file with your GitHub OAuth credentials
nano .env

# Start the service
go run main.go
```

### **2. GitHub OAuth App Setup (One Time)**

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth app with:
   - **Application name**: Trackeep OAuth Service
   - **Homepage URL**: `http://localhost:9090`
   - **Authorization callback URL**: `http://localhost:9090/auth/github/callback`
3. Copy the Client ID and Client Secret to `.env`

### **3. Email Verification Setup (One Time)**

1. Configure smtp.purelymail.com for sending verification emails:
   - **SMTP Host**: `smtp.purelymail.com`
   - **SMTP Port**: `587`
   - **Username**: Your purelymail SMTP username
   - **Password**: Your purelymail SMTP password
2. Add SMTP credentials to `.env` file
3. The service will send 6-digit verification codes for 2FA

### **4. Integration in Your App**

```javascript
// Redirect to GitHub OAuth
const connectGitHub = () => {
  window.location.href = 'http://localhost:9090/auth/github?redirect_uri=' + 
    encodeURIComponent(window.location.origin);
};

// Send email verification code
const sendEmailVerification = (email) => {
  fetch('http://localhost:9090/api/v1/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  }).then(response => response.json())
    .then(data => {
      if (data.demo_code) {
        console.log('Demo verification code:', data.demo_code);
      }
    });
};

// Verify email code
const verifyEmailCode = (email, code) => {
  fetch('http://localhost:9090/api/v1/email/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  }).then(response => response.json())
    .then(data => {
      if (data.verified) {
        console.log('Email verified successfully!');
      }
    });
};

// Handle callback (works for both GitHub and Email)
const handleCallback = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const username = urlParams.get('user');
  
  if (token) {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    // Redirect to dashboard
    window.location.href = '/app';
  }
};
```

## 📡 **API Endpoints**

### **OAuth Endpoints:**
- `GET /auth/github` - Initiate GitHub OAuth flow
- `GET /auth/github/callback` - Handle GitHub callback

### **Email Verification Endpoints:**
- `POST /api/v1/email/send` - Send verification code to email
- `POST /api/v1/email/verify` - Verify email code for 2FA

### **API Endpoints:**
- `GET /api/v1/user/me` - Get current user info
- `GET /api/v1/user/:username/repos` - Get user repositories
- `POST /api/v1/webhook/github` - GitHub webhook handler
- `POST /api/v1/email/verify` - Verify email code

### **Utility:**
- `GET /health` - Service health check

## 🔧 **Configuration**

### **Environment Variables:**

```bash
# GitHub OAuth (Admin Only)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URL=http://localhost:9090/auth/github/callback

# Email Verification Configuration (Admin Only)
SMTP_HOST=smtp.purelymail.com
SMTP_PORT=587
SMTP_USERNAME=your_purelymail_username
SMTP_PASSWORD=your_purelymail_password

# Service Configuration
PORT=9090
JWT_SECRET=your-super-secret-jwt-key
DEFAULT_CLIENT_URL=http://localhost:5173

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080
```

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User App      │    │  OAuth Service   │    │     GitHub      │
│                 │    │                  │    │                 │
│ Connect GitHub ─┼───>│ /auth/github     ────>│ OAuth Flow      │
│                 │    │                  │    │                 │
│ Handle Callback │<───>│ /auth/callback   │<───>│ Return Token   │
│                 │    │                  │    │                 │
│ Store Token     │    │ Generate JWT     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔒 **Security Features**

- **CSRF Protection**: State parameter validation
- **Secure JWT**: Signed tokens with expiration
- **CORS Support**: Configurable allowed origins
- **Webhook Support**: Optional webhook secret validation
- **Rate Limiting**: GitHub API rate limit awareness

## 📊 **User Management**

The service maintains a centralized user database:

```go
type User struct {
    ID        int       `json:"id"`
    GitHubID  int       `json:"github_id"`
    Username  string    `json:"username"`
    Email     string    `json:"email"`
    Name      string    `json:"name"`
    AvatarURL string    `json:"avatar_url"`
    CreatedAt time.Time `json:"created_at"`
    LastLogin time.Time `json:"last_login"`
}
```

## 🔄 **Multi-Application Support**

The same OAuth service can serve multiple applications:

```javascript
// App 1
window.location.href = 'http://localhost:9090/auth/github?redirect_uri=http://app1.com';

// App 2  
window.location.href = 'http://localhost:9090/auth/github?redirect_uri=http://app2.com';

// App 3
window.location.href = 'http://localhost:9090/auth/github?redirect_uri=http://app3.com';
```

## 🚀 **Production Deployment**

### **Docker Deployment:**

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download && go build -o oauth-service

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/oauth-service .
COPY .env .
EXPOSE 9090
CMD ["./oauth-service"]
```

### **Docker Compose:**

```yaml
version: '3.8'
services:
  oauth-service:
    build: ./oauth-service
    ports:
      - "9090:9090"
    environment:
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
      - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
```

## 🛠️ **Development**

```bash
# Install dependencies
go mod tidy

# Run in development
go run main.go

# Build for production
go build -o oauth-service main.go

# Run tests
go test ./...
```

## 📝 **Benefits**

### **For Users:**
- ✅ **Zero configuration** - No OAuth app setup
- ✅ **Single sign-on** - One GitHub account for all apps
- ✅ **Secure** - Enterprise-grade security
- ✅ **Fast** - Instant authentication

### **For Developers:**
- ✅ **Easy integration** - Just redirect to our service
- ✅ **No OAuth management** - We handle everything
- ✅ **Centralized users** - Shared user database
- ✅ **Scalable** - Serve unlimited applications

### **For Administrators:**
- ✅ **Single control point** - Manage all OAuth in one place
- ✅ **Security oversight** - Monitor all authentication
- ✅ **Easy updates** - Update OAuth settings once
- ✅ **Cost effective** - One OAuth app for all services

## 🎯 **Use Cases**

- **SaaS platforms** - Multiple products, one authentication
- **Development teams** - Internal tools with GitHub login
- **Open source projects** - Contributor authentication
- **Enterprise** - Internal service authentication
- **API services** - Secure API access with GitHub OAuth

This service completely abstracts away OAuth complexity while providing enterprise-grade authentication for all your applications!
