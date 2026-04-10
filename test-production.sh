#!/bin/bash

# Trackeep Production Readiness Test Script
# This script tests all critical components before deployment

set -e

echo "========================================="
echo "Trackeep Production Readiness Test"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    ((WARNINGS++))
}

# Test 1: Check environment file
echo "Test 1: Environment Configuration"
if [ -f ".env" ]; then
    pass "Environment file exists"
    
    # Check required variables
    required_vars=("DB_PASSWORD" "DRAGONFLY_PASSWORD" "JWT_SECRET" "ENCRYPTION_KEY")
    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" .env && ! grep -q "^${var}=$" .env && ! grep -q "^${var}=<" .env; then
            pass "$var is set"
        else
            fail "$var is not set or uses placeholder value"
        fi
    done
else
    fail "Environment file (.env) not found"
fi
echo ""

# Test 2: Check Docker
echo "Test 2: Docker Environment"
if command -v docker &> /dev/null; then
    pass "Docker is installed"
    docker_version=$(docker --version | awk '{print $3}' | tr -d ',')
    echo "  Docker version: $docker_version"
else
    fail "Docker is not installed"
fi

if command -v docker-compose &> /dev/null; then
    pass "Docker Compose is installed"
    compose_version=$(docker-compose --version | awk '{print $4}' | tr -d ',')
    echo "  Docker Compose version: $compose_version"
else
    fail "Docker Compose is not installed"
fi
echo ""

# Test 3: Check backend build
echo "Test 3: Backend Build"
if [ -d "backend" ]; then
    pass "Backend directory exists"
    
    cd backend
    if [ -f "go.mod" ]; then
        pass "Go module file exists"
        
        # Try to build
        echo "  Building backend..."
        if go build -o /tmp/trackeep-test 2>&1 | tee /tmp/build.log; then
            pass "Backend builds successfully"
            rm -f /tmp/trackeep-test
        else
            fail "Backend build failed (see /tmp/build.log)"
            cat /tmp/build.log
        fi
    else
        fail "go.mod not found"
    fi
    cd ..
else
    fail "Backend directory not found"
fi
echo ""

# Test 4: Check frontend
echo "Test 4: Frontend Build"
if [ -d "frontend" ]; then
    pass "Frontend directory exists"
    
    cd frontend
    if [ -f "package.json" ]; then
        pass "package.json exists"
        
        if [ -d "node_modules" ]; then
            pass "Node modules installed"
        else
            warn "Node modules not installed (run: npm install)"
        fi
        
        # Check if dist exists (built)
        if [ -d "dist" ]; then
            pass "Frontend is built"
        else
            warn "Frontend not built (run: npm run build)"
        fi
    else
        fail "package.json not found"
    fi
    cd ..
else
    fail "Frontend directory not found"
fi
echo ""

# Test 5: Check Docker Compose configuration
echo "Test 5: Docker Compose Configuration"
if [ -f "docker-compose.prod.yml" ]; then
    pass "Production docker-compose file exists"
    
    # Validate docker-compose file
    if docker-compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
        pass "Docker Compose configuration is valid"
    else
        fail "Docker Compose configuration has errors"
    fi
else
    fail "docker-compose.prod.yml not found"
fi
echo ""

# Test 6: Security checks
echo "Test 6: Security Configuration"

# Check JWT secret strength
if [ -f ".env" ]; then
    jwt_secret=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2)
    if [ ${#jwt_secret} -ge 32 ]; then
        pass "JWT_SECRET has sufficient length (${#jwt_secret} chars)"
    else
        fail "JWT_SECRET is too short (${#jwt_secret} chars, minimum 32)"
    fi
    
    # Check encryption key strength
    enc_key=$(grep "^ENCRYPTION_KEY=" .env | cut -d'=' -f2)
    if [ ${#enc_key} -ge 32 ]; then
        pass "ENCRYPTION_KEY has sufficient length (${#enc_key} chars)"
    else
        fail "ENCRYPTION_KEY is too short (${#enc_key} chars, minimum 32)"
    fi
fi

# Check for default passwords
if grep -q "password123\|admin123\|changeme" .env 2>/dev/null; then
    fail "Default/weak passwords detected in .env"
else
    pass "No obvious default passwords found"
fi
echo ""

# Test 7: Port availability
echo "Test 7: Port Availability"
check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        warn "Port $port ($service) is already in use"
    else
        pass "Port $port ($service) is available"
    fi
}

check_port 8080 "Backend"
check_port 5432 "PostgreSQL"
check_port 6379 "DragonflyDB"
check_port 80 "Frontend"
echo ""

# Test 8: Disk space
echo "Test 8: System Resources"
available_space=$(df -BG . | tail -1 | awk '{print $4}' | tr -d 'G')
if [ "$available_space" -ge 20 ]; then
    pass "Sufficient disk space available (${available_space}GB)"
else
    warn "Low disk space (${available_space}GB, recommended: 20GB+)"
fi

# Check memory
total_mem=$(free -g | awk '/^Mem:/{print $2}')
if [ "$total_mem" -ge 4 ]; then
    pass "Sufficient memory available (${total_mem}GB)"
else
    warn "Low memory (${total_mem}GB, recommended: 4GB+)"
fi
echo ""

# Test 9: Database migrations
echo "Test 9: Database Schema"
if [ -d "backend/migrations" ]; then
    migration_count=$(ls -1 backend/migrations/*.sql 2>/dev/null | wc -l)
    if [ "$migration_count" -gt 0 ]; then
        pass "Database migrations found ($migration_count files)"
    else
        warn "No SQL migration files found (using auto-migration)"
    fi
else
    warn "Migrations directory not found"
fi
echo ""

# Test 10: SSL/TLS Configuration
echo "Test 10: SSL/TLS Configuration"
if [ -f "nginx.conf" ] || [ -f "/etc/nginx/sites-available/trackeep" ]; then
    pass "Nginx configuration found"
    
    if grep -q "ssl_certificate" nginx.conf 2>/dev/null || grep -q "ssl_certificate" /etc/nginx/sites-available/trackeep 2>/dev/null; then
        pass "SSL configuration detected"
    else
        warn "SSL not configured (recommended for production)"
    fi
else
    warn "Nginx configuration not found (consider using reverse proxy)"
fi
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed! Ready for production deployment.${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠ Tests passed with warnings. Review warnings before deployment.${NC}"
        exit 0
    fi
else
    echo -e "${RED}✗ Some tests failed. Fix issues before deploying to production.${NC}"
    exit 1
fi
