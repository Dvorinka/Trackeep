# Trackeep Main Controller

The **Trackeep Main Controller** is a centralized service that handles authentication, user management, and learning content management for all Trackeep instances. It transforms the original OAuth service into a comprehensive learning management system with a beautiful dashboard interface.

## 🛠️ **Tech Stack**

### **Backend:**
- **Go** - High-performance API server
- **Gin** - HTTP web framework
- **JWT** - Authentication tokens
- **OAuth2** - GitHub integration

### **Frontend:**
- **SolidJS** - Reactive UI framework
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first styling
- **Vite** - Fast build tool

### **Features:**
- **🔐 Centralized Authentication** - GitHub OAuth and email verification for all users
- **📚 Learning Management** - Create and manage free courses with YouTube, ZTM, GitHub, and Fireship resources
- **🖥️ Instance Management** - Register and monitor Trackeep instances
- **📊 Visual Dashboard** - Beautiful Trackeep-inspired UI for management
- **🔗 Secure Connections** - Automatic secure API key handling between instances

### **For Users:**
- **Free Learning** - All courses are completely free (price always $0.00)
- **No Instructors** - Self-paced learning with curated resources
- **Progress Tracking** - Monitor your learning progress across courses
- **Single Sign-On** - One GitHub account for all Trackeep instances

### **For Administrators:**
- **Course Creation** - Easy-to-use interface for creating learning paths
- **Resource Management** - Support for YouTube, Zero to Mastery, GitHub, Fireship links
- **Instance Monitoring** - Track all connected Trackeep instances
- **User Analytics** - Dashboard with comprehensive statistics

## 🚀 **Quick Start**

### **1. Setup the Main Controller**

```bash
# Navigate to the main controller
cd oauth-service

# Install frontend dependencies
npm install

# Build the frontend
npm run build

# Run the service (production mode)
go run main.go
```

### **2. Development Mode**

For development with hot reload:

```bash
# Use the development script (starts both backend and frontend)
./dev.sh

# Or start manually:
# Terminal 1: Backend
go run main.go

# Terminal 2: Frontend dev server
npm run dev
```

### **3. Access the Dashboard**

Open your browser to:
- **Dashboard**: http://localhost:9090/dashboard (production) or http://localhost:5174/dashboard (development)
- **Course Management**: http://localhost:9090/dashboard/courses
- **Instance Management**: http://localhost:9090/dashboard/instances
- **API Documentation**: http://localhost:9090/api/v1

### **4. GitHub OAuth Setup (Optional)**

For full authentication, set up GitHub OAuth:

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth app with:
   - **Application name**: Trackeep Main Controller
   - **Homepage URL**: `http://localhost:9090`
   - **Authorization callback URL**: `http://localhost:9090/auth/github/callback`
3. Add credentials to `.env` file

## 📡 **API Endpoints**

### **Authentication:**
- `GET /auth/github` - Initiate GitHub OAuth flow
- `GET /auth/github/callback` - Handle GitHub callback
- `POST /api/v1/email/send` - Send verification code
- `POST /api/v1/email/verify` - Verify email code

### **Course Management:**
- `GET /api/v1/courses` - List all courses
- `POST /api/v1/courses` - Create new course
- `GET /api/v1/courses/:id` - Get course details
- `PUT /api/v1/courses/:id` - Update course
- `DELETE /api/v1/courses/:id` - Delete course
- `GET /api/v1/courses/:id/resources` - Get course resources
- `POST /api/v1/courses/:id/resources` - Add course resource

### **User Progress:**
- `GET /api/v1/progress/:user_id` - Get user's all progress
- `GET /api/v1/progress/:user_id/:course_id` - Get course progress
- `POST /api/v1/progress/:user_id/:course_id` - Update progress

### **Instance Management:**
- `GET /api/v1/instances` - List all instances
- `POST /api/v1/instances` - Register new instance
- `GET /api/v1/instances/:id` - Get instance details
- `PUT /api/v1/instances/:id` - Update instance
- `DELETE /api/v1/instances/:id` - Delete instance

### **Dashboard:**
- `GET /api/v1/dashboard/stats` - Get dashboard statistics
- `GET /api/v1/dashboard/courses` - Get courses for dashboard
- `GET /api/v1/dashboard/users` - Get users for dashboard (admin only)

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Trackeep App   │    │ Main Controller  │    │   GitHub API    │
│                 │    │                  │    │                 │
│ OAuth Login ────┼───>│ /auth/github     ────>│ OAuth Flow      │
│                 │    │                  │    │                 │
│ Course API ─────┼───>│ /api/v1/courses  │    │                 │
│                 │    │                  │    │                 │
│ Progress Sync ──┼───>│ /api/v1/progress │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📚 **Course Structure**

### **Supported Resource Types:**
- **🎥 YouTube** - Video tutorials and playlists
- **🎓 Zero to Mastery** - ZTM courses and content
- **🐙 GitHub** - Repositories, projects, and code examples
- **🔥 Fireship** - Fast-paced tutorials and courses
- **🔗 Links** - Any other web resources

### **Course Example:**
```json
{
  "title": "Complete Web Development Bootcamp",
  "description": "Learn modern web development from scratch",
  "category": "web-development",
  "difficulty": "beginner",
  "duration": 40,
  "price": 0.0,
  "tags": ["javascript", "react", "nodejs"],
  "resources": [
    {
      "title": "Introduction to Web Development",
      "type": "youtube",
      "url": "https://www.youtube.com/watch?v=RW-sB6GeA_Q",
      "duration": 45,
      "is_required": true
    }
  ]
}
```

## 🔒 **Security Features**

- **🔐 JWT Authentication** - Secure token-based authentication
- **🛡️ API Key Management** - Automatic secure key generation for instances
- **🔗 CORS Support** - Configurable allowed origins
- **✅ CSRF Protection** - State parameter validation
- **📊 Rate Limiting** - GitHub API rate limit awareness

## 🎨 **Dashboard Features**

### **Main Dashboard:**
- 📊 Real-time statistics
- 📚 Recent courses overview
- 🖥️ Active instances monitoring
- 📈 User progress analytics

### **Course Management:**
- ➕ Easy course creation wizard
- ✏️ Visual course editing
- 🏷️ Tag-based organization
- 📱 Responsive design

### **Instance Management:**
- 🔗 Secure instance registration
- 📊 Connection status monitoring
- 🔑 API key management
- 📈 Instance analytics

## 🔧 **Configuration**

### **Environment Variables:**

```bash
# Service Configuration
PORT=9090
JWT_SECRET=your-super-secret-jwt-key

# GitHub OAuth (Optional)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URL=http://localhost:9090/auth/github/callback

# Email Verification (Optional)
SMTP_HOST=smtp.purelymail.com
SMTP_PORT=587
SMTP_USERNAME=your_purelymail_username
SMTP_PASSWORD=your_purelymail_password

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080
```

## 🚀 **Production Deployment**

### **Docker Deployment:**

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download && go build -o trackeep-controller

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/trackeep-controller .
COPY .env .
COPY templates/ ./templates/
EXPOSE 9090
CMD ["./trackeep-controller"]
```

### **Docker Compose:**

```yaml
version: '3.8'
services:
  trackeep-controller:
    build: ./oauth-service
    ports:
      - "9090:9090"
    environment:
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
      - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
```

## 📝 **Benefits**

### **For Learners:**
- ✅ **Completely Free** - All courses are $0.00
- ✅ **Self-Paced** - Learn at your own speed
- ✅ **Quality Content** - Curated YouTube, ZTM, GitHub, Fireship resources
- ✅ **Progress Tracking** - Monitor your learning journey
- ✅ **Single Sign-On** - One account for all Trackeep instances

### **For Administrators:**
- ✅ **Easy Management** - Beautiful dashboard interface
- ✅ **Secure Connections** - Automatic API key handling
- ✅ **Scalable** - Serve unlimited instances
- ✅ **Analytics** - Comprehensive usage statistics
- ✅ **Zero Setup** - Works out of the box with sample data

### **For Developers:**
- ✅ **RESTful API** - Clean, well-documented endpoints
- ✅ **Flexible Resources** - Support for multiple content types
- ✅ **Secure by Default** - Built-in authentication and authorization
- ✅ **Easy Integration** - Simple API key-based connections

## 🎯 **Use Cases**

- **🎓 Educational Platforms** - Free learning management system
- **👥 Developer Communities** - Share learning resources
- **🏢 Corporate Training** - Internal skill development
- **📚 Course Aggregators** - Curate learning content
- **🚀 Startup Education** - Onboarding and training programs

## 🔄 **Multi-Instance Support**

The Main Controller can serve multiple Trackeep instances:

```javascript
// Instance 1
fetch('http://localhost:9090/api/v1/courses', {
  headers: { 'Authorization': 'Bearer instance1_api_key' }
});

// Instance 2  
fetch('http://localhost:9090/api/v1/courses', {
  headers: { 'Authorization': 'Bearer instance2_api_key' }
});
```

Each instance gets its own API key and can securely access the centralized course catalog and user management.

---

**Trackeep Main Controller** - Complete learning management system with beautiful dashboard and secure multi-instance support. 🚀
