#!/bin/sh

# Runtime environment variable injection script for nginx
# This script will replace placeholders in HTML with actual environment variables

# Default values
DEMO_MODE=${VITE_DEMO_MODE:-false}
API_URL=${VITE_API_URL:-http://localhost:8080}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Update nginx configuration to use the dynamic port
sed -i "s/listen 80;/listen ${FRONTEND_PORT};/g" /etc/nginx/nginx.conf

# Create a temporary script for env substitution
cat > /tmp/env_substitute.sh << 'EOF'
#!/bin/sh

# File to modify
HTML_FILE="/usr/share/nginx/html/index.html"

# Backup original file
cp /usr/share/nginx/html/index.html.orig /usr/share/nginx/html/index.html 2>/dev/null || \
cp /usr/share/nginx/html/index.html /usr/share/nginx/html/index.html.orig

# Replace environment variables in the HTML file
sed -i "s|VITE_DEMO_MODE_PLACEHOLDER|$VITE_DEMO_MODE|g" $HTML_FILE
sed -i "s|VITE_API_URL_PLACEHOLDER|$VITE_API_URL|g" $HTML_FILE
sed -i "s|VITE_OAUTH_SERVICE_URL_PLACEHOLDER|$VITE_OAUTH_SERVICE_URL|g" $HTML_FILE

# Find the actual CSS file name and update the stylesheet link
CSS_FILE=$(find /usr/share/nginx/html/assets -name "*.css" | head -1 | xargs basename)
if [ ! -z "$CSS_FILE" ]; then
    sed -i "s|href=\"/assets/index-LnCEqXC_.css\"|href=\"/assets/$CSS_FILE\"|g" $HTML_FILE
fi

echo "Environment variables injected:"
echo "VITE_DEMO_MODE=$VITE_DEMO_MODE"
echo "VITE_API_URL=$VITE_API_URL"
echo "VITE_OAUTH_SERVICE_URL=$VITE_OAUTH_SERVICE_URL"
echo "FRONTEND_PORT=$FRONTEND_PORT"
EOF

# Make the script executable
chmod +x /tmp/env_substitute.sh

# Run the substitution
/tmp/env_substitute.sh

# Start nginx
nginx -g "daemon off;"
