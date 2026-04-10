# Unified GitHub App Setup

Trackeep self-hosted instances now use the unified controller at `https://hq.trackeep.org` for:

- GitHub sign-in
- GitHub App installation
- GitHub repo access used by backup flows

## Self-Hosted Trackeep Instance

The self-hosted instance does not need any GitHub App credentials.

Required instance settings:

```bash
FRONTEND_URL=http://localhost:3000
PUBLIC_API_URL=http://localhost:9000
GITHUB_BACKUP_ROOT=./data/github-backups
GITHUB_BACKUP_TIMEOUT=10m
```

Flow:

1. `GET /api/v1/auth/github` redirects to `https://hq.trackeep.org/auth/github`
2. The controller redirects back to `GET /api/v1/auth/control/callback?token=...`
3. Trackeep validates that controller token against `https://hq.trackeep.org/api/v1/auth/control/callback`
4. Trackeep creates its own local JWT and redirects to `/auth/callback?token=...`

GitHub App installation:

1. Trackeep creates a local install state
2. Trackeep asks `https://hq.trackeep.org/api/v1/github/app/install-url` for a brokered install URL
3. GitHub redirects to `https://hq.trackeep.org/auth/github/app/callback`
4. The controller verifies the installation and redirects back to `GET /api/v1/github/app/callback`
5. Trackeep stores the installation ID locally

## Unified Controller (`Trackeep_OAUTH`)

`Trackeep_OAUTH` owns the single shared GitHub App.

GitHub App settings:

- `Homepage URL`: your controller site URL
- `User authorization callback URL`: `https://hq.trackeep.org/auth/github/callback`
- `Setup URL`: `https://hq.trackeep.org/auth/github/app/callback`
- `Expire user authorization tokens`: enabled
- `Request user authorization (OAuth) during installation`: disabled

Required controller environment:

```bash
GITHUB_APP_CLIENT_ID=your_github_app_client_id
GITHUB_APP_CLIENT_SECRET=your_github_app_client_secret
GITHUB_APP_SLUG=trackeep
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_REDIRECT_URL=https://hq.trackeep.org/auth/github/callback
DEFAULT_CLIENT_URL=https://app.trackeep.org
SERVICE_DOMAIN=https://hq.trackeep.org
```

Permissions:

- Account: `Email addresses` -> `Read-only`
- Repository: `Metadata` -> `Read-only`
- Repository: `Contents` -> `Read-only`
