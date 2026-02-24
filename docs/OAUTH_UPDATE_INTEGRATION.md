# OAuth Integration for Updates

This document explains how the Trackeep update system integrates with the OAuth service to use user's GitHub tokens for checking updates from the **Dvorinka/Trackeep** repository.

## How It Works

### 1. OAuth Service Integration
The update system requires the OAuth service to be running and automatically extracts GitHub tokens:

1. **User Authentication**: User logs in via the OAuth service (`@Others/oauth-service`)
2. **Token Storage**: OAuth service stores the GitHub access token in the JWT
3. **Update Check**: Update system extracts the token from the JWT for GitHub API calls
4. **Repository**: Checks for updates from `https://github.com/Dvorinka/Trackeep`

### 2. Token Extraction Process

```go
// Function: getGitHubTokenFromContext()
// 1. Extract Authorization header from request
// 2. Parse JWT token using JWT_SECRET
// 3. Extract GitHub access token from claims
// 4. Validate token expiration
// 5. Return token for GitHub API calls
```

### 3. OAuth Service Requirement

The update system **requires** the OAuth service to be running:
- No fallback to environment tokens
- Clear error messages when OAuth service is unavailable
- Automatic token management through OAuth

## Configuration

### Required Environment Variables

```bash
# OAuth Service (REQUIRED)
OAUTH_SERVICE_URL=http://localhost:9090
JWT_SECRET=your-jwt-secret-key

# Update Configuration
APP_VERSION=1.0.0
AUTO_UPDATE_CHECK=false
UPDATE_CHECK_INTERVAL=24h
PRERELEASE_UPDATES=false
```

### OAuth Service Setup

The OAuth service must be running and configured with:
- GitHub OAuth App credentials
- JWT signing secret matching backend
- Proper CORS configuration
- Access to `Dvorinka/Trackeep` repository

## API Flow

### Update Check Request

```http
GET /api/updates/check
Authorization: Bearer <jwt_token_from_oauth>
```

### Error Handling

If OAuth service is not available:
```json
{
  "error": "OAuth service not available",
  "message": "Please ensure OAuth service is running and you are authenticated"
}
```

HTTP Status: `503 Service Unavailable`

## Benefits

### For Users
- **Zero Configuration**: No need to create GitHub tokens
- **Automatic Updates**: Seamless update checking through OAuth
- **Security**: Tokens managed securely by OAuth service

### For Developers
- **Centralized Authentication**: Single OAuth service for all instances
- **Repository Control**: Updates from your specific repository
- **No Token Management**: OAuth handles token lifecycle automatically

## Repository Configuration

The update system is configured to check:
- **Repository**: `Dvorinka/Trackeep`
- **API Endpoint**: `https://api.github.com/repos/Dvorinka/Trackeep/releases/latest`
- **Assets**: Platform-specific release assets

## Security Considerations

1. **OAuth Required**: No fallback authentication methods
2. **Token Validation**: JWT tokens are validated before use
3. **Expiration Check**: Tokens are checked for expiration
4. **Repository Access**: OAuth service needs access to your repository

## Troubleshooting

### Common Issues

1. **"OAuth service not available"**
   - Ensure OAuth service is running on port 9090
   - Check JWT_SECRET matches between services
   - Verify user is authenticated via OAuth

2. **"No GitHub token found"**
   - User needs to authenticate with OAuth service
   - Check Authorization header is present
   - Verify JWT token contains access_token claim

3. **"Failed to check for updates"**
   - Verify repository exists: `Dvorinka/Trackeep`
   - Check OAuth service has repository access
   - Ensure GitHub releases are published

### Debug Logging

The system provides clear logging:
```
Using GitHub token from OAuth service for update check
No GitHub token from OAuth service - update check failed
OAuth service not available - please ensure OAuth service is running
```

## Deployment Requirements

### Production Setup

1. **OAuth Service**: Must be deployed and accessible
2. **Environment Variables**: JWT_SECRET must match between services
3. **GitHub Releases**: Publish releases to `Dvorinka/Trackeep`
4. **Repository Access**: OAuth app needs access to your repository

### Service Dependencies

```
Trackeep Backend → OAuth Service → GitHub API
     ↓              ↓              ↓
  Updates      Authentication   Release Data
```

## Implementation Details

### Repository URL

```go
owner := "Dvorinka"
repo := "Trackeep"
url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", owner, repo)
```

### OAuth Token Extraction

```go
// Extract from JWT claims
claims := token.Claims.(jwt.MapClaims)
githubToken := claims["access_token"].(string)
```

### Error Response

```go
c.JSON(http.StatusServiceUnavailable, gin.H{
    "error": "OAuth service not available",
    "message": "Please ensure OAuth service is running and you are authenticated",
})
```

## Migration from Manual Tokens

### Before (Manual Setup)
```bash
# Required manual token creation
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

### After (OAuth Required)
```bash
# Zero configuration - OAuth handles everything
OAUTH_SERVICE_URL=http://localhost:9090
JWT_SECRET=shared-secret
```

## Release Process

To publish updates:

1. **Create Release**: Publish release on `Dvorinka/Trackeep`
2. **Platform Assets**: Include platform-specific binaries
3. **Release Notes**: Add changelog and checksum information
4. **Automatic Detection**: OAuth-enabled instances will detect updates automatically
