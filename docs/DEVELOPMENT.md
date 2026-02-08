# Development Setup

## Environment Configuration

This project uses separate environment configurations for local development and Docker deployment:

### Local Development
- **Backend**: Uses `.env` file with `DB_HOST=localhost`
- **Frontend**: Uses `frontend/.env` with `VITE_API_URL=http://localhost:8080/api/v1`

### Docker Deployment
- **Backend**: Uses `.env.docker` file with `DB_HOST=postgres` (Docker network)
- **Frontend**: Uses `frontend/.env.docker` with same API URLs

## Port Configuration

- **Backend Port**: Determined by `PORT` environment variable (default: 8080)
- **Frontend Port**: Determined by `FRONTEND_PORT` environment variable (default: 5173)
- **PostgreSQL**: Port 5432 (configured in docker-compose.yml)

## Running the Application

### Local Development
```bash
# Start PostgreSQL (if not running)
docker run -d --name postgres -p 5432:5432 -e POSTGRES_DB=trackeep -e POSTGRES_USER=trackeep -e POSTGRES_PASSWORD=trackeep123 postgres:15-alpine

# Start backend
cd backend && go run main.go

# Start frontend
cd frontend && npm run dev
```

### Docker Deployment
```bash
docker-compose up --build
```

## Environment Variables

Key environment variables that control the application:

- `PORT`: Backend server port
- `FRONTEND_PORT`: Frontend development server port
- `DB_TYPE`: Database type (postgres)
- `DB_HOST`: Database host (localhost for local, postgres for Docker)
- `VITE_DEMO_MODE`: Enable/disable demo mode
- `VITE_API_URL`: Frontend API base URL

## Demo Mode

When `VITE_DEMO_MODE=true`, the application:
- Auto-populates login form with demo credentials
- Restricts write operations to protect demo data
- Seeds initial demo data on startup

Demo credentials:
- Email: demo@trackeep.com
- Password: demo123
