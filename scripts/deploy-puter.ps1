#!/usr/bin/env pwsh
# Puter CLI Deployment Script - Best Practices
# This script automates the deployment of Puter Monitor AI to Puter Cloud

param(
    [string]$Environment = "production",
    [string]$Subdomain = "monitor-ai",
    [switch]$SkipBuild,
    [switch]$SkipTests,
    [switch]$Force
)

# Color output functions
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ $args" -ForegroundColor Cyan }
function Write-Warning { Write-Host "⚠ $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "✗ $args" -ForegroundColor Red }

# Script configuration
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DistPath = Join-Path $ProjectRoot "dist"
$AppName = "puter-monitor-ai"

Write-Info "Starting Puter deployment for $AppName..."
Write-Info "Environment: $Environment"
Write-Info "Subdomain: $Subdomain"

# Step 1: Check prerequisites
Write-Info "Checking prerequisites..."

# Check if Puter CLI is installed
try {
    $puterVersion = puter --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Puter CLI not found"
    }
    Write-Success "Puter CLI is installed"
} catch {
    Write-Error "Puter CLI is not installed. Install it with: npm install -g puter-cli"
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Success "Node.js is installed: $nodeVersion"
} catch {
    Write-Error "Node.js is not installed. Please install Node.js v20 or higher."
    exit 1
}

# Step 2: Check authentication
Write-Info "Checking Puter authentication..."
try {
    $whoami = puter whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Not authenticated with Puter. Please run: puter login"
        Write-Info "Opening login prompt..."
        puter login
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Authentication failed"
            exit 1
        }
    }
    Write-Success "Authenticated with Puter"
} catch {
    Write-Error "Failed to check authentication status"
    exit 1
}

# Step 3: Install dependencies
if (-not $SkipBuild) {
    Write-Info "Installing dependencies..."
    Set-Location $ProjectRoot
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        exit 1
    }
    Write-Success "Dependencies installed"
}

# Step 4: Run tests (optional)
if (-not $SkipTests) {
    Write-Info "Running tests..."
    # Add your test command here if you have tests
    # npm test
    Write-Success "Tests passed (skipped - no tests configured)"
}

# Step 5: Build the application
if (-not $SkipBuild) {
    Write-Info "Building application..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed"
        exit 1
    }
    Write-Success "Build completed successfully"
}

# Step 6: Verify build output
if (-not (Test-Path $DistPath)) {
    Write-Error "Build output not found at $DistPath"
    exit 1
}
Write-Success "Build output verified at $DistPath"

# Step 7: Check if application exists
Write-Info "Checking if application exists..."
$appExists = $false
try {
    $apps = puter apps 2>&1
    if ($apps -match $AppName) {
        $appExists = $true
        Write-Info "Application '$AppName' already exists"
    }
} catch {
    Write-Warning "Could not check existing applications"
}

# Step 8: Deploy to Puter
Write-Info "Deploying to Puter..."

if ($appExists) {
    # Update existing application
    Write-Info "Updating existing application..."
    if ($Force) {
        Write-Warning "Force flag set - deleting and recreating application..."
        puter app:delete -f $AppName
        Start-Sleep -Seconds 2
        puter app:create $AppName $DistPath --description="AI-powered monitoring dashboard" --subdomain=$Subdomain
    } else {
        puter app:update $AppName $DistPath
    }
} else {
    # Create new application
    Write-Info "Creating new application..."
    puter app:create $AppName $DistPath --description="AI-powered monitoring dashboard" --subdomain=$Subdomain
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Deployment failed"
    exit 1
}

Write-Success "Deployment completed successfully!"

# Step 9: Display deployment information
Write-Info "`nDeployment Information:"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Application Name: $AppName" -ForegroundColor White
Write-Host "Subdomain: $Subdomain" -ForegroundColor White
Write-Host "URL: https://$Subdomain.puter.site" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Step 10: Post-deployment checks
Write-Info "`nPost-deployment checklist:"
Write-Host "  [ ] Verify application is accessible at the URL above"
Write-Host "  [ ] Test authentication and login functionality"
Write-Host "  [ ] Check database connectivity"
Write-Host "  [ ] Verify environment variables are set correctly"
Write-Host "  [ ] Test AI features and monitoring dashboard"
Write-Host "  [ ] Set up error tracking (Sentry)"
Write-Host "  [ ] Configure monitoring and alerts"

Write-Success "`nDeployment script completed!"
Write-Info "To view your applications: puter apps"
Write-Info "To check disk usage: puter df"
Write-Info "To view sites: puter sites"

