# Trackeep Integration Guide

## Architecture Overview

This OAuth service is designed **only for authentication**. Trackeep instances (user-hosted) handle all GitHub data tracking directly.

## How It Works

### 1. User Authentication Flow
1. User clicks "Login with GitHub" in Trackeep
2. Trackeep redirects to: `https://oauth.tdvorak.dev/auth/github?redirect_uri=https://user-trackeep-instance.com`
3. OAuth service handles GitHub authentication
4. OAuth service redirects back: `https://user-trackeep-instance.com/auth/callback?token=JWT&user=username`

### 2. What Trackeep Receives
The JWT token contains:
```json
{
  "user_id": 123,
  "github_id": 456789,
  "username": "johndoe",
  "email": "john@example.com",
  "access_token": "gho_16C7e42F292c6912E7710c838347Ae178B4a",
  "token_type": "bearer",
  "expires_at": 1738123456,
  "exp": 1738123456,
  "iat": 1737518656
}
```

### 3. Trackeep GitHub API Access
Trackeep instances can now make GitHub API calls using the user's `access_token`:

```javascript
// Example: Get user repositories
const response = await fetch('https://api.github.com/user/repos', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/vnd.github.v3+json'
  }
});

// Example: Get commits for a repo
const commits = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/vnd.github.v3+json'
  }
});
```

## Trackeep Implementation Guide

### 1. OAuth Login Button
```html
<a href="https://oauth.tdvorak.dev/auth/github?redirect_uri=https://your-trackeep-instance.com">
  Login with GitHub
</a>
```

### 2. Handle OAuth Callback
```javascript
// In your /auth/callback route
async function handleOAuthCallback(req, res) {
  const { token, user: username } = req.query;
  
  // Decode and verify JWT
  const jwtPayload = decodeJWT(token);
  
  // Store user session
  req.session.user = {
    id: jwtPayload.user_id,
    username: jwtPayload.username,
    email: jwtPayload.email,
    githubAccessToken: jwtPayload.access_token,
    tokenType: jwtPayload.token_type,
    expiresAt: jwtPayload.expires_at
  };
  
  // Redirect to dashboard
  res.redirect('/dashboard');
}
```

### 3. GitHub API Helper
```javascript
class GitHubAPI {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }
  
  async makeRequest(url) {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    return response.json();
  }
  
  async getUserRepos() {
    return this.makeRequest('https://api.github.com/user/repos');
  }
  
  async getRepoCommits(owner, repo) {
    return this.makeRequest(`https://api.github.com/repos/${owner}/${repo}/commits`);
  }
  
  async getRepoPulls(owner, repo) {
    return this.makeRequest(`https://api.github.com/repos/${owner}/${repo}/pulls`);
  }
  
  async getBranches(owner, repo) {
    return this.makeRequest(`https://api.github.com/repos/${owner}/${repo}/branches`);
  }
}
```

### 4. Track Data Collection
```javascript
// Example: Track repository activity
async function trackRepositoryActivity(user, repoFullName) {
  const [owner, repo] = repoFullName.split('/');
  const github = new GitHubAPI(user.githubAccessToken);
  
  // Get commits
  const commits = await github.getRepoCommits(owner, repo);
  
  // Get pull requests
  const pulls = await github.getRepoPulls(owner, repo);
  
  // Store in your local database
  await storeActivityData({
    userId: user.id,
    repo: repoFullName,
    commits: commits.length,
    pullRequests: pulls.length,
    lastActivity: new Date()
  });
}
```

## Security Considerations

### 1. Token Storage
- Store GitHub access tokens securely (encrypted at rest)
- Never expose tokens in client-side JavaScript
- Use secure, HTTP-only cookies for session management

### 2. Token Expiration
- Monitor `expires_at` field in JWT
- Refresh tokens before expiration if needed
- Handle token expiry gracefully

### 3. Rate Limiting
- GitHub API has rate limits (5,000 requests/hour for authenticated users)
- Implement caching to reduce API calls
- Handle rate limit responses (HTTP 429)

## Available GitHub Scopes

The OAuth service requests these scopes:
- `user:email` - Read user email addresses
- `read:user` - Read user profile data  
- `repo` - Access to repositories (full control)

This allows Trackeep instances to:
- Read repository data
- Access commit history
- Monitor pull requests
- Track branch activity

## API Endpoints

### OAuth Service
- `GET /auth/github` - Initiate OAuth flow
- `GET /auth/github/callback` - Handle GitHub callback
- `GET /api/v1/user/me` - Get current user info

### GitHub API (via access token)
- `GET /user/repos` - User repositories
- `GET /repos/{owner}/{repo}/commits` - Repository commits
- `GET /repos/{owner}/{repo}/pulls` - Pull requests
- `GET /repos/{owner}/{repo}/branches` - Branches
- And all other GitHub API endpoints

## Benefits of This Architecture

1. **Separation of Concerns** - OAuth service only handles authentication
2. **User Privacy** - GitHub data stays in user's Trackeep instance
3. **Scalability** - Each user instance handles its own GitHub API calls
4. **Security** - No centralized GitHub data storage
5. **Flexibility** - Trackeep can implement custom tracking logic

## Example Implementation

See the `examples/` directory for complete implementation examples in different frameworks.
