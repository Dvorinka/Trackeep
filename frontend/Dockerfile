# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Accept build arguments for VITE environment variables
ARG VITE_DEMO_MODE=false
ARG VITE_API_URL=http://localhost:8080
ARG VITE_OAUTH_SERVICE_URL=https://oauth.trackeep.org

# Copy package files
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --include=dev

# Copy frontend source code only
COPY frontend/ ./frontend/

# Create a .env.production file with build arguments
RUN cd frontend && echo "VITE_DEMO_MODE=${VITE_DEMO_MODE}" >> .env.production && \
    echo "VITE_API_URL=${VITE_API_URL}" >> .env.production && \
    echo "VITE_OAUTH_SERVICE_URL=${VITE_OAUTH_SERVICE_URL}" >> .env.production

# Build the application (frontend only)
RUN cd frontend && npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy the entrypoint script
COPY frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Make a backup of the original index.html for runtime substitution
RUN cp /usr/share/nginx/html/index.html /usr/share/nginx/html/index.html.orig

# Expose port (will be dynamically set by entrypoint)
EXPOSE 80

# Start the entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]
