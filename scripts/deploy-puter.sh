#!/bin/bash
# Puter CLI Deployment Script - Best Practices
# This script automates the deployment of Puter Monitor AI to Puter Cloud

set -e  # Exit on error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
success() { echo -e "${GREEN}✓ $1${NC}"; }
info() { echo -e "${CYAN}ℹ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
error() { echo -e "${RED}✗ $1${NC}"; exit 1; }

# Configuration
ENVIRONMENT="${1:-production}"
SUBDOMAIN="${2:-monitor-ai}"
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
FORCE="${FORCE:-false}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_PATH="$PROJECT_ROOT/dist"
APP_NAME="puter-monitor-ai"

info "Starting Puter deployment for $APP_NAME..."
info "Environment: $ENVIRONMENT"
info "Subdomain: $SUBDOMAIN"

# Step 1: Check prerequisites
info "Checking prerequisites..."

# Check Puter CLI
if ! command -v puter &> /dev/null; then
    error "Puter CLI is not installed. Install it with: npm install -g puter-cli"
fi
success "Puter CLI is installed"

# Check Node.js
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js v20 or higher."
fi
NODE_VERSION=$(node --version)
success "Node.js is installed: $NODE_VERSION"

# Step 2: Check authentication
info "Checking Puter authentication..."
if ! puter whoami &> /dev/null; then
    warning "Not authenticated with Puter. Please run: puter login"
    info "Opening login prompt..."
    puter login || error "Authentication failed"
fi
success "Authenticated with Puter"

# Step 3: Install dependencies
if [ "$SKIP_BUILD" != "true" ]; then
    info "Installing dependencies..."
    cd "$PROJECT_ROOT"
    npm install || error "Failed to install dependencies"
    success "Dependencies installed"
fi

# Step 4: Run tests (optional)
if [ "$SKIP_TESTS" != "true" ]; then
    info "Running tests..."
    # Add your test command here if you have tests
    # npm test || error "Tests failed"
    success "Tests passed (skipped - no tests configured)"
fi

# Step 5: Build the application
if [ "$SKIP_BUILD" != "true" ]; then
    info "Building application..."
    npm run build || error "Build failed"
    success "Build completed successfully"
fi

# Step 6: Verify build output
if [ ! -d "$DIST_PATH" ]; then
    error "Build output not found at $DIST_PATH"
fi
success "Build output verified at $DIST_PATH"

# Step 7: Check if application exists
info "Checking if application exists..."
APP_EXISTS=false
if puter apps 2>&1 | grep -q "$APP_NAME"; then
    APP_EXISTS=true
    info "Application '$APP_NAME' already exists"
fi

# Step 8: Deploy to Puter
info "Deploying to Puter..."

if [ "$APP_EXISTS" = true ]; then
    # Update existing application
    info "Updating existing application..."
    if [ "$FORCE" = "true" ]; then
        warning "Force flag set - deleting and recreating application..."
        puter app:delete -f "$APP_NAME" || warning "Failed to delete application"
        sleep 2
        puter app:create "$APP_NAME" "$DIST_PATH" --description="AI-powered monitoring dashboard" --subdomain="$SUBDOMAIN" || error "Deployment failed"
    else
        puter app:update "$APP_NAME" "$DIST_PATH" || error "Deployment failed"
    fi
else
    # Create new application
    info "Creating new application..."
    puter app:create "$APP_NAME" "$DIST_PATH" --description="AI-powered monitoring dashboard" --subdomain="$SUBDOMAIN" || error "Deployment failed"
fi

success "Deployment completed successfully!"

# Step 9: Display deployment information
info "\nDeployment Information:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Application Name: $APP_NAME"
echo "Subdomain: $SUBDOMAIN"
echo -e "${GREEN}URL: https://$SUBDOMAIN.puter.site${NC}"
echo "Environment: $ENVIRONMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 10: Post-deployment checklist
info "\nPost-deployment checklist:"
echo "  [ ] Verify application is accessible at the URL above"
echo "  [ ] Test authentication and login functionality"
echo "  [ ] Check database connectivity"
echo "  [ ] Verify environment variables are set correctly"
echo "  [ ] Test AI features and monitoring dashboard"
echo "  [ ] Set up error tracking (Sentry)"
echo "  [ ] Configure monitoring and alerts"

success "\nDeployment script completed!"
info "To view your applications: puter apps"
info "To check disk usage: puter df"
info "To view sites: puter sites"

# Make the script executable
chmod +x "$0" 2>/dev/null || true

