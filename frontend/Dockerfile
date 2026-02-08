# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --include=dev

# Copy environment variables and source code
COPY .env ./frontend/
COPY frontend/ ./frontend/

# Build the application
RUN cd frontend && npx vite build

# Production stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
