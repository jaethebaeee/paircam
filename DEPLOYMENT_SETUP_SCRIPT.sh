#!/bin/bash

# PairCam Production Deployment Setup Script
# This script automates the setup of cost-optimized deployment infrastructure
# Run this ONCE to set up: Fly.io, Neon, Upstash, Cloudflare
# Usage: ./DEPLOYMENT_SETUP_SCRIPT.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
  echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
  print_header "Checking Prerequisites"

  # Check Node.js
  if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18.18.0+"
    exit 1
  fi

  NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18.18.0+ is required. You have $(node -v)"
    exit 1
  fi

  print_success "Node.js $(node -v) is installed"

  # Check npm
  if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
  fi

  print_success "npm $(npm -v) is installed"

  # Check git
  if ! command -v git &> /dev/null; then
    print_error "Git is not installed"
    exit 1
  fi

  print_success "Git $(git -v | cut -d ' ' -f 3) is installed"

  # Check if we're in the right directory
  if [ ! -f "package.json" ] || [ ! -d "packages/backend" ]; then
    print_error "This script must be run from the root of the paircam repository"
    exit 1
  fi

  print_success "You're in the correct directory"
}

# Generate secrets
generate_secrets() {
  print_header "Generating Production Secrets"

  JWT_SECRET=$(openssl rand -base64 48)
  TURN_SHARED_SECRET=$(openssl rand -base64 48)
  REDIS_PASSWORD=$(openssl rand -base64 32)

  print_info "JWT_SECRET: ${JWT_SECRET:0:20}..."
  print_info "TURN_SHARED_SECRET: ${TURN_SHARED_SECRET:0:20}..."
  print_info "REDIS_PASSWORD: ${REDIS_PASSWORD:0:20}..."

  # Save to temporary file for later use
  cat > .secrets.tmp << EOF
JWT_SECRET=$JWT_SECRET
TURN_SHARED_SECRET=$TURN_SHARED_SECRET
REDIS_PASSWORD=$REDIS_PASSWORD
EOF

  print_success "Secrets generated (saved to .secrets.tmp)"
}

# Check for Fly.io CLI
check_flyctl() {
  print_header "Checking Fly.io CLI"

  if ! command -v flyctl &> /dev/null; then
    print_warning "Fly.io CLI (flyctl) is not installed"
    echo ""
    echo "Install with:"
    echo "  curl -L https://fly.io/install.sh | sh"
    echo ""
    echo "Or if you prefer manual installation:"
    echo "  1. Visit https://fly.io/docs/getting-started/installing-flyctl/"
    echo "  2. Download and install for your OS"
    echo ""
    read -p "Press Enter after installing flyctl to continue..."

    if ! command -v flyctl &> /dev/null; then
      print_error "Fly.io CLI is still not installed. Exiting."
      exit 1
    fi
  fi

  print_success "Fly.io CLI $(flyctl version) is installed"
}

# Instructions for manual setup
print_manual_setup_instructions() {
  print_header "Manual Setup Instructions"

  echo "Since some services require web-based signup, please follow these steps:"
  echo ""

  echo -e "${YELLOW}1. Create Neon PostgreSQL Database${NC}"
  echo "   - Visit: https://console.neon.tech/"
  echo "   - Create free account"
  echo "   - Create new project"
  echo "   - Copy DATABASE_URL from Connection string"
  echo "   - Save it for later (you'll need it when setting secrets)"
  echo ""

  echo -e "${YELLOW}2. Create Upstash Redis Database${NC}"
  echo "   - Visit: https://console.upstash.com/"
  echo "   - Create free account"
  echo "   - Create new Redis database"
  echo "   - Copy REDIS_URL from Connection string"
  echo "   - Save it for later"
  echo ""

  echo -e "${YELLOW}3. Setup Fly.io Account${NC}"
  echo "   - Visit: https://fly.io/"
  echo "   - Create free account"
  echo "   - Run: flyctl auth login"
  echo "   - We'll deploy to Fly.io after this setup"
  echo ""

  echo -e "${YELLOW}4. Setup Cloudflare DNS${NC}"
  echo "   - Visit: https://cloudflare.com/"
  echo "   - Create free account"
  echo "   - Add your domain"
  echo "   - Change nameservers at your domain registrar"
  echo "   - Wait for nameserver propagation (up to 48 hours)"
  echo ""

  read -p "Press Enter when you've completed these steps..."
}

# Deploy to Fly.io
deploy_to_flyio() {
  print_header "Deploying to Fly.io"

  if ! command -v flyctl &> /dev/null; then
    print_error "Fly.io CLI not found. Please install it first."
    return 1
  fi

  # Check if already logged in
  if ! flyctl auth whoami &> /dev/null; then
    print_warning "Not logged into Fly.io"
    echo "Run: flyctl auth login"
    read -p "After logging in, press Enter to continue..."
  fi

  APP_NAME="paircam"

  # Create app if it doesn't exist
  if ! flyctl apps list | grep -q "^$APP_NAME"; then
    print_info "Creating Fly.io app: $APP_NAME"
    flyctl apps create $APP_NAME || print_warning "App might already exist"
  else
    print_info "Fly.io app '$APP_NAME' already exists"
  fi

  # Set secrets
  print_info "Setting environment variables on Fly.io..."

  # Source the secrets file
  source .secrets.tmp

  # Read user inputs for external services
  echo ""
  print_info "Enter your database and service credentials:"
  read -p "Neon DATABASE_URL: " DATABASE_URL
  read -p "Upstash REDIS_URL: " REDIS_URL
  read -p "Paircam domain (e.g., paircam.live): " DOMAIN

  # Set secrets using flyctl
  print_info "Setting secrets on Fly.io (this may take a moment)..."

  flyctl secrets set \
    NODE_ENV=production \
    JWT_SECRET="$JWT_SECRET" \
    TURN_SHARED_SECRET="$TURN_SHARED_SECRET" \
    DATABASE_URL="$DATABASE_URL" \
    REDIS_URL="$REDIS_URL" \
    FRONTEND_URL="https://$DOMAIN" \
    CORS_ORIGINS="https://$DOMAIN,https://www.$DOMAIN" \
    TURN_URLS="turn:openrelay.metered.ca:80" \
    TURN_USERNAME="openrelayproject" \
    TURN_PASSWORD="openrelayproject" \
    -a $APP_NAME

  print_success "Secrets set on Fly.io"

  # Deploy
  print_info "Deploying to Fly.io..."
  cd packages/backend
  flyctl deploy --app $APP_NAME --remote-only
  cd ../..

  print_success "Deployed to Fly.io"

  # Get deployment URL
  DEPLOYMENT_URL=$(flyctl info -a $APP_NAME --json 2>/dev/null | grep -o '"Hostname":"[^"]*' | cut -d'"' -f4 || echo "unknown")
  print_info "Deployment URL: https://$DEPLOYMENT_URL"
}

# Print summary
print_summary() {
  print_header "Setup Summary"

  echo -e "${GREEN}✅ Deployment infrastructure setup complete!${NC}\n"

  echo "Next steps:"
  echo "1. Configure your domain DNS:"
  echo "   - Login to Cloudflare"
  echo "   - Create CNAME record pointing to your Fly.io app"
  echo ""

  echo "2. Setup GitHub Actions (optional but recommended):"
  echo "   - Visit: https://github.com/jaethebaeee/paircam/settings/secrets/actions"
  echo "   - Create secret: FLY_API_TOKEN"
  echo "   - Get token from: flyctl tokens create"
  echo ""

  echo "3. Monitor your deployment:"
  echo "   - Fly.io Dashboard: https://fly.io/dashboard"
  echo "   - Neon Console: https://console.neon.tech/"
  echo "   - Upstash Console: https://console.upstash.com/"
  echo ""

  echo "4. Test your deployment:"
  echo "   - Health check: https://paircam.live/health"
  echo "   - Try making a video call"
  echo ""

  echo "Cleanup:"
  echo "  rm .secrets.tmp  # Remove temporary secrets file"
}

# Main execution
main() {
  print_header "PairCam Cost-Optimized Deployment Setup"

  check_prerequisites
  generate_secrets
  check_flyctl
  print_manual_setup_instructions

  read -p "Are you ready to proceed with Fly.io deployment? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    deploy_to_flyio
  else
    print_warning "Setup cancelled"
    exit 0
  fi

  print_summary
}

# Run main function
main
