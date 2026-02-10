#!/bin/bash

# Trackeep Installation Script
# This script installs Trackeep using Docker and Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TRACKEEP_VERSION="latest"
INSTALL_DIR="/opt/trackeep"
BACKUP_DIR="/opt/trackeep-backup-$(date +%Y%m%d-%H%M%S)"
GITHUB_REPO="https://github.com/Dvorinka/Trackeep"

# Helper functions
print_header() {
    echo -e "${BLUE}"
    echo "░▀█▀░█▀▄░█▀█░█▀▀░█░█░█▀▀░█▀▀░█▀█"
    echo "░░█░░█▀▄░█▀█░█░░░█▀▄░█▀▀░█▀▀░█▀▀"
    echo "░░▀░░▀░▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀░░"
    echo "======================================"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

install_docker() {
    print_info "Installing Docker..."
    
    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get >/dev/null 2>&1; then
            # Ubuntu/Debian
            print_info "Detected Ubuntu/Debian system"
            sudo apt-get update
            sudo apt-get install -y ca-certificates curl gnupg lsb-release
            
            # Add Docker's official GPG key
            sudo mkdir -p /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            
            # Set up the repository
            echo \
              "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
              $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            # Install Docker Engine
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            
        elif command -v yum >/dev/null 2>&1; then
            # CentOS/RHEL/Fedora
            print_info "Detected CentOS/RHEL/Fedora system"
            sudo yum install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            
        elif command -v dnf >/dev/null 2>&1; then
            # Fedora
            print_info "Detected Fedora system"
            sudo dnf install -y dnf-plugins-core
            sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
            sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            
        else
            print_error "Unsupported Linux distribution for auto-installation"
            print_info "Please install Docker manually: https://docs.docker.com/get-docker/"
            return 1
        fi
        
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        print_info "Detected macOS system"
        if command -v brew >/dev/null 2>&1; then
            brew install --cask docker
        else
            print_error "Homebrew not found. Please install Homebrew first:"
            print_info "/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            return 1
        fi
        
    else
        print_error "Unsupported operating system for auto-installation"
        print_info "Please install Docker manually: https://docs.docker.com/get-docker/"
        return 1
    fi
    
    # Start and enable Docker
    if command -v systemctl >/dev/null 2>&1; then
        sudo systemctl start docker
        sudo systemctl enable docker
    fi
    
    # Add user to docker group
    if groups $USER | grep -q docker; then
        print_success "User already in docker group"
    else
        print_info "Adding user to docker group..."
        sudo usermod -aG docker $USER
        print_warning "You may need to log out and log back in for group changes to take effect"
    fi
    
    print_success "Docker installation completed"
}

install_requirements() {
    print_info "Checking and installing requirements..."
    
    # Check for curl
    if ! check_command curl; then
        print_info "Installing curl..."
        if command -v apt-get >/dev/null 2>&1; then
            sudo apt-get update && sudo apt-get install -y curl
        elif command -v yum >/dev/null 2>&1; then
            sudo yum install -y curl
        elif command -v dnf >/dev/null 2>&1; then
            sudo dnf install -y curl
        elif command -v brew >/dev/null 2>&1; then
            brew install curl
        else
            print_error "Cannot install curl automatically. Please install it manually."
            exit 1
        fi
    fi
    
    # Check for openssl
    if ! check_command openssl; then
        print_info "Installing openssl..."
        if command -v apt-get >/dev/null 2>&1; then
            sudo apt-get update && sudo apt-get install -y openssl
        elif command -v yum >/dev/null 2>&1; then
            sudo yum install -y openssl
        elif command -v dnf >/dev/null 2>&1; then
            sudo dnf install -y openssl
        elif command -v brew >/dev/null 2>&1; then
            brew install openssl
        else
            print_error "Cannot install openssl automatically. Please install it manually."
            exit 1
        fi
    fi
check_system_requirements() {
    print_info "Checking system requirements..."
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root for security reasons."
        print_info "Please run as a regular user with sudo privileges."
        exit 1
    fi
    
    # Install basic requirements
    install_requirements
    
    # Check Docker
    if check_command docker; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | sed 's/,//')
        print_success "Docker found: $DOCKER_VERSION"
    else
        print_warning "Docker is not installed"
        read -p "Would you like to install Docker automatically? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_docker
        else
            print_error "Docker is required. Please install it manually: https://docs.docker.com/get-docker/"
            exit 1
        fi
    fi
    
    # Check Docker Compose
    if check_command docker-compose; then
        COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | sed 's/,//')
        print_success "Docker Compose found: $COMPOSE_VERSION"
    elif docker compose version >/dev/null 2>&1; then
        print_success "Docker Compose (plugin) found"
        COMPOSE_CMD="docker compose"
    else
        print_error "Docker Compose is not installed"
        print_info "Docker Compose should be included with Docker installation. Please check your installation."
        exit 1
    fi
    
    # Check available disk space (at least 2GB)
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
    if [[ $AVAILABLE_SPACE -lt 2097152 ]]; then # 2GB in KB
        print_warning "Low disk space detected. At least 2GB recommended."
    fi
    
    # Check memory (at least 2GB)
    TOTAL_MEMORY=$(free -m | awk 'NR==2{print $2}')
    if [[ $TOTAL_MEMORY -lt 2048 ]]; then
        print_warning "Low memory detected. At least 2GB RAM recommended."
    fi
    
    print_success "System requirements check passed"
}

backup_existing_installation() {
    if [[ -d "$INSTALL_DIR" ]]; then
        print_warning "Existing Trackeep installation found at $INSTALL_DIR"
        read -p "Would you like to backup the existing installation? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Creating backup at $BACKUP_DIR..."
            sudo cp -r "$INSTALL_DIR" "$BACKUP_DIR"
            print_success "Backup created successfully"
        fi
    fi
}

create_install_directory() {
    print_info "Creating installation directory..."
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown "$USER:$USER" "$INSTALL_DIR"
    print_success "Installation directory created: $INSTALL_DIR"
}

download_trackeep() {
    print_info "Downloading Trackeep from $GITHUB_REPO..."
    
    cd "$INSTALL_DIR"
    
    # Get latest release info from GitHub API
    if check_command curl; then
        LATEST_RELEASE=$(curl -s https://api.github.com/repos/Dvorinka/Trackeep/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
        if [[ -n "$LATEST_RELEASE" ]]; then
            TRACKEEP_VERSION="$LATEST_RELEASE"
            print_info "Latest version: $TRACKEEP_VERSION"
        fi
    fi
    
    # Download docker-compose.yml and .env.example
    if check_command wget; then
        wget -q "https://raw.githubusercontent.com/Dvorinka/Trackeep/main/docker-compose.yml" -O docker-compose.yml
        wget -q "https://raw.githubusercontent.com/Dvorinka/Trackeep/main/.env.example" -O .env
    elif check_command curl; then
        curl -s "https://raw.githubusercontent.com/Dvorinka/Trackeep/main/docker-compose.yml" -o docker-compose.yml
        curl -s "https://raw.githubusercontent.com/Dvorinka/Trackeep/main/.env.example" -o .env
    else
        print_error "Neither wget nor curl is available for downloading files"
        exit 1
    fi
    
    if [[ -f "docker-compose.yml" && -f ".env" ]]; then
        print_success "Trackeep files downloaded successfully"
    else
        print_error "Failed to download Trackeep files"
        exit 1
    fi
}

setup_environment() {
    print_info "Setting up Trackeep environment configuration..."
    
    cd "$INSTALL_DIR"
    
    print_header
    echo -e "${BLUE}Environment Configuration Setup${NC}"
    echo -e "${BLUE}=================================${NC}"
    echo
    echo -e "${YELLOW}Let's configure your Trackeep installation.${NC}"
    echo -e "${YELLOW}Press Enter to accept the default values shown in brackets.${NC}"
    echo
    
    # Read user input for configuration
    echo -e "${BLUE}1. Basic Configuration${NC}"
    
    # Application Name
    read -p "Application name [Trackeep]: " APP_NAME
    APP_NAME=${APP_NAME:-Trackeep}
    
    # Environment
    echo
    read -p "Environment [production]: " ENVIRONMENT
    ENVIRONMENT=${ENVIRONMENT:-production}
    
    # Port
    read -p "Port [8080]: " PORT
    PORT=${PORT:-8080}
    
    # Domain/Host
    echo
    read -p "Domain or host [localhost]: " DOMAIN
    DOMAIN=${DOMAIN:-localhost}
    
    echo
    echo -e "${BLUE}2. Security Configuration${NC}"
    
    # Generate secure JWT secret
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || date +%s | sha256sum | base64 | head -c 32)
    
    # Generate database password
    DB_PASSWORD=$(openssl rand -base64 16 2>/dev/null || date +%s | sha256sum | base64 | head -c 16)
    
    # Ask for custom secrets
    read -p "Generate new JWT secret? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        read -p "Custom JWT secret (leave empty to auto-generate): " CUSTOM_JWT_SECRET
        if [[ -n "$CUSTOM_JWT_SECRET" ]]; then
            JWT_SECRET="$CUSTOM_JWT_SECRET"
        fi
    fi
    
    read -p "Generate new database password? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        read -p "Custom database password (leave empty to auto-generate): " CUSTOM_DB_PASSWORD
        if [[ -n "$CUSTOM_DB_PASSWORD" ]]; then
            DB_PASSWORD="$CUSTOM_DB_PASSWORD"
        fi
    fi
    
    echo
    echo -e "${BLUE}3. Database Configuration${NC}"
    
    # Database settings
    read -p "Database name [trackeep]: " DB_NAME
    DB_NAME=${DB_NAME:-trackeep}
    
    read -p "Database username [trackeep]: " DB_USER
    DB_USER=${DB_USER:-trackeep}
    
    read -p "Database host [postgres]: " DB_HOST
    DB_HOST=${DB_HOST:-postgres}
    
    echo
    echo -e "${BLUE}4. Optional Features${NC}"
    
    # AI Integration
    read -p "Enable AI features? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        ENABLE_AI=true
        read -p "AI provider [openai]: " AI_PROVIDER
        AI_PROVIDER=${AI_PROVIDER:-openai}
        
        if [[ "$AI_PROVIDER" == "openai" ]]; then
            read -p "OpenAI API key (optional): " OPENAI_API_KEY
        elif [[ "$AI_PROVIDER" == "longcat" ]]; then
            read -p "LongCat API key (optional): " LONGCAT_API_KEY
        fi
    else
        ENABLE_AI=false
    fi
    
    # Email configuration
    echo
    read -p "Configure email settings? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "SMTP host: " SMTP_HOST
        read -p "SMTP port [587]: " SMTP_PORT
        SMTP_PORT=${SMTP_PORT:-587}
        read -p "SMTP username: " SMTP_USER
        read -s -p "SMTP password: " SMTP_PASS
        echo
        read -p "From email: " EMAIL_FROM
    fi
    
    echo
    echo -e "${BLUE}5. Advanced Settings${NC}"
    
    # Debug mode
    read -p "Enable debug mode? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        DEBUG=true
    else
        DEBUG=false
    fi
    
    # Log level
    read -p "Log level [info]: " LOG_LEVEL
    LOG_LEVEL=${LOG_LEVEL:-info}
    
    # Update .env file with all configurations
    print_info "Generating environment configuration..."
    
    # Create the .env file
    cat > .env << EOF
# Trackeep Environment Configuration
# Generated on $(date)

# Application Settings
APP_NAME=$APP_NAME
ENVIRONMENT=$ENVIRONMENT
PORT=$PORT
DOMAIN=$DOMAIN
DEBUG=$DEBUG
LOG_LEVEL=$LOG_LEVEL

# Security
JWT_SECRET=$JWT_SECRET

# Database Configuration
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_HOST=$DB_HOST
DB_PORT=5432

# AI Configuration
ENABLE_AI=$ENABLE_AI
EOF

    # Add AI settings if enabled
    if [[ "$ENABLE_AI" == "true" ]]; then
        cat >> .env << EOF
AI_PROVIDER=$AI_PROVIDER
EOF
        if [[ "$AI_PROVIDER" == "openai" && -n "$OPENAI_API_KEY" ]]; then
            echo "OPENAI_API_KEY=$OPENAI_API_KEY" >> .env
        elif [[ "$AI_PROVIDER" == "longcat" && -n "$LONGCAT_API_KEY" ]]; then
            echo "LONGCAT_API_KEY=$LONGCAT_API_KEY" >> .env
        fi
    fi
    
    # Add email settings if configured
    if [[ -n "$SMTP_HOST" ]]; then
        cat >> .env << EOF

# Email Configuration
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
EMAIL_FROM=$EMAIL_FROM
EOF
    fi
    
    # Add additional settings
    cat >> .env << EOF

# Additional Settings
CORS_ORIGIN=http://$DOMAIN:$PORT
MAX_FILE_SIZE=10485760
SESSION_TIMEOUT=3600
EOF
    
    print_success "Environment configuration created"
    
    echo
    echo -e "${BLUE}Configuration Summary:${NC}"
    echo -e "  • Application: ${YELLOW}$APP_NAME${NC}"
    echo -e "  • Environment: ${YELLOW}$ENVIRONMENT${NC}"
    echo -e "  • Port: ${YELLOW}$PORT${NC}"
    echo -e "  • Domain: ${YELLOW}$DOMAIN${NC}"
    echo -e "  • Database: ${YELLOW}$DB_NAME${NC}"
    echo -e "  • AI Features: ${YELLOW}$ENABLE_AI${NC}"
    if [[ -n "$SMTP_HOST" ]]; then
        echo -e "  • Email: ${YELLOW}Configured${NC}"
    fi
    echo
    
    print_warning "Please review $INSTALL_DIR/.env file and adjust settings as needed"
    print_info "You can regenerate this configuration by running the setup again"
}

initialize_services() {
    print_info "Initializing Trackeep services..."
    
    cd "$INSTALL_DIR"
    
    # Set compose command
    if [[ -z "$COMPOSE_CMD" ]]; then
        COMPOSE_CMD="docker-compose"
    fi
    
    # Pull latest images
    print_info "Pulling Docker images..."
    $COMPOSE_CMD pull
    
    # Start services
    print_info "Starting Trackeep services..."
    $COMPOSE_CMD up -d
    
    # Wait for services to be ready
    print_info "Waiting for services to start..."
    sleep 10
    
    # Check if services are running
    if $COMPOSE_CMD ps | grep -q "Up"; then
        print_success "Trackeep services started successfully"
    else
        print_error "Failed to start Trackeep services"
        print_info "Check logs with: cd $INSTALL_DIR && $COMPOSE_CMD logs"
        exit 1
    fi
}

create_admin_user() {
    print_info "Creating admin user..."
    
    cd "$INSTALL_DIR"
    
    # Wait a bit more for the API to be ready
    sleep 5
    
    # Create admin user (this would need to be implemented in the actual Trackeep API)
    print_info "Admin user creation will be available through the web interface"
    print_info "Visit http://localhost:8080 to complete setup"
}

display_success_message() {
    print_header
    echo -e "${GREEN}🎉 Trackeep installation completed successfully!${NC}"
    echo
    echo -e "${BLUE}Access URLs:${NC}"
    echo -e "  • Web Interface: ${YELLOW}http://$DOMAIN:$PORT${NC}"
    echo -e "  • API: ${YELLOW}http://$DOMAIN:$PORT/api${NC}"
    echo
    echo -e "${BLUE}Management Commands:${NC}"
    echo -e "  • View logs: ${YELLOW}cd $INSTALL_DIR && $COMPOSE_CMD logs -f${NC}"
    echo -e "  • Stop services: ${YELLOW}cd $INSTALL_DIR && $COMPOSE_CMD down${NC}"
    echo -e "  • Update: ${YELLOW}cd $INSTALL_DIR && $COMPOSE_CMD pull && $COMPOSE_CMD up -d${NC}"
    echo
    echo -e "${BLUE}Configuration:${NC}"
    echo -e "  • Environment file: ${YELLOW}$INSTALL_DIR/.env${NC}"
    echo -e "  • Docker Compose: ${YELLOW}$INSTALL_DIR/docker-compose.yml${NC}"
    echo
    echo -e "${BLUE}Repository:${NC}"
    echo -e "  • Source Code: ${YELLOW}$GITHUB_REPO${NC}"
    echo -e "  • Report Issues: ${YELLOW}$GITHUB_REPO/issues${NC}"
    echo
    echo -e "${BLUE}Next Steps:${NC}"
    echo -e "  1. Visit ${YELLOW}http://$DOMAIN:$PORT${NC} to complete setup"
    echo -e "  2. Create your admin account"
    echo -e "  3. Configure your preferences"
    echo -e "  4. Start organizing your digital life!"
    echo
    if [[ -d "$BACKUP_DIR" ]]; then
        echo -e "${BLUE}Backup:${NC}"
        echo -e "  • Previous installation backed up to: ${YELLOW}$BACKUP_DIR${NC}"
        echo
    fi
    echo -e "${GREEN}Welcome to Trackeep! 🚀${NC}"
    echo -e "${BLUE}Thank you for using Trackeep - Your Self-Hosted Productivity Hub${NC}"
}

# Main installation flow
main() {
    print_header
    
    echo -e "${BLUE}Trackeep Installation Script${NC}"
    echo -e "${BLUE}============================${NC}"
    echo
    
    # Check system requirements
    check_system_requirements
    echo
    
    # Backup existing installation
    backup_existing_installation
    echo
    
    # Create installation directory
    create_install_directory
    echo
    
    # Download Trackeep
    download_trackeep
    echo
    
    # Setup environment
    setup_environment
    echo
    
    # Initialize services
    initialize_services
    echo
    
    # Create admin user
    create_admin_user
    echo
    
    # Display success message
    display_success_message
}

# Handle script interruption
trap 'print_error "Installation interrupted. Please check the logs and try again."; exit 1' INT

# Run main function
main "$@"