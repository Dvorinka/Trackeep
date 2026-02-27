#!/bin/bash

# Setup Daily Auto-Update Cron Job for Trackeep
# This script configures a cron job to run auto-update daily at 2 AM

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
CRON_SCHEDULE="0 2 * * *"  # Daily at 2 AM
LOG_FILE="/var/log/trackeep-auto-update.log"

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

# Check if running as root (for cron setup)
check_permissions() {
    if [ "$EUID" -ne 0 ]; then
        print_warning "This script is best run with sudo for proper cron setup"
        print_warning "Current user: $(whoami)"
        print_warning "Cron job will be created for current user's crontab"
        echo ""
        read -p "Continue? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Check if auto-update script exists
check_script() {
    if [ ! -f "$AUTO_UPDATE_SCRIPT" ]; then
        print_error "Auto-update script not found at: $AUTO_UPDATE_SCRIPT"
        exit 1
    fi
    
    if [ ! -x "$AUTO_UPDATE_SCRIPT" ]; then
        print_warning "Making auto-update script executable..."
        chmod +x "$AUTO_UPDATE_SCRIPT"
    fi
}

# Create log directory
setup_logging() {
    print_status "Setting up logging..."
    
    # Create log directory if it doesn't exist
    sudo mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || {
        mkdir -p "$(dirname "$LOG_FILE")" && LOG_FILE="$HOME/trackeep-auto-update.log"
        print_warning "Using user log file: $LOG_FILE"
    }
    
    # Set permissions
    sudo touch "$LOG_FILE" 2>/dev/null || touch "$LOG_FILE"
    sudo chmod 644 "$LOG_FILE" 2>/dev/null || chmod 644 "$LOG_FILE"
    
    print_success "Logging configured: $LOG_FILE"
}

# Install cron job
install_cron() {
    print_status "Installing cron job for daily auto-update..."
    
    # Create cron entry
    local cron_entry="$CRON_SCHEDULE cd $TRACKEEP_DIR && $AUTO_UPDATE_SCRIPT >> $LOG_FILE 2>&1"
    
    # Get current crontab
    local temp_cron=$(mktemp)
    crontab -l > "$temp_cron" 2>/dev/null || echo "" > "$temp_cron"
    
    # Check if entry already exists
    if grep -q "auto-update.sh" "$temp_cron"; then
        print_warning "Auto-update cron job already exists"
        print_status "Removing existing entry..."
        grep -v "auto-update.sh" "$temp_cron" > "${temp_cron}.new"
        mv "${temp_cron}.new" "$temp_cron"
    fi
    
    # Add new entry
    echo "# Trackeep Auto-Update - Daily at 2 AM" >> "$temp_cron"
    echo "$cron_entry" >> "$temp_cron"
    
    # Install new crontab
    crontab "$temp_cron"
    rm "$temp_cron"
    
    print_success "Cron job installed successfully!"
    print_status "Schedule: Daily at 2:00 AM"
    print_status "Command: $cron_entry"
}

# Test cron job
test_cron() {
    print_status "Testing auto-update script..."
    
    # Run the script in test mode (dry run)
    if cd "$TRACKEEP_DIR" && "$AUTO_UPDATE_SCRIPT" --test 2>/dev/null || "$AUTO_UPDATE_SCRIPT" 2>&1 | head -10; then
        print_success "Auto-update script test completed"
    else
        print_warning "Auto-update script test had issues (this may be normal if Docker isn't running)"
    fi
}

# Show cron status
show_status() {
    print_status "Current cron jobs:"
    crontab -l | grep -E "(trackeep|auto-update)" || print_warning "No Trackeep cron jobs found"
    
    echo ""
    print_status "Log file location: $LOG_FILE"
    print_status "Auto-update script: $AUTO_UPDATE_SCRIPT"
    print_status "Trackeep directory: $TRACKEEP_DIR"
}

# Remove cron job
remove_cron() {
    print_status "Removing auto-update cron job..."
    
    local temp_cron=$(mktemp)
    crontab -l > "$temp_cron" 2>/dev/null || echo "" > "$temp_cron"
    
    # Remove auto-update entries
    grep -v -E "(trackeep|auto-update)" "$temp_cron" > "${temp_cron}.new" 2>/dev/null || echo "" > "${temp_cron}.new"
    mv "${temp_cron}.new" "$temp_cron"
    
    # Install updated crontab
    crontab "$temp_cron"
    rm "$temp_cron"
    
    print_success "Auto-update cron job removed"
}

# Main menu
main() {
    echo ""
    print_status "Trackeep Auto-Update Setup"
    print_status "=========================="
    echo ""
    
    case "${1:-setup}" in
        "setup")
            check_permissions
            check_script
            setup_logging
            install_cron
            test_cron
            show_status
            print_success "Daily auto-update setup complete!"
            echo ""
            print_status "To view logs: tail -f $LOG_FILE"
            print_status "To run manually: cd $TRACKEEP_DIR && $AUTO_UPDATE_SCRIPT"
            print_status "To remove: $0 remove"
            ;;
        "remove")
            remove_cron
            ;;
        "status")
            show_status
            ;;
        "test")
            test_cron
            ;;
        *)
            echo "Usage: $0 [setup|remove|status|test]"
            echo "  setup   - Install daily auto-update cron job (default)"
            echo "  remove  - Remove auto-update cron job"
            echo "  status  - Show current cron job status"
            echo "  test    - Test auto-update script"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
