#!/bin/bash

# Trackeep Auto-Update Service
# Alternative to cron - runs as a systemd service for more reliable scheduling

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TRACKEEP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTO_UPDATE_SCRIPT="$TRACKEEP_DIR/scripts/auto-update.sh"
SERVICE_NAME="trackeep-auto-update"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
TIMER_FILE="/etc/systemd/system/${SERVICE_NAME}.timer"

print_status() {
    echo -e "${BLUE}🔧 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script requires root privileges to install systemd services"
        print_status "Please run with: sudo $0"
        exit 1
    fi
}

# Check if auto-update script exists
check_script() {
    if [ ! -f "$AUTO_UPDATE_SCRIPT" ]; then
        print_error "Auto-update script not found at: $AUTO_UPDATE_SCRIPT"
        exit 1
    fi
    
    if [ ! -x "$AUTO_UPDATE_SCRIPT" ]; then
        chmod +x "$AUTO_UPDATE_SCRIPT"
    fi
}

# Create systemd service file
create_service() {
    print_status "Creating systemd service..."
    
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Trackeep Auto-Update Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=$AUTO_UPDATE_SCRIPT
WorkingDirectory=$TRACKEEP_DIR
User=root
Group=root
StandardOutput=append:/var/log/trackeep-auto-update.log
StandardError=append:/var/log/trackeep-auto-update.log

[Install]
WantedBy=multi-user.target
EOF

    print_success "Service file created: $SERVICE_FILE"
}

# Create systemd timer file
create_timer() {
    print_status "Creating systemd timer..."
    
    cat > "$TIMER_FILE" << EOF
[Unit]
Description=Run Trackeep Auto-Update Daily
Requires=${SERVICE_NAME}.service

[Timer]
OnCalendar=daily
Persistent=true
RandomizedDelaySec=3600  # Random delay up to 1 hour

[Install]
WantedBy=timers.target
EOF

    print_success "Timer file created: $TIMER_FILE"
}

# Install and enable service
install_service() {
    print_status "Installing systemd service and timer..."
    
    # Reload systemd daemon
    systemctl daemon-reload
    
    # Enable and start the timer
    systemctl enable "$SERVICE_NAME.timer"
    systemctl start "$SERVICE_NAME.timer"
    
    print_success "Service and timer installed successfully!"
}

# Show status
show_status() {
    print_status "Service status:"
    systemctl status "$SERVICE_NAME.timer" --no-pager
    
    echo ""
    print_status "Next run time:"
    systemctl list-timers "$SERVICE_NAME.timer" --no-pager
    
    echo ""
    print_status "Recent logs:"
    journalctl -u "$SERVICE_NAME.service" --no-pager -n 10 || tail -10 /var/log/trackeep-auto-update.log 2>/dev/null || print_warning "No logs found"
}

# Test service
test_service() {
    print_status "Testing auto-update service..."
    
    # Run the service manually
    systemctl start "$SERVICE_NAME.service"
    
    # Show results
    echo ""
    print_status "Service execution results:"
    journalctl -u "$SERVICE_NAME.service" --no-pager -n 20 || tail -20 /var/log/trackeep-auto-update.log 2>/dev/null
}

# Remove service
remove_service() {
    print_status "Removing auto-update service..."
    
    # Stop and disable timer
    systemctl stop "$SERVICE_NAME.timer" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME.timer" 2>/dev/null || true
    
    # Remove service and timer files
    rm -f "$SERVICE_FILE" "$TIMER_FILE"
    
    # Reload systemd daemon
    systemctl daemon-reload
    
    print_success "Auto-update service removed"
}

# Main function
main() {
    echo ""
    print_status "Trackeep Auto-Update Service Setup"
    print_status "=================================="
    echo ""
    
    case "${1:-install}" in
        "install")
            check_root
            check_script
            create_service
            create_timer
            install_service
            show_status
            print_success "SystemD auto-update service installed!"
            echo ""
            print_status "The service will run daily at a randomized time"
            print_status "To view logs: journalctl -u $SERVICE_NAME.service -f"
            print_status "To run manually: systemctl start $SERVICE_NAME.service"
            print_status "To remove: sudo $0 remove"
            ;;
        "remove")
            check_root
            remove_service
            ;;
        "status")
            show_status
            ;;
        "test")
            check_root
            test_service
            ;;
        "enable")
            check_root
            systemctl enable "$SERVICE_NAME.timer"
            print_success "Timer enabled"
            ;;
        "disable")
            check_root
            systemctl disable "$SERVICE_NAME.timer"
            print_success "Timer disabled"
            ;;
        *)
            echo "Usage: $0 [install|remove|status|test|enable|disable]"
            echo "  install  - Install systemd service for daily auto-update (default)"
            echo "  remove   - Remove systemd service"
            echo "  status   - Show service status and next run time"
            echo "  test     - Run auto-update service manually"
            echo "  enable   - Enable the timer"
            echo "  disable  - Disable the timer"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
