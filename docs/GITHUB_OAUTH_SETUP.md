# GitHub OAuth Integration Setup

This document explains how to set up GitHub OAuth integration for Trackeep.

## 1. GitHub OAuth App Setup

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: Trackeep
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:8080/api/v1/auth/github/callback`
4. Click "Register application"
5. Note down the **Client ID** and generate a **Client Secret**

## 2. Environment Variables

Add these to your `.env` file:

```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_REDIRECT_URL=http://localhost:8080/api/v1/auth/github/callback

# Frontend URL for callback redirect
FRONTEND_URL=http://localhost:5173
```

## 3. Database Migration

The User model has been updated with GitHub OAuth fields:

```go
// GitHub OAuth fields
GitHubID  int    `json:"github_id" gorm:"uniqueIndex"`
AvatarURL string `json:"avatar_url"`
Provider  string `json:"provider" gorm:"default:email"` // email, github
```

Run the application to auto-migrate the database schema.

## 4. How It Works

### OAuth Flow:

1. **User clicks "Connect GitHub"** → Redirects to `/api/v1/auth/github`
2. **GitHub Authorization** → User authorizes the application on GitHub
3. **GitHub Callback** → GitHub redirects to `/api/v1/auth/github/callback` with authorization code
4. **Token Exchange** → Backend exchanges code for access token
5. **User Data Fetch** → Backend fetches user profile and repositories from GitHub API
6. **User Creation/Update** → Creates new user or links GitHub account to existing user
7. **JWT Generation** → Generates JWT token for the user
8. **Frontend Redirect** → Redirects to `/auth/callback?token=jwt_token`
9. **Token Storage** → Frontend stores token and redirects to dashboard

### API Endpoints:

- `GET /api/v1/auth/github` - Initiates GitHub OAuth flow
- `GET /api/v1/auth/github/callback` - Handles GitHub OAuth callback
- `GET /api/v1/github/repos` - Fetches user's GitHub repositories (protected)

## 5. Features

### Authentication:
- Users can sign up/login with GitHub
- Existing accounts can be linked to GitHub
- Secure JWT token generation

### GitHub Integration:
- Fetch user's public repositories
- Display repository statistics (stars, forks, watchers)
- Language distribution analysis
- Recent activity tracking
- Real-time data synchronization

### Security:
- CSRF protection with state parameter
- Secure token storage
- OAuth 2.0 standard implementation
- Rate limiting awareness

## 6. Testing

1. Start the backend server: `go run main.go`
2. Start the frontend: `npm run dev`
3. Navigate to `http://localhost:5173/app/github`
4. Click "Connect GitHub"
5. Authorize the application on GitHub
6. You should be redirected back to the app with GitHub data

## 7. Production Considerations

For production deployment:

1. Update the GitHub OAuth app with production URLs
2. Use HTTPS for all callbacks
3. Store secrets securely (environment variables, secret management)
4. Implement proper error handling and logging
5. Consider GitHub API rate limits
6. Add webhook support for real-time updates

## 8. Troubleshooting

### Common Issues:

1. **"Redirect URI mismatch"** - Check that the callback URL in GitHub matches exactly
2. **"Invalid state"** - Clear browser cookies and try again
3. **"Failed to get user info"** - Check GitHub API permissions and token validity
4. **Database errors** - Ensure database is running and migrations are applied

### Debug Mode:

Enable debug logging by setting:
```bash
GIN_MODE=debug
```

This will provide detailed logs for troubleshooting OAuth flow issues.
