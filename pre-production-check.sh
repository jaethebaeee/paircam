#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

echo "=========================================="
echo "  🚀 PRE-PRODUCTION READINESS CHECK"
echo "=========================================="
echo ""

# Function to check
check_pass() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
    ((WARNINGS++))
}

# 1. Check Node.js version
echo -e "${BLUE}[1/15] Checking Node.js version...${NC}"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    check_pass "Node.js v$NODE_VERSION installed (>= 18 required)"
else
    check_fail "Node.js v$NODE_VERSION too old (>= 18 required)"
fi
echo ""

# 2. Check Redis
echo -e "${BLUE}[2/15] Checking Redis...${NC}"
if redis-cli ping > /dev/null 2>&1; then
    check_pass "Redis is running and responding"
else
    check_fail "Redis is not running"
fi
echo ""

# 3. Check Backend Dependencies
echo -e "${BLUE}[3/15] Checking Backend dependencies...${NC}"
if [ -d "/tmp/omegle-clone/packages/backend/node_modules" ]; then
    check_pass "Backend dependencies installed"
else
    check_fail "Backend dependencies not installed"
fi
echo ""

# 4. Check Frontend Dependencies
echo -e "${BLUE}[4/15] Checking Frontend dependencies...${NC}"
if [ -d "/tmp/omegle-clone/packages/frontend/node_modules" ]; then
    check_pass "Frontend dependencies installed"
else
    check_fail "Frontend dependencies not installed"
fi
echo ""

# 5. Check TypeScript compilation (Backend)
echo -e "${BLUE}[5/15] Checking Backend TypeScript...${NC}"
cd /tmp/omegle-clone/packages/backend
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    check_fail "Backend has TypeScript errors"
else
    check_pass "Backend TypeScript compiles without errors"
fi
echo ""

# 6. Check TypeScript compilation (Frontend)
echo -e "${BLUE}[6/15] Checking Frontend TypeScript...${NC}"
cd /tmp/omegle-clone/packages/frontend
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    check_fail "Frontend has TypeScript errors"
else
    check_pass "Frontend TypeScript compiles without errors"
fi
echo ""

# 7. Check Backend Environment
echo -e "${BLUE}[7/15] Checking Backend environment...${NC}"
if [ -f "/tmp/omegle-clone/packages/backend/.env" ]; then
    check_pass "Backend .env file exists"
    
    # Check for critical env vars
    if grep -q "JWT_SECRET" /tmp/omegle-clone/packages/backend/.env; then
        check_pass "JWT_SECRET configured"
    else
        check_fail "JWT_SECRET missing"
    fi
else
    check_fail "Backend .env file missing"
fi
echo ""

# 8. Check Frontend Environment
echo -e "${BLUE}[8/15] Checking Frontend environment...${NC}"
if [ -f "/tmp/omegle-clone/packages/frontend/.env" ]; then
    check_pass "Frontend .env file exists"
else
    check_warn "Frontend .env file missing (optional for dev)"
fi
echo ""

# 9. Check for TODO/FIXME in code
echo -e "${BLUE}[9/15] Checking for unfinished code...${NC}"
TODO_COUNT=$(grep -r "TODO\|FIXME" /tmp/omegle-clone/packages --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
if [ "$TODO_COUNT" -eq 0 ]; then
    check_pass "No TODO/FIXME found in code"
else
    check_warn "Found $TODO_COUNT TODO/FIXME comments in code"
fi
echo ""

# 10. Check Backend Build
echo -e "${BLUE}[10/15] Testing Backend build...${NC}"
cd /tmp/omegle-clone/packages/backend
if npm run build > /dev/null 2>&1; then
    check_pass "Backend builds successfully"
else
    check_fail "Backend build failed"
fi
echo ""

# 11. Check Frontend Build
echo -e "${BLUE}[11/15] Testing Frontend build...${NC}"
cd /tmp/omegle-clone/packages/frontend
if npm run build > /dev/null 2>&1; then
    check_pass "Frontend builds successfully"
else
    check_fail "Frontend build failed"
fi
echo ""

# 12. Check Documentation
echo -e "${BLUE}[12/15] Checking documentation...${NC}"
DOC_COUNT=$(find /tmp/omegle-clone -maxdepth 1 -name "*.md" | wc -l | tr -d ' ')
if [ "$DOC_COUNT" -ge 10 ]; then
    check_pass "Found $DOC_COUNT documentation files"
else
    check_warn "Only $DOC_COUNT documentation files found"
fi
echo ""

# 13. Check Dockerfile
echo -e "${BLUE}[13/15] Checking Docker configuration...${NC}"
if [ -f "/tmp/omegle-clone/packages/backend/Dockerfile" ]; then
    check_pass "Backend Dockerfile exists"
else
    check_fail "Backend Dockerfile missing"
fi

if [ -f "/tmp/omegle-clone/docker-compose.yml" ]; then
    check_pass "Docker Compose file exists"
else
    check_warn "Docker Compose file missing"
fi
echo ""

# 14. Check Security
echo -e "${BLUE}[14/15] Checking security configuration...${NC}"
if grep -q "dev-secret" /tmp/omegle-clone/packages/backend/.env 2>/dev/null; then
    check_warn "Using default JWT_SECRET (change for production!)"
else
    check_pass "Custom JWT_SECRET configured"
fi
echo ""

# 15. Check Port Availability
echo -e "${BLUE}[15/15] Checking port availability...${NC}"
if lsof -i:3333 > /dev/null 2>&1; then
    check_warn "Port 3333 (backend) is in use"
else
    check_pass "Port 3333 (backend) is available"
fi

if lsof -i:5173 > /dev/null 2>&1; then
    check_warn "Port 5173 (frontend) is in use"
else
    check_pass "Port 5173 (frontend) is available"
fi
echo ""

# Summary
echo "=========================================="
echo "  📊 SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

# Production Readiness Score
TOTAL=$((PASSED + WARNINGS + FAILED))
SCORE=$((PASSED * 100 / TOTAL))

echo "Production Readiness Score: $SCORE%"
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -le 3 ]; then
    echo -e "${GREEN}✓ READY FOR PRODUCTION!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. ✓ Buy your domain"
    echo "2. ✓ Set up hosting (AWS/GCP/Azure)"
    echo "3. ✓ Change JWT_SECRET to production value"
    echo "4. ✓ Configure CORS for your domain"
    echo "5. ✓ Set up SSL/TLS certificates"
    echo "6. ✓ Deploy using Docker or Kubernetes"
    echo ""
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}⚠ MOSTLY READY (fix warnings)${NC}"
    echo ""
    echo "Address the warnings above before production deployment."
    echo ""
    exit 0
else
    echo -e "${RED}✗ NOT READY FOR PRODUCTION${NC}"
    echo ""
    echo "Fix the failed checks above before deploying."
    echo ""
    exit 1
fi
